import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuth, requireRole } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth(req)
    if (!requireRole(auth, ['admin', 'approver'])) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const { subject, body } = await req.json() as { subject?: string; body?: string }

    const db = createServerClient()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (subject !== undefined) updates.subject = subject
    if (body !== undefined) updates.edited_body = body

    const { data, error } = await db
      .from('drafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ draft: data })
  } catch (err) {
    console.error('[DRAFT PATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
