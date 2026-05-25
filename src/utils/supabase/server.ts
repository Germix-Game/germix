import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  if (!value) throw new Error('Missing Supabase URL')
  return value
}

function getSupabasePublishableKey(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY
  if (!value) throw new Error('Missing Supabase publishable key')
  return value
}

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method can be called from a Server Component.
          // This is fine when middleware is refreshing sessions.
        }
      },
    },
  })
}