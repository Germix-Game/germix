import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

const PUBLIC_PATHS = new Set(['/', '/login/password'])
function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname)
}

export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // API routes authenticate themselves (requireAuth/getOptionalPlayer) and
  // return a JSON 401 rather than an HTML redirect, so a redirect here would
  // be wrong for a fetch() caller anyway. Skipping this avoids a second
  // network round-trip to Supabase Auth on top of the one the route handler
  // already makes — every API call was previously paying for auth.getUser()
  // twice.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createClient(request, response)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Authenticated user hitting login → send them to the app
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Unauthenticated user hitting a protected path → send them to login
  if (!user && !isPublic(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|assets/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
}
