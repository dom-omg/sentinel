'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { ARAccount, Draft, AuditEntry } from '@/lib/types'
import { useWorkspace } from '@/lib/workspace-context'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(s: string) {
  return new Date(s).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const RISK_COLORS: Record<string, string> = {
  low: '#3fb950', medium: '#e3b341', high: '#d29922', critical: '#f85149',
}
const RISK_LABELS: Record<string, string> = {
  low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique',
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
const AUDIT_ICONS: Record<string, string> = {
  account_ingested:  '📥',
  account_segmented: '⬡',
  draft_generated:   '✦',
  policy_evaluated:  '◈',
  approval_requested:'⏳',
  approved:          '✓',
  rejected:          '✕',
  escalated:         '↑',
  email_sent:        '✉',
  blocked:           '⊘',
  emergency_stop:    '🛑',
}
const AUDIT_COLORS: Record<string, string> = {
  approved:          '#3fb950',
  email_sent:        '#3fb950',
  rejected:          '#f85149',
  blocked:           '#f85149',
  emergency_stop:    '#f85149',
  escalated:         '#d29922',
  draft_generated:   '#58a6ff',
  approval_requested:'#e3b341',
  policy_evaluated:  'var(--text-muted)',
  account_ingested:  'var(--text-muted)',
  account_segmented: 'var(--text-muted)',
}

interface DraftWithApproval extends Draft {
  approval?: { status: string; decision_at?: string; reason?: string } | null
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { orgId: ORG_ID } = useWorkspace()
  const [account, setAccount] = useState<ARAccount | null>(null)
  const [drafts, setDrafts] = useState<DraftWithApproval[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [resolving, setResolving] = useState(false)
  // Notes editing (#8)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  // Draft inline editing (#7)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [savingDraft, setSavingDraft] = useState(false)

  async function load() {
    const res = await fetch(`/api/accounts/${id}`)
    if (!res.ok) { router.push('/dashboard/accounts'); return }
    const data = await res.json()
    setAccount(data.account)
    setDrafts(data.drafts)
    setAudit(data.audit)
    setNotesValue(data.account?.notes ?? '')
    setLoading(false)
  }

  async function saveNotes() {
    if (!account) return
    setSavingNotes(true)
    try {
      await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue, workspace_id: account.workspace_id, org_id: ORG_ID }),
      })
      setEditingNotes(false)
      await load()
    } finally {
      setSavingNotes(false)
    }
  }

  async function saveDraftEdit() {
    if (!editingDraftId) return
    setSavingDraft(true)
    try {
      await fetch(`/api/drafts/${editingDraftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      })
      setEditingDraftId(null)
      await load()
    } finally {
      setSavingDraft(false)
    }
  }

  useEffect(() => { if (id) load() }, [id])

  async function markResolved() {
    if (!account) return
    setResolving(true)
    try {
      await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved', workspace_id: account.workspace_id, org_id: ORG_ID }),
      })
      await load()
    } finally {
      setResolving(false)
    }
  }

  async function generateDraft() {
    if (!account) return
    setGenerating(true)
    try {
      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: id, workspace_id: account.workspace_id, org_id: ORG_ID }),
      })
      const data = await res.json()
      await load()
      if (res.ok && data.requires_approval) {
        router.push('/dashboard/approvals')
      }
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 28, color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</div>
    )
  }

  if (!account) return null

  const statusInfo = STATUS_LABELS[account.status] ?? STATUS_LABELS.open
  const riskColor = RISK_COLORS[account.risk_level] ?? 'var(--text-muted)'

  return (
    <div style={{ padding: 28, maxWidth: 900 }}>
      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/accounts')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none', color: 'var(--text-muted)',
          fontSize: 12, cursor: 'pointer', marginBottom: 20, padding: 0,
        }}
      >
        ← Retour aux comptes
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {account.client_name}
            </h1>
            <span style={{
              background: `${riskColor}15`,
              border: `1px solid ${riskColor}40`,
              color: riskColor,
              fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 8px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {RISK_LABELS[account.risk_level]}
            </span>
            <span style={{ color: statusInfo.color, fontSize: 12, fontWeight: 500 }}>
              {statusInfo.label}
            </span>
          </div>
          {account.client_email && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{account.client_email}</p>
          )}
        </div>
        {account.status === 'open' && (
          <button
            onClick={generateDraft}
            disabled={generating}
            style={{
              background: generating ? 'var(--surface-2)' : '#238636',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 18px', fontSize: 13, fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {generating && (
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                animation: 'spin 0.7s linear infinite',
              }} />
            )}
            {generating ? 'Génération...' : 'Générer un draft'}
          </button>
        )}
        {account.status === 'pending_approval' && (
          <button
            onClick={() => router.push('/dashboard/approvals')}
            style={{
              background: 'rgba(227,179,65,0.1)', border: '1px solid rgba(227,179,65,0.3)',
              color: '#e3b341', borderRadius: 8, padding: '9px 18px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Aller aux approbations →
          </button>
        )}
        {account.status === 'sent' && (
          <button
            onClick={markResolved}
            disabled={resolving}
            style={{
              background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.3)',
              color: '#3fb950', borderRadius: 8, padding: '9px 18px',
              fontSize: 13, fontWeight: 600, cursor: resolving ? 'not-allowed' : 'pointer',
              opacity: resolving ? 0.7 : 1,
            }}
          >
            {resolving ? 'En cours...' : '✓ Marquer comme résolu'}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Montant dû', value: fmt(account.amount_owing), color: 'var(--text-primary)' },
          { label: 'Jours en souffrance', value: `${account.days_overdue} jours`, color: account.days_overdue > 90 ? '#f85149' : 'var(--text-primary)' },
          { label: 'Score de risque', value: `${account.risk_score}/100`, color: riskColor },
          { label: 'Tranche', value: `${account.bucket} jours`, color: 'var(--text-secondary)' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {item.label}
            </p>
            <p style={{ color: item.color, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Account meta + Notes */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
        {account.invoice_number && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 8 }}>Facture</span>
            {account.invoice_number}
          </p>
        )}

        {/* Notes section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingNotes ? 8 : 4 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes internes</span>
            {!editingNotes && (
              <button
                onClick={() => { setNotesValue(account.notes ?? ''); setEditingNotes(true) }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: 0 }}
              >
                {account.notes ? 'Modifier' : '+ Ajouter une note'}
              </button>
            )}
          </div>

          {editingNotes ? (
            <div>
              <textarea
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                placeholder="Note interne visible uniquement par l'équipe..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  marginBottom: 8,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {savingNotes ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
                <button
                  onClick={() => setEditingNotes(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            account.notes
              ? <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>{account.notes}</p>
              : <p style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>Aucune note</p>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Drafts */}
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Drafts ({drafts.length})
          </p>

          {drafts.length === 0 ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '28px 20px', textAlign: 'center',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun draft généré pour ce compte.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {drafts.map(draft => {
                const isExpanded = expandedDraft === draft.id
                const apprStatus = draft.approval?.status
                const statusColor = apprStatus === 'approved' ? '#3fb950' : apprStatus === 'rejected' ? '#f85149' : apprStatus === 'escalated' ? '#d29922' : draft.status === 'sent' ? '#3fb950' : '#58a6ff'
                const statusLabel = apprStatus === 'approved' ? 'Approuvé' : apprStatus === 'rejected' ? 'Rejeté' : apprStatus === 'escalated' ? 'Escaladé' : draft.status === 'sent' ? 'Envoyé' : draft.status === 'pending_approval' ? 'En attente' : 'Généré'
                return (
                  <div key={draft.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, overflow: 'hidden',
                  }}>
                    <div
                      onClick={() => setExpandedDraft(isExpanded ? null : draft.id)}
                      style={{
                        padding: '14px 16px', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <div>
                        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
                          {draft.subject || `Rappel #${draft.sequence_number}`}
                        </p>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                            Rappel #{draft.sequence_number} · {draft.language.toUpperCase()} · {fmtDate(draft.created_at)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          background: `${statusColor}15`, border: `1px solid ${statusColor}35`,
                          color: statusColor, fontSize: 11, fontWeight: 600, borderRadius: 5,
                          padding: '2px 8px',
                        }}>
                          {statusLabel}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                        {editingDraftId === draft.id ? (
                          /* Edit mode */
                          <div>
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Sujet</label>
                              <input
                                value={editSubject}
                                onChange={e => setEditSubject(e.target.value)}
                                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 7, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                              />
                            </div>
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Corps</label>
                              <textarea
                                value={editBody}
                                onChange={e => setEditBody(e.target.value)}
                                rows={8}
                                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 7, padding: '8px 12px', color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.7, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={saveDraftEdit}
                                disabled={savingDraft}
                                style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                              >
                                {savingDraft ? 'Sauvegarde...' : 'Sauvegarder'}
                              </button>
                              <button
                                onClick={() => setEditingDraftId(null)}
                                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 16px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Preview mode */
                          <div>
                            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-3)' }}>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, minWidth: 24 }}>À:</span>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{account.client_email ?? '(pas d\'email)'}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, minWidth: 24 }}>Sujet:</span>
                                  <span style={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}>{draft.subject}</span>
                                </div>
                              </div>
                              <div style={{ padding: '14px', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                {draft.edited_body || draft.body}
                              </div>
                            </div>
                            {draft.status !== 'sent' && (
                              <button
                                onClick={() => {
                                  setEditingDraftId(draft.id)
                                  setEditSubject(draft.subject)
                                  setEditBody(draft.edited_body || draft.body)
                                }}
                                style={{ background: 'transparent', border: '1px solid var(--border-2)', borderRadius: 6, padding: '5px 12px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}
                              >
                                ✏ Modifier
                              </button>
                            )}
                          </div>
                        )}

                        {draft.approval?.reason && (
                          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                            Note: {draft.approval.reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Audit timeline */}
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Historique
          </p>

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '6px 0', maxHeight: 520, overflow: 'auto',
          }}>
            {audit.length === 0 ? (
              <p style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                Aucun événement
              </p>
            ) : (
              audit.map((entry, i) => {
                const color = AUDIT_COLORS[entry.event_type] ?? 'var(--text-muted)'
                const icon = AUDIT_ICONS[entry.event_type] ?? '·'
                return (
                  <div key={entry.id} style={{
                    display: 'flex', gap: 10, padding: '10px 14px',
                    borderBottom: i < audit.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 24, height: 24, flexShrink: 0, borderRadius: '50%',
                      background: `${color}15`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 10, marginTop: 1,
                    }}>
                      {icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: color, fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
                        {entry.event_type.replace(/_/g, ' ')}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                        {fmtDate(entry.created_at)}
                        {entry.actor_name ? ` · ${entry.actor_name}` : entry.actor_type === 'omni' ? ' · OMNI AI' : ''}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
