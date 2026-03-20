import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!auth) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const db = createServerClient()
    const { data: workspace } = await db
      .from('workspaces')
      .select('id')
      .eq('org_id', auth.org_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    return NextResponse.json({
      workspace_id: workspace?.id ?? process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? '',
      org_id: auth.org_id,
    })
  } catch (err) {
    console.error('[WORKSPACE ME]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
