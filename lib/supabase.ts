import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const SUPABASE_ENABLED = !!(url && anonKey);
export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;

if (!SUPABASE_ENABLED) {
  console.warn('Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = SUPABASE_ENABLED ? createClient(url, anonKey) : (null as any);