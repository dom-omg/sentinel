export type Language = 'fr' | 'en'
export type Tone = 'formal' | 'informal'
export type Plan = 'starter' | 'team' | 'studio' | 'enterprise'
export type UserRole = 'admin' | 'approver' | 'viewer'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type ARBucket = '30' | '60' | '90' | '120+'
export type AccountStatus = 'open' | 'draft_ready' | 'pending_approval' | 'sent' | 'resolved' | 'escalated' | 'blocked'
export type PolicyOutcome = 'allow' | 'allow_with_log' | 'require_approval' | 'block'
export type DraftStatus = 'pending' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'edited' | 'blocked'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired'
export type ConnectorType = 'quickbooks' | 'xero' | 'gmail' | 'outlook' | 'csv'
export type ActorType = 'system' | 'omni' | 'user'
export type AuditEventType =
  | 'account_ingested'
  | 'account_segmented'
  | 'draft_generated'
  | 'policy_evaluated'
  | 'approval_requested'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'email_sent'
  | 'blocked'
  | 'emergency_stop'

export interface Organization {
  id: string
  name: string
  slug: string
  language_default: Language
  tone: Tone
  plan: Plan
  created_at: string
}

export interface Workspace {
  id: string
  org_id: string
  name: string
  language_default: Language
  created_at: string
}

export interface User {
  id: string
  org_id: string
  email: string
  name: string
  role: UserRole
  language: Language
  created_at: string
}

export interface ARAccount {
  id: string
  workspace_id: string
  external_id?: string
  client_name: string
  client_email?: string
  client_language: Language
  amount_owing: number
  days_overdue: number
  bucket: ARBucket
  risk_level: RiskLevel
  risk_score: number
  status: AccountStatus
  source: ConnectorType
  invoice_number?: string
  notes?: string
  last_action_at?: string
  created_at: string
  updated_at: string
}

export interface Policy {
  id: string
  workspace_id: string
  name: string
  description?: string
  condition_action: string
  condition_risk_level?: RiskLevel
  outcome: PolicyOutcome
  approver_role?: UserRole
  priority: number
  is_active: boolean
  is_system: boolean
  created_at: string
}

export interface Draft {
  id: string
  account_id: string
  workspace_id: string
  sequence_number: number
  language: Language
  subject: string
  body: string
  edited_body?: string
  generated_by: string
  risk_level: RiskLevel
  policy_id?: string
  policy_outcome: PolicyOutcome
  status: DraftStatus
  created_at: string
  updated_at: string
  account?: ARAccount
}

export interface ApprovalRequest {
  id: string
  draft_id: string
  account_id: string
  workspace_id: string
  assigned_to?: string
  status: ApprovalStatus
  decision_at?: string
  decision_by?: string
  reason?: string
  expires_at: string
  created_at: string
  draft?: Draft
  account?: ARAccount
}

export interface AuditEntry {
  id: string
  workspace_id: string
  org_id: string
  account_id?: string
  draft_id?: string
  approval_id?: string
  event_type: AuditEventType
  actor_type: ActorType
  actor_id?: string
  actor_name?: string
  policy_id?: string
  policy_outcome?: string
  detail: Record<string, unknown>
  created_at: string
}

// CSV row from aging report upload
export interface CSVRow {
  client_name: string
  client_email?: string
  client_language?: string
  amount_owing: string | number
  days_overdue: string | number
  invoice_number?: string
  notes?: string
}

// Dashboard KPIs
export interface DashboardKPIs {
  total_ar: number
  total_accounts: number
  pending_approvals: number
  sent_this_month: number
  resolved_this_month: number
  amount_recovered: number
  accounts_by_bucket: Record<ARBucket, number>
  accounts_by_risk: Record<RiskLevel, number>
}
