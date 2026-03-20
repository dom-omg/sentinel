import type { Policy, PolicyOutcome, RiskLevel } from './types'

export const DEFAULT_POLICIES: Omit<Policy, 'id' | 'workspace_id' | 'created_at'>[] = [
  {
    name: 'Lecture comptes autorisée',
    description: "L'IA peut lire les comptes AR",
    condition_action: 'read_accounts',
    condition_risk_level: undefined,
    outcome: 'allow',
    approver_role: undefined,
    priority: 10,
    is_active: true,
    is_system: true,
  },
  {
    name: 'Génération de drafts autorisée',
    description: "L'IA peut générer des drafts d'email",
    condition_action: 'generate_draft',
    condition_risk_level: undefined,
    outcome: 'allow_with_log',
    approver_role: undefined,
    priority: 20,
    is_active: true,
    is_system: true,
  },
  {
    name: 'Envoi soumis à approbation',
    description: "Aucun email ne part sans approbation humaine",
    condition_action: 'send_email',
    condition_risk_level: undefined,
    outcome: 'require_approval',
    approver_role: 'approver',
    priority: 30,
    is_active: true,
    is_system: true,
  },
  {
    name: 'Comptes critiques → approbation admin',
    description: "Les comptes à risque critique nécessitent un admin",
    condition_action: 'send_email',
    condition_risk_level: 'critical',
    outcome: 'require_approval',
    approver_role: 'admin',
    priority: 25,
    is_active: true,
    is_system: true,
  },
  {
    name: 'Export liste bloqué',
    description: "L'IA ne peut pas exporter la liste des comptes",
    condition_action: 'export_accounts',
    condition_risk_level: undefined,
    outcome: 'block',
    approver_role: undefined,
    priority: 5,
    is_active: true,
    is_system: true,
  },
  {
    name: 'Suppression bloquée',
    description: "L'IA ne peut pas supprimer de données",
    condition_action: 'delete',
    condition_risk_level: undefined,
    outcome: 'block',
    approver_role: undefined,
    priority: 5,
    is_active: true,
    is_system: true,
  },
]

export function evaluatePolicy(
  action: string,
  riskLevel: RiskLevel,
  policies: Policy[]
): { outcome: PolicyOutcome; policy: Policy | null } {
  const sorted = [...policies]
    .filter(p => p.is_active)
    .sort((a, b) => a.priority - b.priority)

  // Find most specific matching policy (action + risk_level match beats action-only)
  const specific = sorted.find(
    p => p.condition_action === action && p.condition_risk_level === riskLevel
  )
  if (specific) return { outcome: specific.outcome, policy: specific }

  const general = sorted.find(
    p => p.condition_action === action && !p.condition_risk_level
  )
  if (general) return { outcome: general.outcome, policy: general }

  // Default: allow with log
  return { outcome: 'allow_with_log', policy: null }
}
