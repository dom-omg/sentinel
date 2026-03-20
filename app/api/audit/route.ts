import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const workspace_id = searchParams.get('workspace_id')
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    if (!workspace_id) {
      return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 })
    }

    const db = createServerClient()
    const { data, error, count } = await db
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return NextResponse.json({ entries: data, total: count })
  } catch (err) {
    console.error('[AUDIT GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
