import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createClient as createSupabaseServerSdkClient } from '@/utils/supabase/server'

function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  if (!value) throw new Error('Missing Supabase URL')
  return value
}

function getSupabasePublishableKey(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!value) throw new Error('Missing Supabase publishable key')
  return value
}

function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('Missing Supabase service role key')
  return value
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createSupabaseServerSdkClient(cookieStore)
}

export function createSupabaseServiceClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function getSupabasePublishableKeyForServer(): string {
  return getSupabasePublishableKey()
}

export function deriveAuthEmail(username: string): string {
  return `${Buffer.from(username, 'utf8').toString('base64url')}@germix.local`
}