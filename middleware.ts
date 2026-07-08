import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'vd_session'

function getSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET not set')
  return new TextEncoder().encode(s)
}

function viewerResponse(req: NextRequest, clearCookie = false) {
  const res = NextResponse.next()
  res.headers.set('x-user-role', 'viewer')
  res.headers.set('x-username', 'invitado')
  if (clearCookie) res.cookies.delete(COOKIE_NAME)
  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip auth for these paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/diagrams/')
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return viewerResponse(req)
  }

  try {
    const { payload } = await jwtVerify(token, getSecret())
    const res = NextResponse.next()
    res.headers.set('x-user-role', String(payload.role))
    res.headers.set('x-username', String(payload.username))
    return res
  } catch {
    // Invalid token — clear cookie, continue as viewer
    return viewerResponse(req, true)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
