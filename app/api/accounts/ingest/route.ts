import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'
import { computeBucket, computeRiskScore, computeRiskLevel, detectLanguage } from '@/lib/risk'
import { writeAudit } from '@/lib/audit'
import type { CSVRow } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin'])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { workspace_id, org_id, rows } = await req.json() as {
      workspace_id: string
      org_id: string
      rows: CSVRow[]
    }

    if (!workspace_id || !rows?.length) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const db = createServerClient()

    const accounts = rows.map(row => {
      const amount = typeof row.amount_owing === 'string'
        ? parseFloat(row.amount_owing.replace(/[$,\s]/g, ''))
        : row.amount_owing
      const days = typeof row.days_overdue === 'string'
        ? parseInt(row.days_overdue)
        : row.days_overdue

      const score = computeRiskScore(amount, days)
      const level = computeRiskLevel(score)
      const bucket = computeBucket(days)
      const lang = (row.client_language as 'fr' | 'en') ??
        detectLanguage(row.client_email, row.client_name)

      return {
        workspace_id,
        client_name: row.client_name,
        client_email: row.client_email ?? null,
        client_language: lang,
        amount_owing: amount,
        days_overdue: days,
        bucket,
        risk_level: level,
        risk_score: score,
        status: 'open' as const,
        source: 'csv' as const,
        invoice_number: row.invoice_number ?? null,
        notes: row.notes ?? null,
      }
    })

    const { data: inserted, error } = await db
      .from('ar_accounts')
      .insert(accounts)
      .select()

    if (error) throw error

    await writeAudit({
      workspace_id,
      org_id,
      event_type: 'account_ingested',
      actor_type: 'user',
      actor_id: auth!.sub,
      actor_name: auth!.name,
      detail: {
        count: inserted?.length ?? 0,
        source: 'csv',
      },
    })

    return NextResponse.json({
      ingested: inserted?.length ?? 0,
      accounts: inserted,
    })
  } catch (err) {
    console.error('[INGEST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
