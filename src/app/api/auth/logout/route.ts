import { createErrorResponse } from '@/lib/api-error'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return createErrorResponse({
        status: 500,
        code: 'logout_failed',
        message: 'Unable to sign out right now.',
      })
    }

    return new Response(null, { status: 204 })
  } catch {
    return createErrorResponse({
      status: 500,
      code: 'logout_failed',
      message: 'Unable to sign out right now.',
    })
  }
}