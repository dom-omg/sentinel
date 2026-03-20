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
    const { data, error } = await db
      .from('approval_requests')
      .select(`
        *,
        drafts (*),
        ar_accounts (*)
      `)
      .eq('workspace_id', workspace_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ approvals: data })
  } catch (err) {
    console.error('[APPROVALS GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
