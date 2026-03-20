'use client'

import { useEffect, useState } from 'react'
import type { ARAccount } from '@/lib/types'
import { RISK_COLORS } from '@/lib/risk'

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? ''
const ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? ''

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'var(--text-muted)' },
  draft_ready: { label: 'Draft prêt', color: '#58a6ff' },
  pending_approval: { label: 'En attente', color: '#e3b341' },
  sent: { label: 'Envoyé', color: '#3fb950' },
  resolved: { label: 'Résolu', color: '#3fb950' },
  escalated: { label: 'Escaladé', color: '#d29922' },
  blocked: { label: 'Bloqué', color: '#f85149' },
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ARAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'pending_approval'>('all')

  async function loadAccounts() {
    const params = new URLSearchParams({ workspace_id: WORKSPACE_ID })
    if (filter !== 'all') params.set('status', filter)
    const res = await fetch(`/api/accounts?${params}`)
    const data = await res.json()
    setAccounts(data.accounts ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (WORKSPACE_ID) loadAccounts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function generateDraft(accountId: string) {
    setGenerating(accountId)
    try {
      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, workspace_id: WORKSPACE_ID, org_id: ORG_ID }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error); return }
      await loadAccounts()
      if (data.requires_approval) {
        alert('Draft généré et soumis pour approbation.')
      }
    } finally {
      setGenerating(null)
    }
  }

  const filters = [
    { key: 'all', label: 'Tous' },
    { key: 'open', label: 'Ouverts' },
    { key: 'pending_approval', label: 'En attente' },
  ] as const

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Comptes AR
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {accounts.length} compte{accounts.length > 1 ? 's' : ''} · Triés par score de risque
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? 'var(--surface-2)' : 'transparent',
                border: `1px solid ${filter === f.key ? 'var(--border-2)' : 'transparent'}`,
                borderRadius: 7,
                padding: '6px 12px',
                color: filter === f.key ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: filter === f.key ? 500 : 400,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</p>
      ) : accounts.length === 0 ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 6 }}>Aucun compte</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Importez un rapport AR pour commencer.</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Client', 'Montant dû', 'Jours', 'Risque', 'Langue', 'Statut', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, i) => {
                const statusInfo = STATUS_LABELS[acc.status] ?? STATUS_LABELS.open
                const canGenerate = acc.status === 'open'
                const isGenerating = generating === acc.id
                return (
                  <tr key={acc.id} style={{ borderBottom: i < accounts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{acc.client_name}</p>
                      {acc.client_email && (
                        <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{acc.client_email}</p>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                        {fmt(acc.amount_owing)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        color: acc.days_overdue > 90 ? '#f85149' : acc.days_overdue > 60 ? '#d29922' : 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: acc.days_overdue > 90 ? 600 : 400,
                      }}>
                        {acc.days_overdue}j
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={RISK_COLORS[acc.risk_level]} style={{ fontSize: 12, fontWeight: 600 }}>
                        {acc.risk_level === 'low' ? 'Faible' : acc.risk_level === 'medium' ? 'Moyen' : acc.risk_level === 'high' ? 'Élevé' : 'Critique'}
                      </span>
                      <div style={{
                        width: 40,
                        height: 3,
                        marginTop: 3,
                        background: 'var(--surface-3)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${acc.risk_score}%`,
                          height: '100%',
                          background: acc.risk_level === 'critical' ? '#f85149' : acc.risk_level === 'high' ? '#d29922' : acc.risk_level === 'medium' ? '#e3b341' : '#3fb950',
                          borderRadius: 2,
                        }} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '2px 7px',
                        color: 'var(--text-secondary)',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>
                        {acc.client_language}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: statusInfo.color, fontSize: 12, fontWeight: 500 }}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {canGenerate && (
                        <button
                          onClick={() => generateDraft(acc.id)}
                          disabled={!!generating}
                          style={{
                            background: isGenerating ? 'var(--surface-2)' : '#238636',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                            opacity: isGenerating ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isGenerating ? 'Génération...' : 'Générer draft'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
