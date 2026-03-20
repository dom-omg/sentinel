import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const workspace_id = searchParams.get('workspace_id')
    if (!workspace_id) return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 })

    const db = createServerClient()

    const { data: workspace } = await db
      .from('workspaces')
      .select('*')
      .eq('id', workspace_id)
      .single()

    if (!workspace) return NextResponse.json({ error: 'Workspace introuvable' }, { status: 404 })

    const [orgRes, membersRes] = await Promise.all([
      db.from('organizations').select('*').eq('id', workspace.org_id).single(),
      db.from('workspace_members')
        .select('role, user:users(name, email, role)')
        .eq('workspace_id', workspace_id),
    ])

    return NextResponse.json({
      workspace,
      org: orgRes.data,
      members: membersRes.data ?? [],
    })
  } catch (err) {
    console.error('[SETTINGS GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
