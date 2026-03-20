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
}

function fmt(amount: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(amount)
}

function KPICard({ label, value, sub, accent }: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '18px 20px',
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ color: accent ?? 'var(--text-primary)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
        {value}
      </p>
      {sub && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{sub}</p>
      )}
    </div>
  )
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
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
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

  const totalRisk = kpis
    ? Object.values(kpis.accounts_by_risk).reduce((a, b) => a + b, 0)
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
            Collections Operator — {new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {kpis && kpis.pending_approvals > 0 && (
          <Link href="/dashboard/approvals" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(248, 81, 73, 0.1)',
            border: '1px solid rgba(248, 81, 73, 0.3)',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#f85149',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            animation: 'pulse 2s infinite',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f85149', display: 'inline-block' }} />
            {kpis.pending_approvals} approbation{kpis.pending_approvals > 1 ? 's' : ''} en attente
          </Link>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</div>
      ) : !kpis ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 40,
          textAlign: 'center',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 8 }}>Aucun workspace configuré</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Commencez par importer un rapport AR pour activer votre Collections Operator.
          </p>
          <Link href="/dashboard/upload" style={{
            display: 'inline-block',
            background: '#3fb950',
            color: '#fff',
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Importer un rapport AR
          </Link>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            <KPICard
              label="AR total en souffrance"
              value={fmt(kpis.total_ar)}
              sub={`${kpis.total_accounts} compte${kpis.total_accounts > 1 ? 's' : ''} actif${kpis.total_accounts > 1 ? 's' : ''}`}
              accent="var(--text-primary)"
            />
            <KPICard
              label="Montant récupéré"
              value={fmt(kpis.amount_recovered)}
              sub={`${kpis.resolved_total} compte${kpis.resolved_total > 1 ? 's' : ''} résolu${kpis.resolved_total > 1 ? 's' : ''}`}
              accent="#3fb950"
            />
            <KPICard
              label="Approbations en attente"
              value={String(kpis.pending_approvals)}
              sub="Actions requises"
              accent={kpis.pending_approvals > 0 ? '#f85149' : undefined}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            {/* Bucket breakdown */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '18px 20px',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Comptes par ancienneté
              </p>
              {(['30', '60', '90', '120+'] as const).map(b => (
                <RiskBar
                  key={b}
                  label={`${b} jours`}
                  count={kpis.accounts_by_bucket[b] ?? 0}
                  total={kpis.total_accounts}
                  color={b === '30' ? '#3fb950' : b === '60' ? '#e3b341' : b === '90' ? '#d29922' : '#f85149'}
                />
              ))}
            </div>

            {/* Risk breakdown */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '18px 20px',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Comptes par niveau de risque
              </p>
              <RiskBar label="Faible" count={kpis.accounts_by_risk.low ?? 0} total={totalRisk} color="#3fb950" />
              <RiskBar label="Moyen" count={kpis.accounts_by_risk.medium ?? 0} total={totalRisk} color="#e3b341" />
              <RiskBar label="Élevé" count={kpis.accounts_by_risk.high ?? 0} total={totalRisk} color="#d29922" />
              <RiskBar label="Critique" count={kpis.accounts_by_risk.critical ?? 0} total={totalRisk} color="#f85149" />
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/dashboard/upload" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: '#3fb950',
              color: '#fff',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              Importer AR
            </Link>
            <Link href="/dashboard/accounts" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              color: 'var(--text-primary)',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
            }}>
              Voir les comptes
            </Link>
            {kpis.pending_approvals > 0 && (
              <Link href="/dashboard/approvals" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: 'rgba(248, 81, 73, 0.1)',
                border: '1px solid rgba(248, 81, 73, 0.3)',
                color: '#f85149',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}>
                Traiter les approbations ({kpis.pending_approvals})
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
