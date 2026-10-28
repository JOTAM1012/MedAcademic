// Supabase project connection (Dashboard → Project Settings → API Keys).
// The publishable key is public by design: it only allows what the RLS policies in
// supabase/schema.sql permit. NEVER put the secret / service_role key here.
// Environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) take precedence.
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || 'https://idjjapuweisuwmdyulxd.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_PKUr6VDzasHVf0skByRa2g_Vf4H2Wz6';
