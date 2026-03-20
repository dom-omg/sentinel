'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? ''
const ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ?? ''

interface WorkspaceInfo {
  workspace: { id: string; name: string; language_default: string; created_at: string }
  org: { id: string; name: string; slug: string; language_default: string; tone: string; plan: string }
  members: Array<{ role: string; user: { name: string; email: string; role: string } }>
}

export default function SettingsPage() {
  const router = useRouter()
  const [info, setInfo] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [stopping, setStopping] = useState(false)
  const [stopDone, setStopDone] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)

  useEffect(() => {
    if (!WORKSPACE_ID) { setLoading(false); return }
    fetch(`/api/settings?workspace_id=${WORKSPACE_ID}`)
      .then(r => r.json())
      .then(d => { setInfo(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function emergencyStop() {
    setStopping(true)
    try {
      await fetch('/api/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: WORKSPACE_ID, org_id: ORG_ID }),
      })
      setStopDone(true)
      setConfirmStop(false)
    } finally {
      setStopping(false)
    }
  }

  const PLAN_LABELS: Record<string, { label: string; color: string }> = {
    starter:    { label: 'Starter',    color: '#58a6ff' },
    team:       { label: 'Team',       color: '#3fb950' },
    studio:     { label: 'Studio',     color: '#e3b341' },
    enterprise: { label: 'Enterprise', color: '#d29922' },
  }
  const plan = PLAN_LABELS[info?.org.plan ?? 'starter'] ?? PLAN_LABELS.starter

  return (
    <div style={{ padding: 28, maxWidth: 760 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Paramètres
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Configuration du workspace et de l&apos;organisation
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Workspace info */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>Workspace</p>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Nom', value: info?.workspace.name ?? '—' },
                { label: 'ID', value: WORKSPACE_ID, mono: true },
                { label: 'Langue par défaut', value: info?.workspace.language_default === 'fr' ? 'Français' : 'English' },
                { label: 'Créé le', value: info?.workspace.created_at ? new Date(info.workspace.created_at).toLocaleDateString('fr-CA') : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: row.mono ? 'monospace' : 'inherit', fontSize: row.mono ? 12 : 13 } as React.CSSProperties}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Organisation */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>Organisation</p>
              <span style={{
                background: `${plan.color}15`, border: `1px solid ${plan.color}35`,
                color: plan.color, fontSize: 11, fontWeight: 700, borderRadius: 5,
                padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {plan.label}
              </span>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Nom', value: info?.org.name ?? '—' },
                { label: 'Slug', value: info?.org.slug ?? '—', mono: true },
                { label: 'Langue par défaut', value: info?.org.language_default === 'fr' ? 'Français' : 'English' },
                { label: 'Ton', value: info?.org.tone === 'formal' ? 'Formel' : 'Informel' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: row.mono ? 'monospace' : 'inherit' } as React.CSSProperties}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Team members */}
          {info?.members && info.members.length > 0 && (
            <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                  Équipe ({info.members.length})
                </p>
              </div>
              <div>
                {info.members.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 18px',
                    borderBottom: i < info.members.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--surface-3)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
                      }}>
                        {(m.user?.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>
                          {m.user?.name ?? '—'}
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{m.user?.email}</p>
                      </div>
                    </div>
                    <span style={{
                      color: m.role === 'admin' ? '#3fb950' : m.role === 'approver' ? '#58a6ff' : 'var(--text-muted)',
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AI Operator config */}
          <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>Opérateur IA</p>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Modèle', value: 'Claude Haiku 4.5 (Anthropic)' },
                { label: 'Langue génération', value: 'Auto-détectée par compte' },
                { label: 'Ton', value: 'Formel professionnel' },
                { label: 'Longueur max', value: '150 mots' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Danger zone — Emergency Stop */}
          <section style={{
            background: 'rgba(248,81,73,0.04)',
            border: '1px solid rgba(248,81,73,0.2)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(248,81,73,0.15)' }}>
              <p style={{ color: '#f85149', fontSize: 13, fontWeight: 600 }}>Zone dangereuse</p>
            </div>
            <div style={{ padding: '20px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Arrêt d&apos;urgence
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
                    Bloque immédiatement toutes les actions de l&apos;opérateur IA.<br/>
                    Rejette les approbations en attente. Consigné dans l&apos;audit trail.
                  </p>
                </div>

                {stopDone ? (
                  <div style={{
                    background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
                    borderRadius: 8, padding: '9px 16px', color: '#f85149',
                    fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  }}>
                    🛑 Arrêt activé
                  </div>
                ) : confirmStop ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={emergencyStop}
                      disabled={stopping}
                      style={{
                        background: '#f85149', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '9px 16px', fontSize: 13,
                        fontWeight: 700, cursor: stopping ? 'not-allowed' : 'pointer',
                        opacity: stopping ? 0.7 : 1, whiteSpace: 'nowrap',
                      }}
                    >
                      {stopping ? 'Arrêt...' : 'Confirmer l\'arrêt'}
                    </button>
                    <button
                      onClick={() => setConfirmStop(false)}
                      style={{
                        background: 'transparent', border: '1px solid var(--border-2)',
                        borderRadius: 8, padding: '9px 14px', fontSize: 13,
                        color: 'var(--text-muted)', cursor: 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmStop(true)}
                    style={{
                      background: 'transparent', border: '1px solid rgba(248,81,73,0.4)',
                      borderRadius: 8, padding: '9px 16px', color: '#f85149',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Arrêt d&apos;urgence
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Version */}
          <p style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
            BASTION V1 · Collections Operator · Canada · ca-central-1
          </p>
        </div>
      )}
    </div>
  )
}
