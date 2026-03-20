import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req)
    if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const db = createServerClient()

    const { data: account, error: accErr } = await db
      .from('ar_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (accErr || !account) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
    }

    const [draftsRes, auditRes] = await Promise.all([
      db.from('drafts')
        .select('*, approval:approval_requests(*)')
        .eq('account_id', id)
        .order('created_at', { ascending: false }),
      db.from('audit_log')
        .select('*')
        .eq('account_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    return NextResponse.json({
      account,
      drafts: draftsRes.data ?? [],
      audit: auditRes.data ?? [],
    })
  } catch (err) {
    console.error('[ACCOUNT GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
