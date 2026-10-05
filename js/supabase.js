/* =====================================================================
   KONFIGURASI SUPABASE
   ---------------------------------------------------------------------
   Isi 2 nilai di bawah dari: Supabase Dashboard → Project Settings → API
   - SUPABASE_URL      : "Project URL"  (https://xxxx.supabase.co)
   - SUPABASE_ANON_KEY : "anon / publishable key"  (BUKAN service_role!)

   Anon/publishable key memang aman ditaruh di frontend, karena semua
   akses sudah dikunci oleh Row Level Security di supabase/schema.sql.
   JANGAN PERNAH menaruh "service_role" / "secret" key di file ini.

   Kalau dibiarkan kosong, website tetap jalan memakai isi js/data.js.
   ===================================================================== */
const SUPABASE_URL = 'https://gwsgqmsbqoulevkmcxhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3c2dxbXNicW91bGV2a21jeGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODA2MzMsImV4cCI6MjEwNjc1NjYzM30.fEADZaNUYDPJysquIHsgsrbSPwwUNwne0zsEFwK248Y';

/* ------------------------------------------------------------------ */
window.supabaseClient = null;

(function initSupabase() {
  // Rapikan URL kalau ikut tertempel "/rest/v1/" atau garis miring di akhir
  const url = SUPABASE_URL.trim().replace(/\/(rest|auth|storage)\/v1\/?.*$/i, '').replace(/\/+$/, '');
  const key = SUPABASE_ANON_KEY.trim();
  const configured = url.startsWith('https://') && key.length > 20;
  if (!configured) {
    console.info('[portfolio] Supabase belum dikonfigurasi — memakai konten lokal (js/data.js).');
    return;
  }
  if (typeof window.supabase === 'undefined') {
    console.error('[portfolio] Library Supabase tidak termuat (js/vendor/supabase.min.js).');
    return;
  }
  window.supabaseClient = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
})();
