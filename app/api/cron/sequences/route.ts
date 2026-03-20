import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Vercel cron: runs daily at 9h UTC (5h EST)
// Generates follow-up drafts for accounts that have been sent and are past their follow-up window

const SEQUENCE_INTERVALS_DAYS: Record<number, number> = {
  1: 3,   // after #1 sent → wait 3 days → generate #2
  2: 7,   // after #2 sent → wait 7 days → generate #3
  3: 14,  // after #3 sent → wait 14 days → generate #4
  4: 30,  // after #4 sent → wait 30 days → final escalation
}
const MAX_SEQUENCE = 5

export async function GET(req: NextRequest) {
  try {
    // Auth: Vercel sets CRON_SECRET, or use manual secret check
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = req.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const db = createServerClient()

    // Get all sent accounts with their last draft sequence
    const { data: accounts } = await db
      .from('ar_accounts')
      .select('id, workspace_id, last_action_at')
      .eq('status', 'sent')

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No sent accounts' })
    }

    let generated = 0
    const errors: string[] = []

    for (const account of accounts) {
      try {
        // Get last draft for this account
        const { data: drafts } = await db
          .from('drafts')
          .select('sequence_number, created_at, status')
          .eq('account_id', account.id)
          .order('sequence_number', { ascending: false })
          .limit(1)

        const lastDraft = drafts?.[0]
        if (!lastDraft) continue

        const lastSeq = lastDraft.sequence_number
        if (lastSeq >= MAX_SEQUENCE) continue // max sequences reached

        // Check if last draft was sent (not just generated)
        if (lastDraft.status !== 'sent') continue

        // Check if enough time has passed
        const waitDays = SEQUENCE_INTERVALS_DAYS[lastSeq] ?? 30
        const lastActionAt = new Date(account.last_action_at ?? lastDraft.created_at)
        const daysSince = (Date.now() - lastActionAt.getTime()) / (1000 * 60 * 60 * 24)

        if (daysSince < waitDays) continue

        // Generate next draft via API (calls policy + draft generator internally)
        const origin = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'

        const res = await fetch(`${origin}/api/drafts/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Cron-Secret': cronSecret ?? '',
          },
          body: JSON.stringify({
            account_id: account.id,
            workspace_id: account.workspace_id,
            org_id: null,
            _cron: true,
          }),
        })

        if (res.ok) {
          generated++
        }
      } catch (e) {
        errors.push(String(e))
      }
    }

    return NextResponse.json({
      processed: accounts.length,
      generated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('[CRON SEQUENCES]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
