import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? '')

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  try {
    await jwtVerify(token, getSecret())
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: [
    '/home/:path*',
    '/play/:path*',
    '/game-mode/:path*',
    '/pathogen-book/:path*',
    '/posttest/:path*',
    '/tutorial/:path*',
    '/leaderboard/:path*',
  ],
}
