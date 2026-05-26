import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

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

export function createClient(request: NextRequest, response: NextResponse) {
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
}