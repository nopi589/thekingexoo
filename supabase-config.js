// supabase-config.js
//
// Replace the two values below with your own Supabase project's credentials.
// Find them in: Supabase dashboard → your project → Settings → API
//
// IMPORTANT: the "anon" key is safe to expose in frontend code — it's
// designed for that. Never put your "service_role" key here.

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'exoo-auth',
    storage: window.localStorage
  }
});
