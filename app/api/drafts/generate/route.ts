import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'
import { generateDraft } from '@/lib/omni/draft-generator'
import { evaluatePolicy } from '@/lib/policy'
import { writeAudit } from '@/lib/audit'
import type { ARAccount, Policy } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin', 'approver'])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { account_id, workspace_id, org_id } = await req.json()

    if (!account_id || !workspace_id) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const db = createServerClient()

    // Load account
    const { data: account, error: accErr } = await db
      .from('ar_accounts')
      .select('*')
      .eq('id', account_id)
      .single()

    if (accErr || !account) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
    }

    // Load workspace policies
    const { data: policies } = await db
      .from('policies')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)

    // Evaluate policy for draft generation
    const { outcome, policy } = evaluatePolicy(
      'generate_draft',
      (account as ARAccount).risk_level,
      (policies ?? []) as Policy[]
    )

    await writeAudit({
      workspace_id,
      org_id,
      account_id,
      event_type: 'policy_evaluated',
      actor_type: 'omni',
      policy_id: policy?.id,
      policy_outcome: outcome,
      detail: { action: 'generate_draft', risk_level: account.risk_level },
    })

    if (outcome === 'block') {
      await writeAudit({
        workspace_id,
        org_id,
        account_id,
        event_type: 'blocked',
        actor_type: 'omni',
        policy_id: policy?.id,
        policy_outcome: outcome,
        detail: { reason: 'Policy blocked draft generation' },
      })
      return NextResponse.json({ error: 'Bloqué par politique', outcome }, { status: 403 })
    }

    // Generate draft via OMNI
    const generated = await generateDraft(account as ARAccount)

    // Evaluate send policy to determine draft status
    const { outcome: sendOutcome, policy: sendPolicy } = evaluatePolicy(
      'send_email',
      (account as ARAccount).risk_level,
      (policies ?? []) as Policy[]
    )

    const draftStatus = sendOutcome === 'require_approval' ? 'pending_approval' : 'pending'

    // Save draft
    const { data: draft, error: draftErr } = await db
      .from('drafts')
      .insert({
        account_id,
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

    if (draftErr || !draft) throw draftErr

    // Update account status
    await db
      .from('ar_accounts')
      .update({ status: 'draft_ready', last_action_at: new Date().toISOString() })
      .eq('id', account_id)

    await writeAudit({
      workspace_id,
      org_id,
      account_id,
      draft_id: draft.id,
      event_type: 'draft_generated',
      actor_type: 'omni',
      policy_id: policy?.id,
      policy_outcome: outcome,
      detail: {
        language: generated.language,
        sequence: generated.sequence_number,
        subject: generated.subject,
        send_policy_outcome: sendOutcome,
      },
    })

    // If requires approval, create approval request
    if (sendOutcome === 'require_approval') {
      const { data: approval } = await db
        .from('approval_requests')
        .insert({
          draft_id: draft.id,
          account_id,
          workspace_id,
          status: 'pending',
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()

      await db
        .from('ar_accounts')
        .update({ status: 'pending_approval' })
        .eq('id', account_id)

      await writeAudit({
        workspace_id,
        org_id,
        account_id,
        draft_id: draft.id,
        approval_id: approval?.id,
        event_type: 'approval_requested',
        actor_type: 'omni',
        detail: { expires_at: approval?.expires_at },
      })

      // Notify approvers by email
      if (process.env.RESEND_API_KEY) {
        try {
          const { data: members } = await db
            .from('workspace_members')
            .select('user:users(email, name, role)')
            .eq('workspace_id', workspace_id)
            .in('role', ['admin', 'approver'])

          const approverEmails = (members ?? [])
            .map((m: Record<string, unknown>) => (m.user as { email?: string })?.email)
            .filter((e): e is string => !!e)

          if (approverEmails.length > 0) {
            const { Resend } = await import('resend')
            const resend = new Resend(process.env.RESEND_API_KEY)
            const riskLabel = { low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique' }[account.risk_level as string] ?? account.risk_level
            const amount = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(account.amount_owing)

            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL ?? 'bastion@sentinel.ca',
              to: approverEmails,
              subject: `[BASTION] Approbation requise — ${account.client_name} (${amount})`,
              text: `Bonjour,\n\nUn email de recouvrement généré par BASTION attend votre approbation.\n\nClient: ${account.client_name}\nMontant: ${amount}\nJours en souffrance: ${account.days_overdue} jours\nNiveau de risque: ${riskLabel}\nSujet email: ${draft.subject}\n\nConnectez-vous à BASTION pour approuver ou rejeter ce draft.\n\n---\nCe message est automatique. Ne pas répondre.`,
            })
          }
        } catch {
          // Non-blocking — approval was still created
        }
      }

      return NextResponse.json({ draft, approval, requires_approval: true })
    }

    return NextResponse.json({ draft, requires_approval: false })
  } catch (err) {
    console.error('[DRAFT GENERATE]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
