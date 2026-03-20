import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin', 'approver', 'viewer'])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const workspace_id = searchParams.get('workspace_id')
    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 })
    }

    const db = createServerClient()

    const { data: accounts, error } = await db
      .from('ar_accounts')
      .select('id, client_name, client_email, client_language, amount_owing, days_overdue, bucket, risk_level, risk_score, status, invoice_number, notes, last_action_at, created_at')
      .eq('workspace_id', workspace_id)
      .order('risk_score', { ascending: false })

    if (error) throw error

    const rows = accounts ?? []

    const headers = [
      'id',
      'client_name',
      'client_email',
      'client_language',
      'amount_owing',
      'days_overdue',
      'bucket',
      'risk_level',
      'risk_score',
      'status',
      'invoice_number',
      'notes',
      'last_action_at',
      'created_at',
    ]

    const escape = (val: unknown): string => {
      if (val === null || val === undefined) return ''
      const s = String(val)
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
          r.client_name,
          r.client_email,
          r.client_language,
          r.amount_owing,
          r.days_overdue,
          r.bucket,
          r.risk_level,
          r.risk_score,
          r.status,
          r.invoice_number,
          r.notes,
          r.last_action_at,
          r.created_at,
        ].map(escape).join(',')
      ),
    ]

    const csv = csvLines.join('\n')
    const filename = `bastion-comptes-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[ACCOUNTS EXPORT]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
