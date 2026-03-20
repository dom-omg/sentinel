import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const workspace_id = searchParams.get('workspace_id')
    const status = searchParams.get('status')
    const bucket = searchParams.get('bucket')
    const risk_level = searchParams.get('risk_level')
    const search = searchParams.get('search')

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 })
    }

    const db = createServerClient()
    let query = db
      .from('ar_accounts')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('risk_score', { ascending: false })

    if (status) query = query.eq('status', status)
    if (bucket) query = query.eq('bucket', bucket)
    if (risk_level) query = query.eq('risk_level', risk_level)
    if (search) query = query.ilike('client_name', `%${search}%`)

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json({ accounts: data })
  } catch (err) {
    console.error('[ACCOUNTS GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
