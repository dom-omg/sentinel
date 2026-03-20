import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'
import { generateDraft } from '@/lib/omni/draft-generator'
import { evaluatePolicy } from '@/lib/policy'
import { writeAudit } from '@/lib/audit'
import type { ARAccount, Policy } from '@/lib/types'

// POST /api/drafts/generate-batch
// Body: { workspace_id, org_id, account_ids?: string[] }
// If account_ids omitted → generates for all 'open' accounts in workspace
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin'])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { workspace_id, org_id, account_ids } = await req.json() as {
      workspace_id: string
      org_id: string
      account_ids?: string[]
    }

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 })
    }

    const db = createServerClient()

    // Load accounts
    let query = db.from('ar_accounts').select('*').eq('workspace_id', workspace_id)
    if (account_ids?.length) {
      query = query.in('id', account_ids)
    } else {
      query = query.eq('status', 'open')
    }
    const { data: accounts, error: accErr } = await query
    if (accErr) throw accErr

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, approvals_created: 0 })
    }

    // Load policies once
    const { data: policies } = await db
      .from('policies')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)

    const results = { processed: 0, approvals_created: 0, errors: 0 }

    for (const account of accounts) {
      try {
        const { outcome, policy } = evaluatePolicy(
          'generate_draft',
          (account as ARAccount).risk_level,
          (policies ?? []) as Policy[]
        )

        if (outcome === 'block') {
          results.errors++
          continue
        }

        const generated = await generateDraft(account as ARAccount)

        const { outcome: sendOutcome, policy: sendPolicy } = evaluatePolicy(
          'send_email',
          (account as ARAccount).risk_level,
          (policies ?? []) as Policy[]
        )

        const draftStatus = sendOutcome === 'require_approval' ? 'pending_approval' : 'pending'

        const { data: draft, error: draftErr } = await db
          .from('drafts')
          .insert({
            account_id: account.id,
            workspace_id,
            sequence_number: generated.sequence_number,
            language: generated.language,
            subject: generated.subject,
            body: generated.body,
            generated_by: 'omni',
            risk_level: account.risk_level,
            policy_id: sendPolicy?.id ?? null,
            policy_outcome: sendOutcome,
            status: draftStatus,
          })
          .select()
          .single()

        if (draftErr || !draft) { results.errors++; continue }

        await db.from('ar_accounts')
          .update({ status: sendOutcome === 'require_approval' ? 'pending_approval' : 'draft_ready', last_action_at: new Date().toISOString() })
          .eq('id', account.id)

        await writeAudit({
          workspace_id, org_id,
          account_id: account.id,
          draft_id: draft.id,
          event_type: 'draft_generated',
          actor_type: 'omni',
          policy_id: policy?.id,
          policy_outcome: outcome,
          detail: { batch: true, language: generated.language, sequence: generated.sequence_number, send_policy_outcome: sendOutcome },
        })

        if (sendOutcome === 'require_approval') {
          const { data: approval } = await db
            .from('approval_requests')
            .insert({
              draft_id: draft.id,
              account_id: account.id,
              workspace_id,
              status: 'pending',
              expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            })
            .select()
            .single()

          await writeAudit({
            workspace_id, org_id,
            account_id: account.id,
            draft_id: draft.id,
            approval_id: approval?.id,
            event_type: 'approval_requested',
            actor_type: 'omni',
            detail: { batch: true, expires_at: approval?.expires_at },
          })

          results.approvals_created++
        }

        results.processed++
      } catch {
        results.errors++
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (err) {
    console.error('[DRAFT GENERATE BATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
