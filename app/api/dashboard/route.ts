import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const workspace_id = searchParams.get('workspace_id')

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 })
    }

    const db = createServerClient()

    const [accountsRes, approvalsRes, sentRes, recentRes, resolvedWithDatesRes] = await Promise.all([
      db.from('ar_accounts').select('amount_owing, status, bucket, risk_level').eq('workspace_id', workspace_id),
      db.from('approval_requests').select('id').eq('workspace_id', workspace_id).eq('status', 'pending'),
      db.from('audit_log').select('detail').eq('workspace_id', workspace_id).eq('event_type', 'email_sent'),
      db.from('audit_log').select('event_type, actor_type, actor_name, created_at, detail')
        .eq('workspace_id', workspace_id)
        .order('created_at', { ascending: false })
        .limit(8),
      db.from('ar_accounts').select('created_at, last_action_at').eq('workspace_id', workspace_id).eq('status', 'resolved'),
    ])

    const accounts = accountsRes.data ?? []
    const totalAR = accounts.reduce((sum, a) => sum + (a.amount_owing ?? 0), 0)
    const openAccounts = accounts.filter(a => !['resolved'].includes(a.status))

    const byBucket = { '30': 0, '60': 0, '90': 0, '120+': 0 }
    const byRisk = { low: 0, medium: 0, high: 0, critical: 0 }
    for (const a of openAccounts) {
      if (a.bucket in byBucket) byBucket[a.bucket as keyof typeof byBucket]++
      if (a.risk_level in byRisk) byRisk[a.risk_level as keyof typeof byRisk]++
    }

    const resolved = accounts.filter(a => a.status === 'resolved')
    const amountRecovered = resolved.reduce((sum, a) => sum + (a.amount_owing ?? 0), 0)

    // Avg resolution time (days from created_at to last_action_at for resolved accounts)
    const resolvedWithDates = resolvedWithDatesRes.data ?? []
    let avgResolutionDays = 0
    if (resolvedWithDates.length > 0) {
      const totalDays = resolvedWithDates.reduce((sum, a) => {
        if (!a.last_action_at) return sum
        const days = (new Date(a.last_action_at).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)
        return sum + days
      }, 0)
      avgResolutionDays = Math.round(totalDays / resolvedWithDates.length)
    }

    // Response rate: resolved / (resolved + sent accounts)
    const sentAccounts = accounts.filter(a => a.status === 'sent').length
    const responseRate = (resolved.length + sentAccounts) > 0
      ? Math.round((resolved.length / (resolved.length + sentAccounts)) * 100)
      : 0

    return NextResponse.json({
      total_ar: totalAR,
      total_accounts: openAccounts.length,
      pending_approvals: approvalsRes.data?.length ?? 0,
      sent_total: sentRes.data?.length ?? 0,
      resolved_total: resolved.length,
      amount_recovered: amountRecovered,
      accounts_by_bucket: byBucket,
      accounts_by_risk: byRisk,
      recent_events: recentRes.data ?? [],
      avg_resolution_days: avgResolutionDays,
      response_rate: responseRate,
    })
  } catch (err) {
    console.error('[DASHBOARD]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
