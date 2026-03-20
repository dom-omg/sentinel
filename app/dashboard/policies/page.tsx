'use client'

import { useEffect, useState } from 'react'
import type { Policy } from '@/lib/types'
import { DEFAULT_POLICIES } from '@/lib/policy'

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? ''

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  allow:              { label: 'Autoriser',          color: '#3fb950' },
  allow_with_log:     { label: 'Autoriser + log',    color: '#58a6ff' },
  require_approval:   { label: 'Approbation req.',   color: '#e3b341' },
  block:              { label: 'Bloquer',            color: '#f85149' },
}

const ACTION_LABELS: Record<string, string> = {
  read_accounts:   'Lecture des comptes',
  generate_draft:  'Génération de drafts',
  send_email:      'Envoi d\'email',
  export_accounts: 'Export de données',
  delete:          'Suppression',
}

const RISK_LABELS: Record<string, string> = {
  low:      'Faible',
  medium:   'Moyen',
  high:     'Élevé',
  critical: 'Critique',
}

function PolicyRow({ policy, systemMode }: { policy: Omit<Policy, 'id' | 'workspace_id' | 'created_at'> & { id?: string }; systemMode?: boolean }) {
  const outcome = OUTCOME_CONFIG[policy.outcome] ?? { label: policy.outcome, color: '#8b949e' }
  const action = ACTION_LABELS[policy.condition_action] ?? policy.condition_action
  const riskCondition = policy.condition_risk_level ? RISK_LABELS[policy.condition_risk_level] : null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 220px 180px 40px',
      alignItems: 'center',
      gap: 16,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      opacity: policy.is_active ? 1 : 0.45,
    }}>
      {/* Policy info */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
            {policy.name}
          </span>
          {systemMode && (
            <span style={{
              display: 'inline-block',
              background: 'var(--surface-3)',
              border: '1px solid var(--border-2)',
              borderRadius: 4,
              padding: '1px 6px',
              color: 'var(--text-muted)',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              système
            </span>
          )}
        </div>
        {policy.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{policy.description}</p>
        )}
      </div>

      {/* Condition */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-block',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '2px 7px',
            color: '#58a6ff',
            fontSize: 11,
            fontWeight: 500,
            fontFamily: 'monospace',
          }}>
            {action}
          </span>
          {riskCondition && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>+</span>
              <span style={{
                display: 'inline-block',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '2px 7px',
                color: 'var(--text-secondary)',
                fontSize: 11,
              }}>
                risque {riskCondition}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Outcome */}
      <div>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: `${outcome.color}12`,
          border: `1px solid ${outcome.color}30`,
          borderRadius: 6,
          padding: '4px 10px',
          color: outcome.color,
          fontSize: 12,
          fontWeight: 600,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: outcome.color, display: 'inline-block' }} />
          {outcome.label}
        </span>
        {policy.approver_role && (
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
            → Approbateur: {policy.approver_role}
          </p>
        )}
      </div>

      {/* Priority */}
      <div style={{ textAlign: 'right' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}>
          P{policy.priority}
        </span>
      </div>
    </div>
  )
}

export default function PoliciesPage() {
  const [workspacePolicies, setWorkspacePolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!WORKSPACE_ID) { setLoading(false); return }
    fetch(`/api/policies?workspace_id=${WORKSPACE_ID}`)
      .then(r => r.json())
      .then(d => {
        setWorkspacePolicies(d.policies ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const systemPolicies = DEFAULT_POLICIES.filter(p => p.is_system)
  const customPolicies = workspacePolicies.filter(p => !p.is_system)

  return (
    <div style={{ padding: 28, maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Politique de gouvernance
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Chaque action de l'opérateur IA est évaluée contre ces règles avant exécution.
        </p>
      </div>

      {/* How it works */}
      <div style={{
        background: 'rgba(88, 166, 255, 0.05)',
        border: '1px solid rgba(88, 166, 255, 0.15)',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <span style={{ color: '#58a6ff', fontSize: 14, marginTop: 1 }}>⬡</span>
        <div>
          <p style={{ color: '#58a6ff', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            Comment fonctionne le Policy Engine
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>
            À chaque action demandée, BASTION évalue les politiques par ordre de priorité (P1 = plus haute priorité).
            La première politique correspondante s'applique. Les politiques système ne peuvent pas être désactivées.
            Le résultat peut être: <strong style={{ color: '#3fb950' }}>autoriser</strong>,{' '}
            <strong style={{ color: '#58a6ff' }}>autoriser avec log</strong>,{' '}
            <strong style={{ color: '#e3b341' }}>exiger approbation</strong>, ou{' '}
            <strong style={{ color: '#f85149' }}>bloquer</strong>.
          </p>
        </div>
      </div>

      {/* System policies */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
            Politiques système
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Actives en permanence · Non modifiables
          </span>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 220px 180px 40px',
            gap: 16,
            padding: '8px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            {['Règle', 'Condition', 'Résultat', 'Prio'].map((h, i) => (
              <div key={h} style={{
                color: 'var(--text-muted)',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textAlign: i === 3 ? 'right' : 'left',
              }}>
                {h}
              </div>
            ))}
          </div>
          {systemPolicies.map((p, i) => (
            <PolicyRow key={i} policy={p} systemMode />
          ))}
        </div>
      </div>

      {/* Custom policies */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
              Politiques workspace
            </h2>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Configurables par votre équipe
            </span>
          </div>
          <button
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 8,
              padding: '6px 14px',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
            title="Disponible en V2"
          >
            + Ajouter une règle (V2)
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</p>
        ) : customPolicies.length === 0 ? (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '32px 24px',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 6 }}>
              Aucune politique personnalisée
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Les politiques système protègent déjà tous les workflows critiques.
              Des règles personnalisées (seuils de montant, rôles spécifiques) seront disponibles en V2.
            </p>
          </div>
        ) : (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {customPolicies.map(p => (
              <PolicyRow key={p.id} policy={p} />
            ))}
          </div>
        )}
      </div>

      {/* Risk model reference */}
      <div style={{
        marginTop: 32,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 20px',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Modèle de risque — Référence
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { level: 'Faible', color: '#3fb950', examples: ['Lecture d\'un compte', 'Analyse interne'] },
            { level: 'Moyen', color: '#e3b341', examples: ['Génération de draft', 'Modification interne'] },
            { level: 'Élevé', color: '#d29922', examples: ['Envoi email client', 'Actions en lot'] },
            { level: 'Critique', color: '#f85149', examples: ['Export de données', 'Suppression', 'Instructions financières'] },
          ].map(({ level, color, examples }) => (
            <div key={level}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                <span style={{ color, fontSize: 12, fontWeight: 600 }}>{level}</span>
              </div>
              {examples.map(ex => (
                <p key={ex} style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 3 }}>· {ex}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
