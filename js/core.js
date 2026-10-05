/* =====================================================================
   CORE — helper bersama (dipakai halaman publik & admin)
   ===================================================================== */
(function () {
  'use strict';

  /** Escape teks sebelum dimasukkan ke HTML (mencegah XSS). */
  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Hanya izinkan URL http(s), mailto, atau path relatif. Selain itu → ''. */
  function safeUrl(url) {
    const u = String(url ?? '').trim();
    if (!u || u === '#') return '';
    if (/^(https?:|mailto:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ''; // javascript:, data:, dll → tolak
    return u; // path relatif
  }

  /** Format teks sederhana → HTML aman.
   *  - Baris kosong  = paragraf baru
   *  - "- item"      = bullet list
   *  - **tebal**     = <strong>
   *  - `kode`        = <code>
   *  - Baris yang seluruhnya **Judul** = subjudul
   */
  function richText(text) {
    const inline = (s) => esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

    const blocks = String(text ?? '').replace(/\r\n/g, '\n').split(/\n\s*\n/);
    return blocks.map((block) => {
      const lines = block.split('\n').filter((l) => l.trim() !== '');
      if (!lines.length) return '';
      let html = '';
      let list = [];
      let para = [];
      const flushList = () => { if (list.length) { html += '<ul>' + list.map((l) => `<li>${inline(l)}</li>`).join('') + '</ul>'; list = []; } };
      const flushPara = () => { if (para.length) { html += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
      lines.forEach((line) => {
        const t = line.trim();
        const heading = t.match(/^\*\*(.+)\*\*$/);
        if (/^[-*•]\s+/.test(t)) { flushPara(); list.push(t.replace(/^[-*•]\s+/, '')); }
        else if (heading) { flushPara(); flushList(); html += `<h3>${esc(heading[1])}</h3>`; }
        else { flushList(); para.push(t); }
      });
      flushList(); flushPara();
      return html;
    }).join('');
  }

  const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

  /** Ambil semua konten: Supabase dulu, kalau gagal/ kosong → data.js */
  async function loadContent() {
    const fb = window.PORTFOLIO_FALLBACK || { profile: {}, projects: [], experiences: [], skill_groups: [] };
    const sb = window.supabaseClient;
    const result = {
      profile: { ...fb.profile },
      projects: [...fb.projects].filter((p) => p.published !== false).sort(bySort),
      experiences: [...fb.experiences].sort(bySort),
      skill_groups: [...fb.skill_groups].sort(bySort),
      source: 'local'
    };
    if (!sb) return result;

    try {
      const [prof, proj, exp, skills] = await Promise.all([
        sb.from('profile').select('*').eq('id', 1).maybeSingle(),
        sb.from('projects').select('*').eq('published', true).order('sort_order').order('created_at', { ascending: false }),
        sb.from('experiences').select('*').order('sort_order'),
        sb.from('skill_groups').select('*').order('sort_order')
      ]);
      const err = prof.error || proj.error || exp.error || skills.error;
      if (err) throw err;

      if (prof.data) {
        // Field yang kosong di database tetap memakai isi data.js (supaya tidak tampil kosong)
        const merged = { ...result.profile };
        Object.entries(prof.data).forEach(([k, v]) => {
          if (typeof v === 'boolean' || (v !== null && v !== '')) merged[k] = v;
        });
        result.profile = merged;
      }
      if (proj.data && proj.data.length) result.projects = proj.data;
      if (exp.data && exp.data.length) result.experiences = exp.data;
      if (skills.data && skills.data.length) result.skill_groups = skills.data;
      result.source = 'cloud';
    } catch (e) {
      console.warn('[portfolio] Gagal mengambil data dari Supabase, memakai konten lokal.', e);
    }
    return result;
  }

  async function loadProjectBySlug(slug) {
    const sb = window.supabaseClient;
    if (sb) {
      try {
        const { data, error } = await sb.from('projects').select('*').eq('slug', slug).maybeSingle();
        if (error) throw error;
        if (data) return data;
      } catch (e) {
        console.warn('[portfolio] Gagal memuat project dari Supabase.', e);
      }
    }
    const fb = window.PORTFOLIO_FALLBACK || { projects: [] };
    return fb.projects.find((p) => p.slug === slug) || null;
  }

  const STATUS_LABEL = { 'completed': 'Completed', 'in-progress': 'In progress', 'archived': 'Archived' };

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  window.Portfolio = { esc, safeUrl, richText, loadContent, loadProjectBySlug, STATUS_LABEL, slugify };
})();
