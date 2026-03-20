'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ARAccount } from '@/lib/types'
import { RISK_COLORS } from '@/lib/risk'
import { useWorkspace } from '@/lib/workspace-context'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:             { label: 'Ouvert',       color: 'var(--text-muted)' },
  draft_ready:      { label: 'Draft prêt',   color: '#58a6ff' },
  pending_approval: { label: 'En attente',   color: '#e3b341' },
  sent:             { label: 'Envoyé',       color: '#3fb950' },
  resolved:         { label: 'Résolu',       color: '#3fb950' },
  escalated:        { label: 'Escaladé',     color: '#d29922' },
  blocked:          { label: 'Bloqué',       color: '#f85149' },
}

interface Toast { id: number; type: 'success' | 'error' | 'info'; msg: string }

export default function AccountsPage() {
  const router = useRouter()
  const { workspaceId: WORKSPACE_ID, orgId: ORG_ID } = useWorkspace()
  const [accounts, setAccounts] = useState<ARAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'pending_approval' | 'sent'>('all')
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  function addToast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadAccounts = useCallback(async () => {
    if (!WORKSPACE_ID) return
    const params = new URLSearchParams({ workspace_id: WORKSPACE_ID })
    if (filter !== 'all') params.set('status', filter)
    if (search) params.set('search', search)
    if (riskFilter) params.set('risk_level', riskFilter)
    const res = await fetch(`/api/accounts?${params}`)
    const data = await res.json()
    setAccounts(data.accounts ?? [])
    setLoading(false)
  }, [filter, search, riskFilter, WORKSPACE_ID])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  async function generateDraft(accountId: string) {
    setGenerating(accountId)
    try {
      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, workspace_id: WORKSPACE_ID, org_id: ORG_ID }),
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error ?? 'Erreur génération'); return }
      await loadAccounts()
      if (data.requires_approval) {
        addToast('info', 'Draft généré — en attente d\'approbation')
        setTimeout(() => router.push('/dashboard/approvals'), 1200)
      } else {
        addToast('success', 'Draft généré')
      }
    } finally {
      setGenerating(null)
    }
  }

  const openCount = accounts.filter(a => a.status === 'open').length

  async function generateAllOpen() {
    const openAccounts = accounts.filter(a => a.status === 'open')
    if (openAccounts.length === 0) return
    setBatchRunning(true)
    setBatchProgress({ done: 0, total: openAccounts.length })
    let approvalCount = 0
    for (let i = 0; i < openAccounts.length; i++) {
      try {
        const res = await fetch('/api/drafts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: openAccounts[i].id, workspace_id: WORKSPACE_ID, org_id: ORG_ID }),
        })
        const data = await res.json()
        if (res.ok && data.requires_approval) approvalCount++
      } catch { /* continue */ }
      setBatchProgress({ done: i + 1, total: openAccounts.length })
    }
    await loadAccounts()
    setBatchRunning(false)
    setBatchProgress(null)
    if (approvalCount > 0) {
      addToast('info', `${openAccounts.length} drafts générés — ${approvalCount} en attente d'approbation`)
      setTimeout(() => router.push('/dashboard/approvals'), 1500)
    } else {
      addToast('success', `${openAccounts.length} drafts générés`)
    }
  }

  const filters = [
    { key: 'all',             label: 'Tous' },
    { key: 'open',            label: 'Ouverts' },
    { key: 'pending_approval', label: 'En attente' },
    { key: 'sent',            label: 'Envoyés' },
  ] as const

  return (
    <div style={{ padding: 28, position: 'relative' }}>
      {/* Toast stack */}
      <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'success' ? 'rgba(63,185,80,0.12)' : t.type === 'error' ? 'rgba(248,81,73,0.12)' : 'rgba(88,166,255,0.12)',
            border: `1px solid ${t.type === 'success' ? 'rgba(63,185,80,0.4)' : t.type === 'error' ? 'rgba(248,81,73,0.4)' : 'rgba(88,166,255,0.4)'}`,
            color: t.type === 'success' ? '#3fb950' : t.type === 'error' ? '#f85149' : '#58a6ff',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 500,
            backdropFilter: 'blur(8px)',
            animation: 'fadeInUp 0.2s ease',
            maxWidth: 320,
          }}>
            {t.msg}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Comptes AR
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {accounts.length} compte{accounts.length > 1 ? 's' : ''} · Triés par score de risque
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 8,
              padding: '7px 12px',
              color: 'var(--text-primary)',
              fontSize: 12,
              outline: 'none',
              width: 200,
            }}
          />

          {/* Risk filter */}
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 8,
              padding: '7px 10px',
              color: riskFilter ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">Tout risque</option>
            <option value="low">Faible</option>
            <option value="medium">Moyen</option>
            <option value="high">Élevé</option>
            <option value="critical">Critique</option>
          </select>

          {/* Status Filters */}
          <div style={{ display: 'flex', gap: 4 }}>
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

          {/* Export CSV */}
          <a
            href={`/api/accounts/export?workspace_id=${WORKSPACE_ID}`}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 8,
              padding: '7px 12px',
              color: 'var(--text-secondary)',
              fontSize: 12,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            ↓ CSV
          </a>

          {/* Batch generate */}
          {openCount > 0 && !batchRunning && (
            <button
              onClick={generateAllOpen}
              disabled={!!generating}
              style={{
                background: 'rgba(63,185,80,0.1)',
                border: '1px solid rgba(63,185,80,0.3)',
                borderRadius: 8,
                padding: '7px 14px',
                color: '#3fb950',
                fontSize: 12,
                fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Générer {openCount} draft{openCount > 1 ? 's' : ''}
            </button>
          )}

          {batchRunning && batchProgress && (
            <div style={{
              background: 'rgba(88,166,255,0.1)',
              border: '1px solid rgba(88,166,255,0.25)',
              borderRadius: 8,
              padding: '7px 14px',
              color: '#58a6ff',
              fontSize: 12,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                border: '2px solid rgba(88,166,255,0.3)',
                borderTopColor: '#58a6ff',
                animation: 'spin 0.7s linear infinite',
              }} />
              {batchProgress.done}/{batchProgress.total} drafts...
            </div>
          )}
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
                      <Link href={`/dashboard/accounts/${acc.id}`} style={{ textDecoration: 'none' }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{acc.client_name}</p>
                        {acc.client_email && (
                          <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{acc.client_email}</p>
                        )}
                      </Link>
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
                      <div style={{ width: 40, height: 3, marginTop: 3, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
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
                      {canGenerate ? (
                        <button
                          onClick={() => generateDraft(acc.id)}
                          disabled={!!generating || batchRunning}
                          style={{
                            background: isGenerating ? 'var(--surface-2)' : '#238636',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: (isGenerating || batchRunning) ? 'not-allowed' : 'pointer',
                            opacity: (isGenerating || batchRunning) ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {isGenerating && (
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%',
                              border: '1.5px solid rgba(255,255,255,0.3)',
                              borderTopColor: '#fff',
                              animation: 'spin 0.7s linear infinite',
                            }} />
                          )}
                          {isGenerating ? 'Génération...' : 'Générer draft'}
                        </button>
                      ) : acc.status === 'pending_approval' ? (
                        <button
                          onClick={() => router.push('/dashboard/approvals')}
                          style={{
                            background: 'rgba(227,179,65,0.1)',
                            border: '1px solid rgba(227,179,65,0.3)',
                            borderRadius: 6,
                            padding: '5px 12px',
                            color: '#e3b341',
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Réviser →
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
