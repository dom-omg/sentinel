import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin', 'approver', 'viewer'])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const workspace_id = searchParams.get('workspace_id')
    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 })
    }

    const db = createServerClient()

    // Last 30 days range
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    // Parallel queries
    const [
      { data: auditSent },
      { data: accounts },
      { data: auditAll },
    ] = await Promise.all([
      db
        .from('audit_log')
        .select('created_at, detail')
        .eq('workspace_id', workspace_id)
        .eq('event_type', 'email_sent')
        .gte('created_at', since30)
        .order('created_at', { ascending: true }),
      db
        .from('ar_accounts')
        .select('status, risk_level, bucket, amount_owing, created_at')
        .eq('workspace_id', workspace_id),
      db
        .from('audit_log')
        .select('created_at, event_type')
        .eq('workspace_id', workspace_id)
        .gte('created_at', since90)
        .order('created_at', { ascending: true }),
    ])

    // --- Emails sent per day (last 30 days) ---
    const sentByDay: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      sentByDay[d.toISOString().slice(0, 10)] = 0
    }
    for (const row of auditSent ?? []) {
      const day = row.created_at.slice(0, 10)
      if (day in sentByDay) sentByDay[day]++
    }
    const emailsPerDay = Object.entries(sentByDay).map(([date, count]) => ({ date, count }))

    // --- AR recovered: sum amount_owing for resolved accounts ---
    const allAccounts = accounts ?? []
    const amountRecovered = allAccounts
      .filter(a => a.status === 'resolved')
      .reduce((sum, a) => sum + (a.amount_owing ?? 0), 0)

    const totalAR = allAccounts
      .filter(a => !['resolved'].includes(a.status))
      .reduce((sum, a) => sum + (a.amount_owing ?? 0), 0)

    // --- Status breakdown ---
    const statusBreakdown: Record<string, number> = {}
    for (const a of allAccounts) {
      statusBreakdown[a.status] = (statusBreakdown[a.status] ?? 0) + 1
    }

    // --- Risk breakdown ---
    const riskBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    for (const a of allAccounts) {
      if (a.risk_level in riskBreakdown) riskBreakdown[a.risk_level]++
    }

    // --- Bucket breakdown ---
    const bucketBreakdown: Record<string, number> = { '30': 0, '60': 0, '90': 0, '120+': 0 }
    for (const a of allAccounts) {
      if (a.bucket in bucketBreakdown) bucketBreakdown[a.bucket]++
    }

    // --- Activity by week (last 90 days) ---
    interface WeekEntry { week: string; sent: number; approved: number; rejected: number; generated: number }
    const weekMap: Record<string, WeekEntry> = {}
    const getWeek = (d: string) => {
      const date = new Date(d)
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(date.setDate(diff))
      return monday.toISOString().slice(0, 10)
    }
    for (const row of auditAll ?? []) {
      const week = getWeek(row.created_at)
      if (!weekMap[week]) weekMap[week] = { week, sent: 0, approved: 0, rejected: 0, generated: 0 }
      if (row.event_type === 'email_sent') weekMap[week].sent++
      if (row.event_type === 'approved') weekMap[week].approved++
      if (row.event_type === 'rejected') weekMap[week].rejected++
      if (row.event_type === 'draft_generated') weekMap[week].generated++
    }
    const activityByWeek = Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week))

    // --- Recovery rate ---
    const total = allAccounts.length
    const resolved = allAccounts.filter(a => a.status === 'resolved').length
    const recoveryRate = total > 0 ? Math.round((resolved / total) * 100) : 0

    // --- Total emails sent ---
    const totalSent = allAccounts.filter(a => ['sent', 'resolved'].includes(a.status)).length

    return NextResponse.json({
      emailsPerDay,
      amountRecovered,
      totalAR,
      statusBreakdown,
      riskBreakdown,
      bucketBreakdown,
      activityByWeek,
      recoveryRate,
      totalSent,
      totalAccounts: total,
      resolved,
    })
  } catch (err) {
    console.error('[REPORTS]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
