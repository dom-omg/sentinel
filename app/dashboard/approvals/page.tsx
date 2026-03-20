'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ApprovalRequest } from '@/lib/types'
import { useWorkspace } from '@/lib/workspace-context'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

interface Toast { id: number; type: 'success' | 'error' | 'info'; msg: string }

type Draft = { subject: string; body: string; edited_body?: string; language: string; sequence_number: number }
type Account = { client_name: string; client_email?: string; amount_owing: number; days_overdue: number; risk_level: string }

export default function ApprovalsPage() {
  const { workspaceId: WORKSPACE_ID, orgId: ORG_ID } = useWorkspace()
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [selected, setSelected] = useState<ApprovalRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState(false)
  const [editedBody, setEditedBody] = useState('')
  const [reason, setReason] = useState('')
  const [previewMode, setPreviewMode] = useState<'preview' | 'edit'>('preview')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [lastDecision, setLastDecision] = useState<{ decision: string; name: string } | null>(null)

  function addToast(type: Toast['type'], msg: string) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }

  const load = useCallback(async () => {
    const res = await fetch(`/api/approvals?workspace_id=${WORKSPACE_ID}`)
    const data = await res.json()
    setApprovals(data.approvals ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { if (WORKSPACE_ID) load() }, [load])

  function openApproval(a: ApprovalRequest) {
    setSelected(a)
    const draft = a.draft as unknown as Draft
    setEditedBody(draft?.edited_body || draft?.body || '')
    setReason('')
    setPreviewMode('preview')
  }

  async function decide(decision: 'approved' | 'rejected' | 'escalated') {
    if (!selected) return
    const acc = selected.account as unknown as Account
    setDeciding(true)
    try {
      const draft = selected.draft as unknown as Draft
      const res = await fetch(`/api/approvals/${selected.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason: reason || undefined,
          edited_body: editedBody !== draft?.body ? editedBody : undefined,
          org_id: ORG_ID,
        }),
      })
      const data = await res.json()
      if (!res.ok) { addToast('error', data.error ?? 'Erreur'); return }

      setLastDecision({ decision, name: acc?.client_name ?? '' })
      setSelected(null)
      await load()

      if (decision === 'approved') {
        addToast('success', data.email_sent
          ? `Email envoyé à ${acc?.client_name}`
          : `Approuvé — envoi en cours pour ${acc?.client_name}`)
      } else if (decision === 'rejected') {
        addToast('info', `Rejeté — ${acc?.client_name} remis en file ouverte`)
      } else {
        addToast('info', `Escaladé — ${acc?.client_name}`)
      }
    } finally {
      setDeciding(false)
    }
  }

  const draft = selected?.draft as unknown as Draft | undefined
  const acc = selected?.account as unknown as Account | undefined

  return (
    <div style={{ padding: 28, display: 'flex', gap: 20, height: 'calc(100vh - 56px)', overflow: 'hidden', position: 'relative' }}>

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'success' ? 'rgba(63,185,80,0.12)' : t.type === 'error' ? 'rgba(248,81,73,0.12)' : 'rgba(88,166,255,0.12)',
            border: `1px solid ${t.type === 'success' ? 'rgba(63,185,80,0.4)' : t.type === 'error' ? 'rgba(248,81,73,0.4)' : 'rgba(88,166,255,0.4)'}`,
            color: t.type === 'success' ? '#3fb950' : t.type === 'error' ? '#f85149' : '#58a6ff',
            borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 500,
            backdropFilter: 'blur(8px)', maxWidth: 320,
            animation: 'fadeInUp 0.2s ease',
          }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Left — queue */}
      <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Approbations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {loading ? '...' : `${approvals.length} en attente`}
          </p>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</p>
          ) : approvals.length === 0 ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 28, textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
              <p style={{ color: '#3fb950', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>File vide</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {lastDecision
                  ? `Dernière action: ${lastDecision.decision === 'approved' ? 'approuvé' : lastDecision.decision === 'rejected' ? 'rejeté' : 'escaladé'} — ${lastDecision.name}`
                  : 'Toutes les approbations sont traitées.'}
              </p>
            </div>
          ) : (
            approvals.map(a => {
              const aAcc = a.account as unknown as Account
              const isSelected = selected?.id === a.id
              return (
                <div
                  key={a.id}
                  onClick={() => openApproval(a)}
                  style={{
                    background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
                    border: `1px solid ${isSelected ? '#58a6ff' : 'var(--border)'}`,
                    borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {aAcc?.client_name}
                  </p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#3fb950', fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
                      {fmt(aAcc?.amount_owing ?? 0)}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>·</span>
                    <span style={{ color: aAcc?.days_overdue > 90 ? '#f85149' : 'var(--text-secondary)', fontSize: 12 }}>
                      {aAcc?.days_overdue}j
                    </span>
                    <span style={{ marginLeft: 'auto' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        color: aAcc?.risk_level === 'critical' ? '#f85149' : aAcc?.risk_level === 'high' ? '#d29922' : '#e3b341',
                      }}>
                        {aAcc?.risk_level === 'critical' ? 'CRITIQUE' : aAcc?.risk_level === 'high' ? 'ÉLEVÉ' : 'MOYEN'}
                      </span>
                    </span>
                  </div>
                  {aAcc?.client_email && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{aAcc.client_email}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right — detail */}
      {selected ? (
        <div style={{
          flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
                Révision de draft
              </p>
              <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>{acc?.client_name}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>

          {/* Account info */}
          <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 28 }}>
            {[
              { label: 'Montant dû', value: fmt(acc?.amount_owing ?? 0), color: 'var(--text-primary)' },
              { label: 'Jours en souffrance', value: `${acc?.days_overdue}j`, color: '#f85149' },
              { label: 'Destinataire', value: acc?.client_email ?? '(pas d\'email)', color: 'var(--text-muted)' },
              { label: 'Langue', value: (draft?.language ?? 'fr').toUpperCase(), color: 'var(--text-secondary)' },
              { label: 'Rappel #', value: String(draft?.sequence_number ?? 1), color: 'var(--text-secondary)' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{item.label}</p>
                <p style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Toggle preview/edit */}
          <div style={{ padding: '10px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {(['preview', 'edit'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setPreviewMode(mode)}
                style={{
                  background: previewMode === mode ? 'var(--surface-2)' : 'transparent',
                  border: `1px solid ${previewMode === mode ? 'var(--border-2)' : 'transparent'}`,
                  borderRadius: 6, padding: '4px 12px', fontSize: 12,
                  color: previewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: previewMode === mode ? 500 : 400,
                }}
              >
                {mode === 'preview' ? '👁 Aperçu email' : '✎ Modifier'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
            {previewMode === 'preview' ? (
              /* Email preview — formatted like a real email */
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border-2)',
                borderRadius: 10, overflow: 'hidden', maxWidth: 640,
              }}>
                {/* Email header chrome */}
                <div style={{ padding: '14px 18px', background: 'var(--surface-3)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, minWidth: 28 }}>De:</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>L&apos;équipe de facturation &lt;noreply@bastion.app&gt;</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, minWidth: 28 }}>À:</span>
                    <span style={{ color: acc?.client_email ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 12 }}>
                      {acc?.client_email ?? '(pas d\'adresse email enregistrée)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, minWidth: 28 }}>Sujet:</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>{draft?.subject}</span>
                  </div>
                </div>
                {/* Email body */}
                <div style={{ padding: '20px 22px', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {editedBody}
                </div>
              </div>
            ) : (
              /* Edit mode */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Sujet</p>
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{draft?.subject}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Corps (modifiable)</p>
                  <textarea
                    value={editedBody}
                    onChange={e => setEditedBody(e.target.value)}
                    style={{
                      width: '100%', minHeight: 220,
                      background: 'var(--surface-2)', border: '1px solid var(--border-2)',
                      borderRadius: 8, padding: '12px 14px',
                      color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6,
                      resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Note interne</p>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Raison, commentaire..."
                    style={{
                      width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)',
                      fontSize: 13, outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <button
              onClick={() => decide('approved')}
              disabled={deciding}
              style={{
                flex: 1, background: deciding ? 'var(--surface-2)' : '#3fb950',
                color: deciding ? 'var(--text-muted)' : '#030608',
                border: 'none', borderRadius: 8, padding: '11px 0',
                fontSize: 14, fontWeight: 700,
                cursor: deciding ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              {deciding ? (
                <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'currentColor', animation: 'spin 0.7s linear infinite' }} />
              ) : '✓'}
              Approuver et envoyer
            </button>
            <button
              onClick={() => decide('escalated')}
              disabled={deciding}
              style={{
                background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.3)',
                color: '#d29922', borderRadius: 8, padding: '11px 18px',
                fontSize: 13, fontWeight: 600, cursor: deciding ? 'not-allowed' : 'pointer',
              }}
            >
              ↑ Escalader
            </button>
            <button
              onClick={() => decide('rejected')}
              disabled={deciding}
              style={{
                background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)',
                color: '#f85149', borderRadius: 8, padding: '11px 18px',
                fontSize: 13, fontWeight: 600, cursor: deciding ? 'not-allowed' : 'pointer',
              }}
            >
              ✕ Rejeter
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12,
        }}>
          {approvals.length === 0 && !loading ? (
            <>
              <div style={{ fontSize: 48, opacity: 0.3 }}>◈</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>File d&apos;approbations vide</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Générez des drafts depuis la page Comptes AR</p>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sélectionnez une approbation pour la traiter</p>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  )
}
