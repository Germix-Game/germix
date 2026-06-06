import { createBrowserClient } from '@supabase/ssr'

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

export const createClient = () =>
  createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey())