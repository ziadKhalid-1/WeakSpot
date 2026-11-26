// supabase.js: the ONLY place the app creates the Supabase client.
//
// Values come from web/.env.local (see web/.env.example). Vite only exposes variables that start
// with VITE_ to the browser. This file uses the publishable (anon) key only: it is safe in the
// browser because row-level security decides what it can do. Never use the service_role key in web/.
//
// Key name: VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY (either works).
// Value: the publishable key (sb_publishable_...) or the legacy anon key (eyJ...).

import { createClient } from '@supabase/supabase-js';

// Trims spaces and surrounding quotes ("..." or '...') that often come along when pasting.
const clean = (v) => (v ?? '').trim().replace(/^(['"])(.*)\1$/, '$2').trim();

const url = clean(import.meta.env.VITE_SUPABASE_URL);
const key = clean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) || clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

const problems = [];
if (!url) problems.push('VITE_SUPABASE_URL is empty.');
else if (!/^https?:\/\/.+/.test(url)) problems.push('VITE_SUPABASE_URL must be your project URL (https://<ref>.supabase.co).');

if (!key) {
  problems.push('VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) is empty.');
} else if (/^https?:\/\//.test(key)) {
  // A URL can never work as a key: every request would be rejected.
  problems.push(
    'VITE_SUPABASE_PUBLISHABLE_KEY contains a URL, not a key. Paste the publishable key ' +
      '(sb_publishable_...) or the anon key (eyJ...) from Supabase > Project Settings > API Keys.',
  );
} else if (/^sb_secret_/.test(key)) {
  problems.push('VITE_SUPABASE_PUBLISHABLE_KEY is a SECRET key. Never put it in web/. Use the publishable key.');
}

if (problems.length) {
  console.error(
    `[supabase] web/.env.local is not set up correctly:\n- ${problems.join('\n- ')}\n` +
      'Fix it, then restart `npm run dev` (Vite reads .env.local only at startup).',
  );
}

// Shown on screen in dev only, so the developer sees exactly what to fix.
export const supabaseProblems = problems;

// null when the env is wrong, so the app still loads and shows its "not ready" message.
export const supabase = problems.length ? null : createClient(url, key);
