import { createClient } from '@supabase/supabase-js'

// Public values: the publishable key is meant for browsers; row-level security in
// supabase/schema.sql is what keeps each account's data private.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://hoosfjsgztarjfxdgnkt.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QJKBIlbTopr-60H4LfgVpg_tOCxbtrE'

export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null
