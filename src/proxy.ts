import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createClient(request, response)

  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
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
