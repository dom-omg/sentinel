'use client'

import { useEffect, useState } from 'react'
import type { ApprovalRequest } from '@/lib/types'

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? ''
const ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? ''

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [selected, setSelected] = useState<ApprovalRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState(false)
  const [editedBody, setEditedBody] = useState('')
  const [reason, setReason] = useState('')

  async function load() {
    const res = await fetch(`/api/approvals?workspace_id=${WORKSPACE_ID}`)
    const data = await res.json()
    setApprovals(data.approvals ?? [])
    setLoading(false)
  }

  useEffect(() => { if (WORKSPACE_ID) load() }, [])

  function openApproval(a: ApprovalRequest) {
    setSelected(a)
    setEditedBody((a.draft as unknown as { edited_body?: string; body: string })?.edited_body || (a.draft as unknown as { body: string })?.body || '')
    setReason('')
  }

  async function decide(decision: 'approved' | 'rejected' | 'escalated') {
    if (!selected) return
    setDeciding(true)
    try {
      const res = await fetch(`/api/approvals/${selected.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason: reason || undefined,
          edited_body: editedBody !== (selected.draft as unknown as { body: string })?.body ? editedBody : undefined,
          org_id: ORG_ID,
        }),
      })
      if (res.ok) {
        setSelected(null)
        await load()
      }
    } finally {
      setDeciding(false)
    }
  }

  return (
    <div style={{ padding: 28, display: 'flex', gap: 20, height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Left — queue */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Approbations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {approvals.length} en attente de décision
          </p>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</p>
          ) : approvals.length === 0 ? (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 28,
              textAlign: 'center',
            }}>
              <p style={{ color: '#3fb950', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>File vide</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Toutes les approbations sont traitées.</p>
            </div>
          ) : (
            approvals.map(a => {
              const acc = a.account as unknown as { client_name: string; amount_owing: number; days_overdue: number; risk_level: string }
              const isSelected = selected?.id === a.id
              return (
                <div
                  key={a.id}
                  onClick={() => openApproval(a)}
                  style={{
                    background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
                    border: `1px solid ${isSelected ? '#58a6ff' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {acc?.client_name}
                  </p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#3fb950', fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
                      {fmt(acc?.amount_owing ?? 0)}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>·</span>
                    <span style={{ color: acc?.days_overdue > 90 ? '#f85149' : 'var(--text-secondary)', fontSize: 12 }}>
                      {acc?.days_overdue}j
                    </span>
                    <span style={{ marginLeft: 'auto' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: acc?.risk_level === 'critical' ? '#f85149' : acc?.risk_level === 'high' ? '#d29922' : '#e3b341',
                      }}>
                        {acc?.risk_level === 'critical' ? 'CRITIQUE' : acc?.risk_level === 'high' ? 'ÉLEVÉ' : 'MOYEN'}
                      </span>
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right — detail */}
      {selected ? (
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
                Révision de draft
              </p>
              <p style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>
                {(selected.account as unknown as { client_name: string })?.client_name}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          {/* Account info */}
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 24 }}>
            {[
              { label: 'Montant dû', value: fmt((selected.account as unknown as { amount_owing: number })?.amount_owing ?? 0), color: 'var(--text-primary)' },
              { label: 'Jours en souffrance', value: `${(selected.account as unknown as { days_overdue: number })?.days_overdue}j`, color: '#f85149' },
              { label: 'Langue', value: ((selected.draft as unknown as { language: string })?.language ?? 'fr').toUpperCase(), color: 'var(--text-secondary)' },
              { label: 'Rappel #', value: String((selected.draft as unknown as { sequence_number: number })?.sequence_number ?? 1), color: 'var(--text-secondary)' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{item.label}</p>
                <p style={{ color: item.color, fontSize: 14, fontWeight: 600 }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Draft preview + edit */}
          <div style={{ flex: 1, padding: '18px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Sujet
              </p>
              <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
                {(selected.draft as unknown as { subject: string })?.subject}
              </p>
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Corps de l&apos;email (modifiable)
              </p>
              <textarea
                value={editedBody}
                onChange={e => setEditedBody(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 200,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  lineHeight: 1.6,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Note interne (optionnel)
              </p>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Raison du refus, commentaire..."
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{
            padding: '16px 22px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 10,
            background: 'var(--surface)',
          }}>
            <button
              onClick={() => decide('approved')}
              disabled={deciding}
              style={{
                flex: 1,
                background: '#3fb950',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 0',
                fontSize: 13,
                fontWeight: 700,
                cursor: deciding ? 'not-allowed' : 'pointer',
                opacity: deciding ? 0.7 : 1,
              }}
            >
              Approuver et envoyer
            </button>
            <button
              onClick={() => decide('escalated')}
              disabled={deciding}
              style={{
                background: 'rgba(210, 153, 34, 0.1)',
                border: '1px solid rgba(210, 153, 34, 0.3)',
                color: '#d29922',
                borderRadius: 8,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: deciding ? 'not-allowed' : 'pointer',
              }}
            >
              Escalader
            </button>
            <button
              onClick={() => decide('rejected')}
              disabled={deciding}
              style={{
                background: 'rgba(248, 81, 73, 0.08)',
                border: '1px solid rgba(248, 81, 73, 0.2)',
                color: '#f85149',
                borderRadius: 8,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: deciding ? 'not-allowed' : 'pointer',
              }}
            >
              Rejeter
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sélectionnez une approbation pour la traiter</p>
        </div>
      )}
    </div>
  )
}
