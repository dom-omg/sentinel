import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin', 'approver'])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const { decision, reason, edited_body, org_id } = await req.json() as {
      decision: 'approved' | 'rejected' | 'escalated'
      reason?: string
      edited_body?: string
      org_id: string
    }

    if (!['approved', 'rejected', 'escalated'].includes(decision)) {
      return NextResponse.json({ error: 'Décision invalide' }, { status: 400 })
    }

    const db = createServerClient()

    // Load approval with draft and account
    const { data: approval, error: apprErr } = await db
      .from('approval_requests')
      .select('*, draft:drafts(*), account:ar_accounts(*)')
      .eq('id', id)
      .single()

    if (apprErr || !approval) {
      return NextResponse.json({ error: 'Approbation introuvable' }, { status: 404 })
    }

    if (approval.status !== 'pending') {
      return NextResponse.json({ error: 'Déjà traitée' }, { status: 409 })
    }

    // Update approval
    await db.from('approval_requests').update({
      status: decision,
      decision_at: new Date().toISOString(),
      decision_by: auth!.sub,
      reason: reason ?? null,
    }).eq('id', id)

    // Update draft status
    const draftStatus = decision === 'approved' ? 'approved'
      : decision === 'rejected' ? 'rejected'
      : 'pending_approval'

    const draftUpdate: Record<string, unknown> = { status: draftStatus }
    if (edited_body) draftUpdate.edited_body = edited_body

    await db.from('drafts').update(draftUpdate).eq('id', approval.draft_id)

    // Update account status
    const accountStatus = decision === 'approved' ? 'pending_approval'
      : decision === 'rejected' ? 'open'
      : 'escalated'

    await db.from('ar_accounts').update({
      status: accountStatus,
      last_action_at: new Date().toISOString(),
    }).eq('id', approval.account_id)

    const eventType = decision === 'approved' ? 'approved'
      : decision === 'rejected' ? 'rejected'
      : 'escalated'

    await writeAudit({
      workspace_id: approval.workspace_id,
      org_id,
      account_id: approval.account_id,
      draft_id: approval.draft_id,
      approval_id: id,
      event_type: eventType,
      actor_type: 'user',
      actor_id: auth!.sub,
      actor_name: auth!.name,
      detail: {
        decision,
        reason: reason ?? null,
        had_edits: !!edited_body,
      },
    })

    // Auto-send email after approval
    let emailSent = false
    if (decision === 'approved') {
      try {
        const sendRes = await fetch(
          new URL(`/api/drafts/${approval.draft_id}/send`, req.url).toString(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') ?? '' },
            body: JSON.stringify({ org_id }),
          }
        )
        emailSent = sendRes.ok
      } catch {
        // Send failure is non-blocking — already approved, user can retry send
      }
    }

    return NextResponse.json({ ok: true, decision, email_sent: emailSent })
  } catch (err) {
    console.error('[APPROVAL DECIDE]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
