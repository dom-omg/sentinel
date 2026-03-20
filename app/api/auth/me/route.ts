import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'sentinel-secret')

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('bastion_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return NextResponse.json({ user: payload })
  } catch {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
  }
}
