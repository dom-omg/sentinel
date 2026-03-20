import { createServerClient } from './supabase/server'
import type { AuditEventType, ActorType } from './types'

interface AuditParams {
  workspace_id: string
  org_id: string
  event_type: AuditEventType
  actor_type: ActorType
  actor_id?: string
  actor_name?: string
  account_id?: string
  draft_id?: string
  approval_id?: string
  policy_id?: string
  policy_outcome?: string
  detail?: Record<string, unknown>
}

export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    const db = createServerClient()
    await db.from('audit_log').insert({
      ...params,
      detail: params.detail ?? {},
    })
  } catch (err) {
    // Audit failures must never crash the main flow
    console.error('[BASTION AUDIT] Failed to write audit log:', err)
  }
}
