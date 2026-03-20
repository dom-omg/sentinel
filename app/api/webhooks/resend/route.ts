import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Resend webhook event types
type ResendEvent =
  | 'email.sent'
  | 'email.delivered'
  | 'email.opened'
  | 'email.clicked'
  | 'email.bounced'
  | 'email.complained'
  | 'email.delivery_delayed'

interface ResendWebhookPayload {
  type: ResendEvent
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
  }
}

const EVENT_MAP: Partial<Record<ResendEvent, string>> = {
  'email.delivered':       'email_delivered',
  'email.opened':          'email_opened',
  'email.clicked':         'email_clicked',
  'email.bounced':         'email_bounced',
  'email.complained':      'email_complained',
  'email.delivery_delayed':'email_delayed',
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (secret) {
      const svixId = req.headers.get('svix-id')
      const svixTimestamp = req.headers.get('svix-timestamp')
      const svixSignature = req.headers.get('svix-signature')
      if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
      }
      // Basic replay protection: reject if timestamp > 5 min old
      const ts = parseInt(svixTimestamp, 10)
      if (Math.abs(Date.now() / 1000 - ts) > 300) {
        return NextResponse.json({ error: 'Webhook timestamp too old' }, { status: 401 })
      }
    }

    const payload = await req.json() as ResendWebhookPayload
    const { type, data } = payload

    const auditEventType = EVENT_MAP[type]
    if (!auditEventType) {
      return NextResponse.json({ ok: true }) // ignore other events
    }

    const db = createServerClient()

    // Find the original email_sent audit entry by message_id
    const { data: auditRows } = await db
      .from('audit_log')
      .select('workspace_id, org_id, account_id, draft_id')
      .eq('event_type', 'email_sent')
      .contains('detail', { message_id: data.email_id })
      .limit(1)

    if (!auditRows || auditRows.length === 0) {
      return NextResponse.json({ ok: true }) // no matching entry, ignore
    }

    const entry = auditRows[0]

    // Write delivery status audit event
    await db.from('audit_log').insert({
      workspace_id: entry.workspace_id,
      org_id: entry.org_id,
      account_id: entry.account_id,
      draft_id: entry.draft_id,
      event_type: auditEventType,
      actor_type: 'system',
      detail: {
        resend_event: type,
        email_id: data.email_id,
        to: data.to?.[0],
        subject: data.subject,
      },
    })

    // On bounce: flag the account
    if (type === 'email.bounced' && entry.account_id) {
      await db
        .from('ar_accounts')
        .update({ status: 'blocked', last_action_at: new Date().toISOString() })
        .eq('id', entry.account_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[RESEND WEBHOOK]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
