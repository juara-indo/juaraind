// Kredensial dibaca dari file .env (lihat .env.example).
// JANGAN perlu menaruh kunci service-role di sini — hanya anon/public key.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

// Supabase dibuat secara dinamis saat dibutuhkan sehingga library tidak ikut bundle awal.
let supabasePromise

export async function getSupabase() {
  if (!isConfigured) return null
  if (!supabasePromise) {
    supabasePromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(url, anonKey))
  }
  return supabasePromise
}
