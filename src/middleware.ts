import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

const PUBLIC_PATHS = new Set(['/', '/login/password'])
function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith('/api/auth/')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
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
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (Next.js image optimisation)
     * - /assets/* (game assets)
     * - favicon and other root-level static files
     */
    '/((?!_next/static|_next/image|assets/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
}
