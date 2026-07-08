import { SignJWT, jwtVerify } from 'jose'

export type Role = 'admin' | 'viewer'

export interface AuthPayload {
  username: string
  role: Role
}

export const COOKIE_NAME = 'vd_session'
export const MAX_AGE = 28800 // 8 hours in seconds

function getSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET not set')
  return new TextEncoder().encode(s)
}

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return { username: payload.username as string, role: payload.role as Role }
  } catch {
    return null
  }
}

export function checkCredentials(username: string, password: string): 'admin' | null {
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) return 'admin'
  return null
}
