import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'sentinel-secret')

export interface AuthPayload {
  sub: string
  email: string
  name: string
  role: string
  org_id: string
  language: string
}

export async function getAuth(req: NextRequest): Promise<AuthPayload | null> {
  try {
    const token = req.cookies.get('sentinel_token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

export function requireAuth(auth: AuthPayload | null): auth is AuthPayload {
  return auth !== null
}

export function requireRole(auth: AuthPayload | null, roles: string[]): auth is AuthPayload {
  return auth !== null && roles.includes(auth.role)
}
