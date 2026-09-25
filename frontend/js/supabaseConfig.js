/**
 * Supabase Frontend Configuration
 * Connects directly to Supabase REST API from static host (Netlify) & client browser.
 */

export const SUPABASE_URL = "https://nudrrscxzwycykcbzdoq.supabase.co";

// Public publishable anon key for browser clients
export const SUPABASE_ANON_KEY = "sb_publishable_ezrXBpGUakPsxiUslrR7cA_eheB7qTb";

export function getSupabaseHeaders() {
  const key = SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY__ || localStorage.getItem('grayko_supabase_anon_key') || '';
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact'
  };
}

export function isSupabaseClientConfigured() {
  const key = SUPABASE_ANON_KEY || window.__SUPABASE_ANON_KEY__ || localStorage.getItem('grayko_supabase_anon_key');
  return Boolean(SUPABASE_URL && key && key.trim().length > 10);
}
