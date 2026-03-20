'use client'

import { useEffect, useState } from 'react'

const WORKSPACE_ID = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? ''

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

interface ReportData {
  emailsPerDay: { date: string; count: number }[]
  amountRecovered: number
  totalAR: number
  statusBreakdown: Record<string, number>
  riskBreakdown: Record<string, number>
  bucketBreakdown: Record<string, number>
  activityByWeek: { week: string; sent: number; approved: number; rejected: number; generated: number }[]
  recoveryRate: number
  totalSent: number
  totalAccounts: number
  resolved: number
}

function MiniBar({ value, max, color, label, sub }: { value: number; max: number; color: string; label: string; sub?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>
          {sub ?? value}
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function SparkBar({ data, color }: { data: { date: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56 }}>
      {data.map((d, i) => {
        const h = max > 0 ? Math.max(2, Math.round((d.count / max) * 56)) : 2
        const isToday = d.date === new Date().toISOString().slice(0, 10)
        return (
          <div
            key={i}
            title={`${d.date}: ${d.count}`}
            style={{
              flex: 1,
              height: h,
              background: isToday ? '#58a6ff' : d.count > 0 ? color : 'var(--surface-3)',
              borderRadius: 2,
              transition: 'height 0.4s ease',
              cursor: 'default',
            }}
          />
        )
      })}
    </div>
  )
}

function WeekChart({ data }: { data: ReportData['activityByWeek'] }) {
  if (data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Aucune donnée</p>
  const maxSent = Math.max(...data.map(d => d.sent), 1)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
        <thead>
          <tr>
            {['Semaine', 'Envoyés', 'Approuvés', 'Rejetés', 'Drafts'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Semaine' ? 'left' : 'right', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(-8).reverse().map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '9px 10px', color: 'var(--text-muted)', fontSize: 12 }}>
                {new Date(row.week).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <div style={{ width: Math.max(2, Math.round((row.sent / maxSent) * 60)), height: 4, background: '#3fb950', borderRadius: 2 }} />
                  <span style={{ color: '#3fb950', fontSize: 12, fontWeight: 600, minWidth: 18, textAlign: 'right' }}>{row.sent}</span>
                </div>
              </td>
              <td style={{ padding: '9px 10px', color: '#3fb950', fontSize: 12, fontWeight: row.approved > 0 ? 500 : 400, textAlign: 'right' }}>{row.approved || '—'}</td>
              <td style={{ padding: '9px 10px', color: row.rejected > 0 ? '#f85149' : 'var(--text-muted)', fontSize: 12, fontWeight: row.rejected > 0 ? 500 : 400, textAlign: 'right' }}>{row.rejected || '—'}</td>
              <td style={{ padding: '9px 10px', color: '#58a6ff', fontSize: 12, textAlign: 'right' }}>{row.generated || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!WORKSPACE_ID) { setLoading(false); return }
    fetch(`/api/reports?workspace_id=${WORKSPACE_ID}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 28 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</p>
      </div>
    )
  }

  const totalRisk = data ? Object.values(data.riskBreakdown).reduce((a, b) => a + b, 0) : 0
  const totalBucket = data ? Object.values(data.bucketBreakdown).reduce((a, b) => a + b, 0) : 0

  return (
    <div style={{ padding: 28, maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Rapports
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Performance et analytique des opérations de recouvrement
        </p>
      </div>

      {!data ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Aucune donnée disponible</p>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Emails envoyés', value: String(data.totalSent), color: '#3fb950' },
              { label: 'Comptes résolus', value: String(data.resolved), color: '#3fb950' },
              { label: 'Taux de récupération', value: `${data.recoveryRate}%`, color: data.recoveryRate > 20 ? '#3fb950' : 'var(--text-primary)' },
              { label: 'Montant récupéré', value: fmt(data.amountRecovered), color: data.amountRecovered > 0 ? '#3fb950' : 'var(--text-primary)' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{kpi.label}</p>
                <p style={{ color: kpi.color, fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Emails per day */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Emails envoyés — 30 derniers jours
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {data.emailsPerDay.reduce((s, d) => s + d.count, 0)} total
              </p>
            </div>
            <SparkBar data={data.emailsPerDay} color="#3fb950" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                {new Date(data.emailsPerDay[0]?.date ?? '').toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Aujourd&apos;hui</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Risk breakdown */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Distribution par risque
              </p>
              <MiniBar value={data.riskBreakdown.low ?? 0} max={totalRisk} color="#3fb950" label="Faible" />
              <MiniBar value={data.riskBreakdown.medium ?? 0} max={totalRisk} color="#e3b341" label="Moyen" />
              <MiniBar value={data.riskBreakdown.high ?? 0} max={totalRisk} color="#d29922" label="Élevé" />
              <MiniBar value={data.riskBreakdown.critical ?? 0} max={totalRisk} color="#f85149" label="Critique" />
            </div>

            {/* Bucket breakdown */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Distribution par ancienneté
              </p>
              <MiniBar value={data.bucketBreakdown['30'] ?? 0} max={totalBucket} color="#3fb950" label="0–30 jours" />
              <MiniBar value={data.bucketBreakdown['60'] ?? 0} max={totalBucket} color="#e3b341" label="31–60 jours" />
              <MiniBar value={data.bucketBreakdown['90'] ?? 0} max={totalBucket} color="#d29922" label="61–90 jours" />
              <MiniBar value={data.bucketBreakdown['120+'] ?? 0} max={totalBucket} color="#f85149" label="90+ jours" />
            </div>
          </div>

          {/* Status breakdown */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Comptes par statut
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { key: 'open', label: 'Ouverts', color: 'var(--text-muted)' },
                { key: 'draft_ready', label: 'Draft prêt', color: '#58a6ff' },
                { key: 'pending_approval', label: 'En attente', color: '#e3b341' },
                { key: 'sent', label: 'Envoyés', color: '#3fb950' },
                { key: 'resolved', label: 'Résolus', color: '#3fb950' },
                { key: 'escalated', label: 'Escaladés', color: '#d29922' },
                { key: 'blocked', label: 'Bloqués', color: '#f85149' },
              ].map(s => {
                const count = data.statusBreakdown[s.key] ?? 0
                if (count === 0) return null
                return (
                  <div key={s.key} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', minWidth: 100 }}>
                    <p style={{ color: s.color, fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{count}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Weekly activity */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
              Activité hebdomadaire — 8 dernières semaines
            </p>
            <WeekChart data={data.activityByWeek} />
          </div>
        </>
      )}
    </div>
  )
}
