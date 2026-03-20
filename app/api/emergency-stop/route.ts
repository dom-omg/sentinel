import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin'])) {
      return NextResponse.json({ error: 'Accès refusé — admin requis' }, { status: 403 })
    }

    const { workspace_id, org_id } = await req.json()
    if (!workspace_id) return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 })

    const db = createServerClient()

    // Reject all pending approvals
    const { data: pending } = await db
      .from('approval_requests')
      .select('id, account_id, draft_id')
      .eq('workspace_id', workspace_id)
      .eq('status', 'pending')

    if (pending && pending.length > 0) {
      await db.from('approval_requests')
        .update({ status: 'rejected', decision_at: new Date().toISOString(), reason: 'Emergency stop', decision_by: auth!.sub })
        .eq('workspace_id', workspace_id)
        .eq('status', 'pending')

      // Reopen affected accounts
      const accountIds = [...new Set(pending.map(p => p.account_id).filter(Boolean))]
      if (accountIds.length > 0) {
        await db.from('ar_accounts')
          .update({ status: 'open', last_action_at: new Date().toISOString() })
          .in('id', accountIds)
      }
    }

    await writeAudit({
      workspace_id,
      org_id,
      event_type: 'emergency_stop',
      actor_type: 'user',
      actor_id: auth!.sub,
      actor_name: auth!.name,
      detail: {
        approvals_cancelled: pending?.length ?? 0,
        reason: 'Manual emergency stop by admin',
      },
    })

    return NextResponse.json({
      ok: true,
      approvals_cancelled: pending?.length ?? 0,
    })
  } catch (err) {
    console.error('[EMERGENCY STOP]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
