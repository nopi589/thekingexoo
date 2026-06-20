// supabase-config.js
//
// Replace the two values below with your own Supabase project's credentials.
// Find them in: Supabase dashboard → your project → Settings → API
//
// IMPORTANT: the "anon" key is safe to expose in frontend code — it's
// designed for that. Never put your "service_role" key here.

const SUPABASE_URL = 'https://rrujosakztoeyoxxvltt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydWpvc2FrenRvZXlveHh2bHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NDU0MDQsImV4cCI6MjA5NzUyMTQwNH0.SZlU4pRO573scu-PVjsO53AE98SuCsT_zZHktJB4if4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'exoo-auth',
    storage: window.localStorage
  }
});
