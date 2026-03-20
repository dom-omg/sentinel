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
    const { org_id } = await req.json() as { org_id: string }

    const db = createServerClient()

    const { data: draft, error: draftErr } = await db
      .from('drafts')
      .select('*, ar_accounts(*)')
      .eq('id', id)
      .single()

    if (draftErr || !draft) {
      return NextResponse.json({ error: 'Draft introuvable' }, { status: 404 })
    }

    if (draft.status !== 'approved') {
      return NextResponse.json({ error: 'Draft non approuvé' }, { status: 400 })
    }

    const account = draft.ar_accounts
    const emailBody = draft.edited_body ?? draft.body

    let messageId: string | null = null
    let sendError: string | null = null

    if (process.env.RESEND_API_KEY && account?.client_email) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        const { data: emailData, error: resendError } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'facturation@sentinel.ca',
          to: account.client_email,
          subject: draft.subject,
          text: emailBody,
        })

        if (resendError) {
          sendError = resendError.message
        } else {
          messageId = emailData?.id ?? null
        }
      } catch (err) {
        sendError = String(err)
      }
    } else {
      // Demo mode: simulate send (no email address or no API key)
      messageId = `demo_${Date.now()}`
    }

    if (sendError) {
      await writeAudit({
        workspace_id: draft.workspace_id,
        org_id,
        account_id: draft.account_id,
        draft_id: id,
        event_type: 'blocked',
        actor_type: 'system',
        actor_id: auth!.sub,
        actor_name: auth!.name,
        detail: { reason: 'Email send failed', error: sendError },
      })
      return NextResponse.json({ error: `Erreur envoi email: ${sendError}` }, { status: 500 })
    }

    // Update draft to sent
    await db.from('drafts').update({ status: 'sent' }).eq('id', id)

    // Update account to sent
    await db.from('ar_accounts').update({
      status: 'sent',
      last_action_at: new Date().toISOString(),
    }).eq('id', draft.account_id)

    await writeAudit({
      workspace_id: draft.workspace_id,
      org_id,
      account_id: draft.account_id,
      draft_id: id,
      event_type: 'email_sent',
      actor_type: 'user',
      actor_id: auth!.sub,
      actor_name: auth!.name,
      detail: {
        client_name: account?.client_name,
        client_email: account?.client_email ?? null,
        amount_owing: account?.amount_owing,
        days_overdue: account?.days_overdue,
        risk_level: draft.risk_level,
        language: draft.language,
        sequence_number: draft.sequence_number,
        email_subject: draft.subject,
        message_id: messageId,
        demo_mode: !process.env.RESEND_API_KEY,
      },
    })

    return NextResponse.json({ ok: true, message_id: messageId })
  } catch (err) {
    console.error('[DRAFT SEND]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
