import 'server-only';

import { createClient } from '@supabase/supabase-js';

const globalForSupabase = globalThis;

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY is not configured');
  if (!globalForSupabase.__closetSupabase) {
    globalForSupabase.__closetSupabase = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return globalForSupabase.__closetSupabase;
}

export function storageBucket() {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) throw new Error('SUPABASE_STORAGE_BUCKET is not configured');
  return bucket;
}
