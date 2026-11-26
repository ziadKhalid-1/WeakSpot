// supabaseAdmin.js: the server-only Supabase client (service_role, bypasses RLS).
// Never import this file from web/src: the key must never reach the browser.

import { createClient } from '@supabase/supabase-js';

let client = null;

export function supabaseConfigProblem() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url) return 'SUPABASE_URL is missing';
  if (!key) return 'SUPABASE_SERVICE_ROLE_KEY is missing';
  if (/^sb_publishable_/.test(key)) return 'SUPABASE_SERVICE_ROLE_KEY is a publishable key; use the secret / service_role key';
  return null;
}

export function admin() {
  if (client) return client;
  const problem = supabaseConfigProblem();
  if (problem) throw new Error(problem);
  client = createClient(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}

// True when the database has not run 002_add_explanation.sql yet.
export const isMissingExplanation = (error) =>
  !!error && (error.code === '42703' || error.code === 'PGRST204' || /explanation/i.test(error.message ?? ''));
