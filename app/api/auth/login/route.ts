import { NextResponse } from 'next/server'
import { checkCredentials, signToken, COOKIE_NAME, MAX_AGE } from '@/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json()
  const role = checkCredentials(username, password)
  if (!role) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }
  const token = await signToken({ username, role })
  const res = NextResponse.json({ ok: true, role })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/',
  })
  return res
}
