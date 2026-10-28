import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/supabase';

const isConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// Local-only mode: no cloud at all — accounts and data live only in this browser.
// Enabled with VITE_LOCAL_ONLY=true (development/testing) or automatically when Supabase isn't configured.
export const isLocalOnly = import.meta.env.VITE_LOCAL_ONLY === 'true' || !isConfigured;

if (isLocalOnly) {
  console.info(
    isConfigured
      ? '[Supabase] Modo somente local ativo (VITE_LOCAL_ONLY).'
      : '[Supabase] Projeto não configurado (src/config/supabase.ts) — rodando em modo somente local.'
  );
}

export const supabase: SupabaseClient | null = isLocalOnly
  ? null
  : createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

export const APP_STATE_TABLE = 'app_state';
