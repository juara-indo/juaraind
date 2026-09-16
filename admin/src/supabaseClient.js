import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isConfigured = Boolean(url && anonKey)
const client = isConfigured ? createClient(url, anonKey) : null
export const getSupabase = () => client
