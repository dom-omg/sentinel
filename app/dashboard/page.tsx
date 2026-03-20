'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? ''

interface KPIs {
  total_ar: number
  total_accounts: number
  pending_approvals: number
  sent_total: number
  resolved_total: number
  amount_recovered: number
  accounts_by_bucket: Record<string, number>
  accounts_by_risk: Record<string, number>
  recent_events: Array<{ event_type: string; actor_type: string; actor_name?: string; created_at: string; detail: Record<string, unknown> }>
}

function fmt(amount: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(amount)
}
function fmtTime(s: string) {
  const d = new Date(s)
  const now = new Date()
  const diffM = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffM < 1) return 'à l\'instant'
  if (diffM < 60) return `il y a ${diffM}m`
  if (diffM < 1440) return `il y a ${Math.floor(diffM / 60)}h`
  return d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })
}

const EVENT_META: Record<string, { label: string; color: string; icon: string }> = {
  email_sent:        { label: 'Email envoyé',         color: '#3fb950', icon: '✉' },
  approved:          { label: 'Approuvé',              color: '#3fb950', icon: '✓' },
  draft_generated:   { label: 'Draft généré',          color: '#58a6ff', icon: '✦' },
  approval_requested:{ label: 'Approbation demandée',  color: '#e3b341', icon: '⏳' },
  rejected:          { label: 'Rejeté',                color: '#f85149', icon: '✕' },
  escalated:         { label: 'Escaladé',              color: '#d29922', icon: '↑' },
  account_ingested:  { label: 'Compte importé',        color: 'var(--text-muted)', icon: '↓' },
  blocked:           { label: 'Bloqué',                color: '#f85149', icon: '⊘' },
  emergency_stop:    { label: 'Arrêt d\'urgence',      color: '#f85149', icon: '🛑' },
  policy_evaluated:  { label: 'Politique évaluée',     color: 'var(--text-muted)', icon: '◈' },
}

function KPICard({ label, value, sub, accent, href }: {
  label: string; value: string; sub?: string; accent?: string; href?: string
}) {
  const inner = (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '18px 20px',
      transition: 'border-color 0.15s',
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ color: accent ?? 'var(--text-primary)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
        {value}
      </p>
      {sub && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{sub}</p>}
    </div>
  )
  return href ? (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
  ) : inner
}

function RiskBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>{count}</span>
      </div>
      <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!WORKSPACE_ID) { setLoading(false); return }
    fetch(`/api/dashboard?workspace_id=${WORKSPACE_ID}`)
      .then(r => r.json())
      .then(setKpis)
      .finally(() => setLoading(false))
  }, [])

  const totalRisk = kpis ? Object.values(kpis.accounts_by_risk).reduce((a, b) => a + b, 0) : 0
  const recoveryRate = kpis && (kpis.resolved_total + kpis.total_accounts) > 0
    ? Math.round((kpis.resolved_total / (kpis.resolved_total + kpis.total_accounts)) * 100)
    : 0

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Vue d&apos;ensemble
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {kpis && kpis.pending_approvals > 0 && (
          <Link href="/dashboard/approvals" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)',
            borderRadius: 8, padding: '8px 14px', color: '#f85149',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f85149', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            {kpis.pending_approvals} approbation{kpis.pending_approvals > 1 ? 's' : ''} en attente
          </Link>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</div>
      ) : !kpis ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 8 }}>Aucun workspace configuré</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Commencez par importer un rapport AR.
          </p>
          <Link href="/dashboard/upload" style={{ display: 'inline-block', background: '#3fb950', color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Importer un rapport AR
          </Link>
        </div>
      ) : (
        <>
          {/* KPI Grid — 4 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <KPICard
              label="AR en souffrance"
              value={fmt(kpis.total_ar)}
              sub={`${kpis.total_accounts} compte${kpis.total_accounts !== 1 ? 's' : ''} actif${kpis.total_accounts !== 1 ? 's' : ''}`}
            />
            <KPICard
              label="Emails envoyés"
              value={String(kpis.sent_total)}
              sub={`${kpis.resolved_total} compte${kpis.resolved_total !== 1 ? 's' : ''} résolu${kpis.resolved_total !== 1 ? 's' : ''}`}
              accent="#3fb950"
              href="/dashboard/audit"
            />
            <KPICard
              label="Taux de récupération"
              value={`${recoveryRate}%`}
              sub={kpis.amount_recovered > 0 ? `${fmt(kpis.amount_recovered)} récupéré` : 'Aucun compte résolu'}
              accent={recoveryRate > 20 ? '#3fb950' : 'var(--text-primary)'}
            />
            <KPICard
              label="Approbations en attente"
              value={String(kpis.pending_approvals)}
              sub={kpis.pending_approvals > 0 ? 'Action requise →' : 'Tout est traité'}
              accent={kpis.pending_approvals > 0 ? '#f85149' : '#3fb950'}
              href={kpis.pending_approvals > 0 ? '/dashboard/approvals' : undefined}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 340px', gap: 12, marginBottom: 20 }}>
            {/* Bucket breakdown */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Comptes par ancienneté
              </p>
              {(['30', '60', '90', '120+'] as const).map(b => (
                <RiskBar key={b} label={`${b} jours`} count={kpis.accounts_by_bucket[b] ?? 0} total={kpis.total_accounts}
                  color={b === '30' ? '#3fb950' : b === '60' ? '#e3b341' : b === '90' ? '#d29922' : '#f85149'} />
              ))}
            </div>

            {/* Risk breakdown */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Comptes par niveau de risque
              </p>
              <RiskBar label="Faible"    count={kpis.accounts_by_risk.low ?? 0}      total={totalRisk} color="#3fb950" />
              <RiskBar label="Moyen"     count={kpis.accounts_by_risk.medium ?? 0}   total={totalRisk} color="#e3b341" />
              <RiskBar label="Élevé"     count={kpis.accounts_by_risk.high ?? 0}     total={totalRisk} color="#d29922" />
              <RiskBar label="Critique"  count={kpis.accounts_by_risk.critical ?? 0} total={totalRisk} color="#f85149" />
            </div>

            {/* Activity feed */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Activité récente
              </p>
              {kpis.recent_events.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucune activité</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {kpis.recent_events.map((ev, i) => {
                    const meta = EVENT_META[ev.event_type] ?? { label: ev.event_type.replace(/_/g, ' '), color: 'var(--text-muted)', icon: '·' }
                    return (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 22, height: 22, flexShrink: 0, borderRadius: '50%',
                          background: `${meta.color}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, marginTop: 1,
                        }}>
                          {meta.icon}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ color: meta.color, fontSize: 11, fontWeight: 500 }}>{meta.label}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                            {ev.actor_name ?? (ev.actor_type === 'omni' ? 'OMNI AI' : 'système')} · {fmtTime(ev.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {kpis.recent_events.length > 0 && (
                <Link href="/dashboard/audit" style={{ display: 'block', marginTop: 14, color: 'var(--text-muted)', fontSize: 11, textDecoration: 'none' }}>
                  Voir l&apos;audit complet →
                </Link>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/dashboard/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#3fb950', color: '#030608', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Importer AR
            </Link>
            <Link href="/dashboard/accounts" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-primary)', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              Comptes AR
            </Link>
            {kpis.pending_approvals > 0 && (
              <Link href="/dashboard/approvals" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)', color: '#f85149', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Traiter les approbations ({kpis.pending_approvals})
              </Link>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
