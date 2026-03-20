import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req)
    if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const db = createServerClient()

    const { data: account, error: accErr } = await db
      .from('ar_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (accErr || !account) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
    }

    const [draftsRes, auditRes] = await Promise.all([
      db.from('drafts')
        .select('*, approval:approval_requests(*)')
        .eq('account_id', id)
        .order('created_at', { ascending: false }),
      db.from('audit_log')
        .select('*')
        .eq('account_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    return NextResponse.json({
      account,
      drafts: draftsRes.data ?? [],
      audit: auditRes.data ?? [],
    })
  } catch (err) {
    console.error('[ACCOUNT GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin', 'approver'])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const { status, org_id, workspace_id } = await req.json() as {
      status: 'resolved' | 'open'
      org_id: string
      workspace_id: string
    }

    const db = createServerClient()
    await db.from('ar_accounts')
      .update({ status, last_action_at: new Date().toISOString() })
      .eq('id', id)

    await writeAudit({
      workspace_id,
      org_id,
      account_id: id,
      event_type: status === 'resolved' ? 'approved' : 'rejected',
      actor_type: 'user',
      actor_id: auth!.sub,
      actor_name: auth!.name,
      detail: { manual_status_change: status },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ACCOUNT PATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
