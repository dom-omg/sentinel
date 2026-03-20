import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { SignJWT } from 'jose'
import crypto from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'bastion-secret')

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, company_name } = await req.json() as {
      name: string
      email: string
      password: string
      company_name: string
    }

    if (!name || !email || !password || !company_name) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe: 8 caractères minimum' }, { status: 400 })
    }

    const db = createServerClient()

    // Check if email already exists
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
    const slug = company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) + '-' + Date.now().toString(36)

    // Create org
    const { data: org, error: orgErr } = await db
      .from('organizations')
      .insert({
        name: company_name,
        slug,
        language_default: 'fr',
        tone: 'formal',
        plan: 'starter',
      })
      .select()
      .single()

    if (orgErr || !org) throw orgErr ?? new Error('Org creation failed')

    // Create workspace
    const { data: workspace, error: wsErr } = await db
      .from('workspaces')
      .insert({
        org_id: org.id,
        name: company_name,
        language_default: 'fr',
      })
      .select()
      .single()

    if (wsErr || !workspace) throw wsErr ?? new Error('Workspace creation failed')

    // Create user (admin role)
    const { data: user, error: userErr } = await db
      .from('users')
      .insert({
        org_id: org.id,
        email: email.toLowerCase(),
        name,
        role: 'admin',
        language: 'fr',
        password_hash: passwordHash,
      })
      .select()
      .single()

    if (userErr || !user) throw userErr ?? new Error('User creation failed')

    // Add to workspace_members
    await db.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'admin',
    })

    // Sign JWT
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      org_id: user.org_id,
      language: user.language,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    // Store session
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    await db.from('sessions').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const res = NextResponse.json({ ok: true })
    res.cookies.set('bastion_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return res
  } catch (err) {
    console.error('[AUTH REGISTER]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
