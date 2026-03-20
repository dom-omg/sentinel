import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin', 'approver'])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const workspace_id = searchParams.get('workspace_id')
    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 })
    }

    const db = createServerClient()

    const { data: entries, error } = await db
      .from('audit_log')
      .select('id, event_type, actor_type, actor_id, actor_name, account_id, draft_id, approval_id, policy_id, policy_outcome, detail, created_at')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })
      .limit(10000)

    if (error) throw error

    const rows = entries ?? []

    const headers = [
      'id',
      'created_at',
      'event_type',
      'actor_type',
      'actor_name',
      'account_id',
      'draft_id',
      'approval_id',
      'policy_id',
      'policy_outcome',
      'detail',
    ]

    const escape = (val: unknown): string => {
      if (val === null || val === undefined) return ''
      const s = typeof val === 'object' ? JSON.stringify(val) : String(val)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const csvLines = [
      headers.join(','),
      ...rows.map(r =>
        [
          r.id,
          r.created_at,
          r.event_type,
          r.actor_type,
          r.actor_name,
          r.account_id,
          r.draft_id,
          r.approval_id,
          r.policy_id,
          r.policy_outcome,
          r.detail,
        ].map(escape).join(',')
      ),
    ]

    const csv = csvLines.join('\n')
    const filename = `bastion-audit-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[AUDIT EXPORT]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
