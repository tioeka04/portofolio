/* =====================================================================
   ADMIN CMS
   - Login: Supabase Auth (email + password)
   - Hak edit: hanya user yang terdaftar di tabel admin_users (cek is_admin())
   - Keamanan sebenarnya ada di database (RLS). File ini hanya UI.
   ===================================================================== */
(function () {
  'use strict';
  const { esc, safeUrl, slugify } = window.Portfolio;
  const sb = window.supabaseClient;
  const BUCKET = 'portfolio';
  const MAX_UPLOAD = 5 * 1024 * 1024;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const state = { projects: [], experiences: [], skill_groups: [], messages: [], profile: null };

  /* =================================================================
     FIELD DEFINITIONS (form dibangun otomatis dari daftar ini)
     ================================================================= */
  const PROJECT_FIELDS = [
    { key: 'title', label: 'Judul project', type: 'text', required: true, max: 150 },
    { key: 'slug', label: 'Slug (URL)', type: 'text', required: true, max: 80, hint: 'Otomatis dari judul. Dipakai di link: project.html?slug=…  Hanya huruf kecil, angka, tanda minus.' },
    { key: 'summary', label: 'Ringkasan singkat (tampil di kartu)', type: 'textarea', rows: 3, required: true, max: 400 },
    { key: 'description', label: 'Case study / deskripsi lengkap', type: 'textarea', rows: 12,
      hint: 'Format: baris kosong = paragraf baru · "- teks" = bullet · **tebal** · `kode` · baris berisi **Judul** saja = subjudul. Saran isi: Problem → Solusi → Arsitektur → Peran kamu → Hasil.' },
    { type: 'row', fields: [
      { key: 'role', label: 'Peran kamu', type: 'text', placeholder: 'mis. Backend developer (solo)' },
      { key: 'category', label: 'Kategori', type: 'text', list: 'category-options', placeholder: 'Backend / Full Stack / AI / ML' }
    ] },
    { type: 'row', fields: [
      { key: 'status', label: 'Status', type: 'select', options: [['completed', 'Completed'], ['in-progress', 'In progress'], ['archived', 'Archived']] },
      { key: 'year', label: 'Tahun', type: 'number', min: 2000, max: 2100 }
    ] },
    { key: 'tech_stack', label: 'Tech stack', type: 'list', hint: 'Pisahkan dengan koma. mis. Node.js, PostgreSQL, Docker' },
    { key: 'highlights', label: 'Highlight / pencapaian', type: 'lines', rows: 4, hint: 'Satu poin per baris. Pakai angka kalau ada (mis. "Response time turun 40%").' },
    { type: 'row', fields: [
      { key: 'repo_url', label: 'Link source code (GitHub)', type: 'url', placeholder: 'https://github.com/…' },
      { key: 'demo_url', label: 'Link live demo', type: 'url', placeholder: 'https://…' }
    ] },
    { key: 'image_url', label: 'Gambar / screenshot', type: 'upload', accept: 'image/png,image/jpeg,image/webp,image/gif', folder: 'projects', hint: 'Maks 5 MB. Rasio 16:9 paling bagus (mis. 1280×720).' },
    { type: 'row', fields: [
      { key: 'published', label: 'Tampilkan di website (published)', type: 'checkbox' },
      { key: 'featured', label: 'Featured (tampil paling atas)', type: 'checkbox' }
    ] }
  ];

  const EXPERIENCE_FIELDS = [
    { key: 'kind', label: 'Jenis', type: 'select', options: [['work', 'Kerja / Magang / Freelance'], ['education', 'Pendidikan'], ['organization', 'Organisasi'], ['certification', 'Sertifikasi']] },
    { key: 'title', label: 'Posisi / gelar', type: 'text', required: true, max: 150, placeholder: 'mis. Backend Developer Intern' },
    { type: 'row', fields: [
      { key: 'organization', label: 'Perusahaan / institusi', type: 'text' },
      { key: 'location', label: 'Lokasi', type: 'text' }
    ] },
    { type: 'row', fields: [
      { key: 'start_label', label: 'Mulai', type: 'text', placeholder: 'mis. Sep 2022' },
      { key: 'end_label', label: 'Selesai', type: 'text', placeholder: 'Kosongkan = Present' }
    ] },
    { key: 'description', label: 'Deskripsi singkat', type: 'textarea', rows: 3 },
    { key: 'highlights', label: 'Poin pencapaian', type: 'lines', rows: 4, hint: 'Satu poin per baris. Mulai dengan kata kerja: Built…, Designed…, Reduced…' }
  ];

  const SKILL_FIELDS = [
    { key: 'category', label: 'Nama kelompok', type: 'text', required: true, placeholder: 'mis. Backend' },
    { key: 'items', label: 'Skill', type: 'list', hint: 'Pisahkan dengan koma.' }
  ];

  const PROFILE_FIELDS = [
    { type: 'row', fields: [
      { key: 'name', label: 'Nama lengkap', type: 'text', required: true },
      { key: 'headline', label: 'Headline / role', type: 'text', placeholder: 'Backend & Full Stack Developer' }
    ] },
    { key: 'bio', label: 'Bio singkat', type: 'textarea', rows: 5, max: 800, hint: '2–4 kalimat: siapa kamu, fokus kamu, apa yang membedakan kamu.' },
    { type: 'row', fields: [
      { key: 'email', label: 'Email publik', type: 'email' },
      { key: 'location', label: 'Lokasi', type: 'text', placeholder: 'mis. Jakarta, Indonesia' }
    ] },
    { type: 'row', fields: [
      { key: 'github_url', label: 'GitHub URL', type: 'url' },
      { key: 'linkedin_url', label: 'LinkedIn URL', type: 'url' }
    ] },
    { key: 'avatar_url', label: 'Foto profil', type: 'upload', accept: 'image/png,image/jpeg,image/webp', folder: 'profile', hint: 'Foto persegi, wajah jelas, latar polos.' },
    { key: 'resume_url', label: 'CV (PDF)', type: 'upload', accept: 'application/pdf', folder: 'resume', hint: 'Kalau diisi, tombol "Resume" di website mengunduh PDF ini. Kalau kosong, pakai halaman cv.html otomatis.' },
    { key: 'open_to_work', label: 'Tampilkan badge "Open to internships & junior roles"', type: 'checkbox' }
  ];

  /* =================================================================
     FORM BUILDER
     ================================================================= */
  function flatFields(fields) {
    return fields.flatMap((f) => (f.type === 'row' ? f.fields : [f]));
  }

  function fieldHtml(f, v) {
    if (f.type === 'row') return `<div class="grid-2">${f.fields.map((x) => fieldHtml(x, v)).join('')}</div>`;
    const id = `f-${f.key}`;
    const val = v[f.key];
    const req = f.required ? ' required' : '';
    const max = f.max ? ` maxlength="${f.max}"` : '';
    const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
    const hint = f.hint ? `<div class="hint">${esc(f.hint)}</div>` : '';
    const counter = f.max && f.type === 'textarea' ? `<span class="counter" data-for="${id}"></span>` : '';
    const label = `<label for="${id}">${esc(f.label)}${f.required ? ' *' : ''}${counter}</label>`;

    switch (f.type) {
      case 'checkbox':
        return `<label class="check"><input type="checkbox" id="${id}" ${val ? 'checked' : ''}> ${esc(f.label)}</label>`;
      case 'textarea':
        return `<div class="field">${label}<textarea id="${id}" rows="${f.rows || 4}"${req}${max}${ph}>${esc(val ?? '')}</textarea>${hint}</div>`;
      case 'lines':
        return `<div class="field">${label}<textarea id="${id}" rows="${f.rows || 4}"${ph}>${esc((val || []).join('\n'))}</textarea>${hint}</div>`;
      case 'list':
        return `<div class="field">${label}<input id="${id}" type="text" value="${esc((val || []).join(', '))}"${ph}>${hint}</div>`;
      case 'select':
        return `<div class="field">${label}<select id="${id}">${f.options.map(([o, l]) => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${hint}</div>`;
      case 'number':
        return `<div class="field">${label}<input id="${id}" type="number" value="${esc(val ?? '')}" ${f.min ? `min="${f.min}"` : ''} ${f.max ? `max="${f.max}"` : ''}${ph}>${hint}</div>`;
      case 'upload': {
        const url = safeUrl(val);
        const isPdf = (f.accept || '').includes('pdf');
        const preview = isPdf
          ? `<a id="${id}-preview" href="${esc(url)}" target="_blank" rel="noopener" ${url ? '' : 'hidden'}>Lihat file saat ini ↗</a>`
          : `<img id="${id}-preview" src="${esc(url)}" alt="" ${url ? '' : 'hidden'}>`;
        return `<div class="field">${label}
          <div class="upload">
            ${preview}
            <input type="file" id="${id}-file" accept="${esc(f.accept)}" data-folder="${esc(f.folder)}" data-target="${id}">
          </div>
          <input id="${id}" type="url" value="${esc(val ?? '')}" placeholder="…atau tempel URL" style="margin-top:8px">
          ${hint}</div>`;
      }
      default:
        return `<div class="field">${label}<input id="${id}" type="${f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'}" value="${esc(val ?? '')}"${req}${max}${ph}${f.list ? ` list="${f.list}"` : ''}>${hint}</div>`;
    }
  }

  function renderForm(container, fields, values) {
    container.innerHTML = fields.map((f) => fieldHtml(f, values || {})).join('');

    // datalist kategori project
    if (flatFields(fields).some((f) => f.list === 'category-options')) {
      const cats = [...new Set(['Backend', 'Full Stack', 'Frontend', 'AI / ML', 'Data', 'Mobile', ...state.projects.map((p) => p.category).filter(Boolean)])];
      container.insertAdjacentHTML('beforeend', `<datalist id="category-options">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`);
    }

    // counter karakter
    $$('.counter', container).forEach((c) => {
      const input = $('#' + c.dataset.for, container);
      const update = () => { c.textContent = `${input.value.length}/${input.maxLength}`; };
      input.addEventListener('input', update); update();
    });

    // upload file → Supabase Storage
    $$('input[type="file"]', container).forEach((inp) => {
      inp.addEventListener('change', async () => {
        const file = inp.files[0];
        if (!file) return;
        if (file.size > MAX_UPLOAD) { toast('File terlalu besar (maks 5 MB).', true); inp.value = ''; return; }
        const target = $('#' + inp.dataset.target, container);
        const preview = $('#' + inp.dataset.target + '-preview', container);
        inp.disabled = true;
        toast('Mengunggah…');
        try {
          const url = await uploadFile(file, inp.dataset.folder);
          target.value = url;
          if (preview) { if (preview.tagName === 'IMG') preview.src = url; else preview.href = url; preview.hidden = false; }
          toast('File terunggah. Jangan lupa klik Simpan.');
        } catch (e) {
          console.error(e);
          toast('Upload gagal: ' + (e.message || e), true);
        } finally {
          inp.disabled = false; inp.value = '';
        }
      });
    });
  }

  function readForm(container, fields) {
    const out = {};
    flatFields(fields).forEach((f) => {
      const el = $('#f-' + f.key, container);
      if (!el) return;
      switch (f.type) {
        case 'checkbox': out[f.key] = el.checked; break;
        case 'number': out[f.key] = el.value === '' ? null : parseInt(el.value, 10); break;
        case 'list': out[f.key] = el.value.split(',').map((s) => s.trim()).filter(Boolean); break;
        case 'lines': out[f.key] = el.value.split('\n').map((s) => s.trim()).filter(Boolean); break;
        default: out[f.key] = el.value.trim();
      }
    });
    return out;
  }

  function validate(values, fields) {
    for (const f of flatFields(fields)) {
      const v = values[f.key];
      if (f.required && (v === '' || v == null)) return `"${f.label}" wajib diisi.`;
      if ((f.type === 'url' || f.type === 'upload') && v && !/^https?:\/\//i.test(v)) return `"${f.label}" harus diawali https://`;
      if (f.type === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return `"${f.label}" bukan email yang valid.`;
    }
    if ('slug' in values && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.slug)) return 'Slug hanya boleh huruf kecil, angka, dan tanda minus (mis. my-project).';
    return null;
  }

  /* =================================================================
     STORAGE
     ================================================================= */
  async function uploadFile(file, folder) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'file';
    const path = `${folder}/${Date.now()}-${base}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function removeStoredFile(url) {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const i = String(url || '').indexOf(marker);
    if (i === -1) return;
    const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
    await sb.storage.from(BUCKET).remove([path]).catch(() => {});
  }

  /* =================================================================
     UI HELPERS
     ================================================================= */
  let toastTimer;
  function toast(msg, isError = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 6000 : 3000);
  }

  function friendlyError(error) {
    if (!error) return 'Terjadi kesalahan.';
    if (error.code === '23505') return 'Data dengan nilai yang sama sudah ada (mis. slug project sudah dipakai).';
    if (error.code === '42501' || /row-level security/i.test(error.message)) return 'Akses ditolak. Pastikan akun kamu terdaftar di tabel admin_users.';
    if (error.code === '23514') return 'Ada isian yang tidak memenuhi aturan (mis. terlalu panjang / format salah).';
    return error.message || String(error);
  }

  function show(view) {
    ['setup', 'login', 'app'].forEach((v) => { $('#view-' + v).hidden = v !== view; });
  }

  /* =================================================================
     EDITOR DIALOG (project / pengalaman / skill)
     ================================================================= */
  const dialog = $('#editor');
  const dialogForm = $('#editor-form');
  let dialogHandler = null;

  function openEditor(title, fields, values, onSave) {
    $('#editor-title').textContent = title;
    $('#editor-alert').hidden = true;
    renderForm($('#editor-fields'), fields, values);
    dialogHandler = { fields, onSave };
    dialog.showModal();
    const first = $('#editor-fields input, #editor-fields textarea, #editor-fields select');
    if (first) first.focus();
  }

  dialogForm.addEventListener('submit', async (e) => {
    if (!e.submitter || e.submitter.value !== 'save') return; // tombol batal → tutup biasa
    e.preventDefault();
    const { fields, onSave } = dialogHandler;
    const values = readForm($('#editor-fields'), fields);
    const err = validate(values, fields);
    const alertEl = $('#editor-alert');
    if (err) { alertEl.textContent = err; alertEl.hidden = false; return; }
    const saveBtn = $('#editor-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan…';
    try {
      await onSave(values);
      dialog.close();
      toast('Tersimpan ✓');
    } catch (ex) {
      console.error(ex);
      alertEl.textContent = friendlyError(ex);
      alertEl.hidden = false;
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = 'Simpan';
    }
  });

  /* =================================================================
     GENERIC CRUD
     ================================================================= */
  const TABLE_ORDER = { projects: true, experiences: true, skill_groups: true };

  async function fetchTable(table) {
    let q = sb.from(table).select('*');
    if (TABLE_ORDER[table]) q = q.order('sort_order').order('created_at', { ascending: false });
    else q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    state[table] = data || [];
    return state[table];
  }

  async function saveRow(table, id, values) {
    if (id) {
      const { error } = await sb.from(table).update(values).eq('id', id);
      if (error) throw error;
    } else {
      const maxOrder = Math.max(0, ...state[table].map((r) => r.sort_order || 0));
      const { error } = await sb.from(table).insert({ ...values, sort_order: maxOrder + 1 });
      if (error) throw error;
    }
  }

  async function deleteRow(table, id) {
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  async function moveRow(table, id, dir) {
    const rows = [...state[table]];
    const i = rows.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    const updates = rows
      .map((r, idx) => ({ id: r.id, sort_order: idx + 1, changed: r.sort_order !== idx + 1 }))
      .filter((r) => r.changed);
    await Promise.all(updates.map((u) => sb.from(table).update({ sort_order: u.sort_order }).eq('id', u.id)
      .then(({ error }) => { if (error) throw error; })));
  }

  function orderButtons(table, id, idx, len) {
    return `
      <button class="btn btn-outline btn-sm" data-act="up" data-table="${table}" data-id="${esc(id)}" ${idx === 0 ? 'disabled' : ''} aria-label="Naikkan">↑</button>
      <button class="btn btn-outline btn-sm" data-act="down" data-table="${table}" data-id="${esc(id)}" ${idx === len - 1 ? 'disabled' : ''} aria-label="Turunkan">↓</button>`;
  }

  /* =================================================================
     PROJECTS
     ================================================================= */
  function renderProjectsAdmin() {
    const el = $('#projects-admin-list');
    const rows = state.projects;
    if (!rows.length) { el.innerHTML = '<div class="empty">Belum ada project. Klik "+ Project baru".</div>'; return; }
    el.innerHTML = rows.map((p, i) => {
      const img = safeUrl(p.image_url);
      return `
      <div class="row">
        ${img ? `<img class="thumb" src="${esc(img)}" alt="">` : '<div class="thumb"></div>'}
        <div>
          <div class="row-title">${esc(p.title)}
            <span class="pill ${p.published ? 'on' : ''}">${p.published ? 'Published' : 'Draft'}</span>
            ${p.featured ? '<span class="pill accent">Featured</span>' : ''}
            ${p.status === 'in-progress' ? '<span class="pill warn">In progress</span>' : ''}
          </div>
          <div class="row-sub">${esc([p.category, p.year, (p.tech_stack || []).join(', ')].filter(Boolean).join(' · '))}</div>
        </div>
        <div class="row-actions">
          ${orderButtons('projects', p.id, i, rows.length)}
          <a class="btn btn-outline btn-sm" href="project.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Lihat</a>
          <button class="btn btn-outline btn-sm" data-act="edit" data-table="projects" data-id="${esc(p.id)}">Edit</button>
          <button class="btn btn-danger btn-sm" data-act="delete" data-table="projects" data-id="${esc(p.id)}">Hapus</button>
        </div>
      </div>`;
    }).join('');
  }

  function editProject(p) {
    const isNew = !p;
    const values = p || { status: 'completed', published: true, featured: false, year: new Date().getFullYear() };
    openEditor(isNew ? 'Project baru' : 'Edit project', PROJECT_FIELDS, values, async (v) => {
      await saveRow('projects', p && p.id, v);
      if (p && p.image_url && p.image_url !== v.image_url) await removeStoredFile(p.image_url);
      await fetchTable('projects'); renderProjectsAdmin();
    });
    // slug otomatis mengikuti judul (selama slug belum diubah manual)
    const title = $('#f-title'), slug = $('#f-slug');
    let manual = !isNew;
    slug.addEventListener('input', () => { manual = true; });
    title.addEventListener('input', () => { if (!manual) slug.value = slugify(title.value); });
  }

  /* =================================================================
     EXPERIENCES & SKILLS
     ================================================================= */
  const KIND = { work: 'Kerja', education: 'Pendidikan', organization: 'Organisasi', certification: 'Sertifikasi' };

  function renderExperiencesAdmin() {
    const el = $('#experiences-admin-list');
    const rows = state.experiences;
    if (!rows.length) { el.innerHTML = '<div class="empty">Belum ada data.</div>'; return; }
    el.innerHTML = rows.map((x, i) => `
      <div class="row no-thumb">
        <div>
          <div class="row-title">${esc(x.title)} <span class="pill">${esc(KIND[x.kind] || x.kind)}</span></div>
          <div class="row-sub">${esc([x.organization, [x.start_label, x.start_label ? (x.end_label || 'Present') : x.end_label].filter(Boolean).join(' – ')].filter(Boolean).join(' · '))}</div>
        </div>
        <div class="row-actions">
          ${orderButtons('experiences', x.id, i, rows.length)}
          <button class="btn btn-outline btn-sm" data-act="edit" data-table="experiences" data-id="${esc(x.id)}">Edit</button>
          <button class="btn btn-danger btn-sm" data-act="delete" data-table="experiences" data-id="${esc(x.id)}">Hapus</button>
        </div>
      </div>`).join('');
  }

  function renderSkillsAdmin() {
    const el = $('#skills-admin-list');
    const rows = state.skill_groups;
    if (!rows.length) { el.innerHTML = '<div class="empty">Belum ada data.</div>'; return; }
    el.innerHTML = rows.map((g, i) => `
      <div class="row no-thumb">
        <div>
          <div class="row-title">${esc(g.category)}</div>
          <div class="row-sub">${esc((g.items || []).join(', '))}</div>
        </div>
        <div class="row-actions">
          ${orderButtons('skill_groups', g.id, i, rows.length)}
          <button class="btn btn-outline btn-sm" data-act="edit" data-table="skill_groups" data-id="${esc(g.id)}">Edit</button>
          <button class="btn btn-danger btn-sm" data-act="delete" data-table="skill_groups" data-id="${esc(g.id)}">Hapus</button>
        </div>
      </div>`).join('');
  }

  const EDITORS = {
    projects: { fields: PROJECT_FIELDS, render: renderProjectsAdmin, label: 'project', custom: editProject },
    experiences: { fields: EXPERIENCE_FIELDS, render: renderExperiencesAdmin, label: 'pengalaman' },
    skill_groups: { fields: SKILL_FIELDS, render: renderSkillsAdmin, label: 'kelompok skill' }
  };

  function editGeneric(table, row) {
    const cfg = EDITORS[table];
    if (cfg.custom) return cfg.custom(row);
    openEditor(row ? `Edit ${cfg.label}` : `Tambah ${cfg.label}`, cfg.fields, row || { kind: 'work' }, async (v) => {
      await saveRow(table, row && row.id, v);
      await fetchTable(table); cfg.render();
    });
  }

  // Event delegation untuk semua tombol di list
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn || !btn.dataset.table) return;
    const { act, table, id } = btn.dataset;
    const cfg = EDITORS[table];
    const row = state[table].find((r) => r.id === id);
    try {
      if (act === 'edit') return editGeneric(table, row);
      if (act === 'up' || act === 'down') {
        btn.disabled = true;
        await moveRow(table, id, act === 'up' ? -1 : 1);
        await fetchTable(table); cfg.render();
      }
      if (act === 'delete') {
        const name = row.title || row.category || 'item ini';
        if (!confirm(`Hapus "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
        await deleteRow(table, id);
        if (row.image_url) await removeStoredFile(row.image_url);
        await fetchTable(table); cfg.render();
        toast('Dihapus.');
      }
    } catch (ex) {
      console.error(ex);
      toast(friendlyError(ex), true);
      btn.disabled = false;
    }
  });

  /* =================================================================
     PROFILE
     ================================================================= */
  async function loadProfile() {
    const { data, error } = await sb.from('profile').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    state.profile = data || { id: 1 };
    const form = $('#profile-form');
    renderForm(form, PROFILE_FIELDS, state.profile);
    form.insertAdjacentHTML('beforeend', `
      <div id="profile-alert" class="alert alert-error" hidden></div>
      <div class="form-actions"><button class="btn btn-primary" type="submit" id="profile-save">Simpan profil</button>
      <span class="muted" style="font-size:13px">${data && data.updated_at ? 'Terakhir diubah ' + esc(new Date(data.updated_at).toLocaleString('id-ID')) : ''}</span></div>`);
  }

  $('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const values = readForm(form, PROFILE_FIELDS);
    const alertEl = $('#profile-alert');
    const err = validate(values, PROFILE_FIELDS);
    if (err) { alertEl.textContent = err; alertEl.hidden = false; return; }
    alertEl.hidden = true;
    const btn = $('#profile-save');
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    try {
      const { error } = await sb.from('profile').upsert({ id: 1, ...values });
      if (error) throw error;
      const old = state.profile || {};
      if (old.avatar_url && old.avatar_url !== values.avatar_url) await removeStoredFile(old.avatar_url);
      if (old.resume_url && old.resume_url !== values.resume_url) await removeStoredFile(old.resume_url);
      await loadProfile();
      toast('Profil tersimpan ✓');
    } catch (ex) {
      console.error(ex);
      alertEl.textContent = friendlyError(ex); alertEl.hidden = false;
      btn.disabled = false; btn.textContent = 'Simpan profil';
    }
  });

  /* =================================================================
     MESSAGES
     ================================================================= */
  function renderMessages() {
    const el = $('#messages-admin-list');
    const rows = state.messages;
    const unread = rows.filter((m) => !m.is_read).length;
    const badge = $('#unread-count');
    badge.textContent = unread; badge.hidden = unread === 0;
    if (!rows.length) { el.innerHTML = '<div class="empty">Belum ada pesan.</div>'; return; }
    el.innerHTML = rows.map((m) => {
      const subject = encodeURIComponent('Re: your message on my portfolio');
      return `
      <div class="row no-thumb ${m.is_read ? '' : 'unread'}">
        <div>
          <div class="row-title">${esc(m.name)} ${m.is_read ? '' : '<span class="pill accent">Baru</span>'}</div>
          <div class="row-sub">${esc(m.email)} · ${esc(new Date(m.created_at).toLocaleString('id-ID'))}</div>
          <div class="row-msg">${esc(m.message)}</div>
        </div>
        <div class="row-actions">
          <a class="btn btn-primary btn-sm" href="mailto:${esc(m.email)}?subject=${subject}">Balas</a>
          <button class="btn btn-outline btn-sm" data-msg="toggle" data-id="${esc(m.id)}">${m.is_read ? 'Tandai belum dibaca' : 'Tandai dibaca'}</button>
          <button class="btn btn-danger btn-sm" data-msg="delete" data-id="${esc(m.id)}">Hapus</button>
        </div>
      </div>`;
    }).join('');
  }

  $('#messages-admin-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-msg]');
    if (!btn) return;
    const m = state.messages.find((x) => x.id === btn.dataset.id);
    try {
      if (btn.dataset.msg === 'toggle') {
        const { error } = await sb.from('messages').update({ is_read: !m.is_read }).eq('id', m.id);
        if (error) throw error;
      } else {
        if (!confirm(`Hapus pesan dari ${m.name}?`)) return;
        const { error } = await sb.from('messages').delete().eq('id', m.id);
        if (error) throw error;
      }
      await fetchTable('messages'); renderMessages();
    } catch (ex) { toast(friendlyError(ex), true); }
  });

  /* =================================================================
     IMPORT KONTEN AWAL (dari js/data.js)
     ================================================================= */
  function checkEmpty() {
    const empty = !state.projects.length && !state.experiences.length && !state.skill_groups.length;
    $('#import-banner').hidden = !empty;
  }

  $('#import-btn').addEventListener('click', async () => {
    const fb = window.PORTFOLIO_FALLBACK;
    if (!fb) return toast('js/data.js tidak ditemukan.', true);
    if (!confirm('Salin profil, project, pengalaman, dan skill dari js/data.js ke database?')) return;
    const btn = $('#import-btn');
    btn.disabled = true; btn.textContent = 'Mengimpor…';
    try {
      const results = await Promise.all([
        sb.from('profile').upsert({ id: 1, ...fb.profile }),
        fb.projects.length ? sb.from('projects').insert(fb.projects) : { error: null },
        fb.experiences.length ? sb.from('experiences').insert(fb.experiences) : { error: null },
        fb.skill_groups.length ? sb.from('skill_groups').insert(fb.skill_groups) : { error: null }
      ]);
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;
      await loadAll();
      toast('Konten awal berhasil diimpor ✓');
    } catch (ex) {
      console.error(ex);
      toast(friendlyError(ex), true);
    } finally {
      btn.disabled = false; btn.textContent = 'Import konten awal';
    }
  });

  /* =================================================================
     TABS
     ================================================================= */
  function selectTab(name) {
    $$('.tabs [role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== name; });
    try { sessionStorage.setItem('adminTab', name); } catch (e) {}
  }
  $('.tabs').addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t) selectTab(t.dataset.tab);
  });

  $('#new-project-btn').addEventListener('click', () => editProject(null));
  $('#new-experience-btn').addEventListener('click', () => editGeneric('experiences', null));
  $('#new-skill-btn').addEventListener('click', () => editGeneric('skill_groups', null));

  /* =================================================================
     AUTH
     ================================================================= */
  async function loadAll() {
    await Promise.all([
      fetchTable('projects'), fetchTable('experiences'), fetchTable('skill_groups'), fetchTable('messages'), loadProfile()
    ]);
    renderProjectsAdmin(); renderExperiencesAdmin(); renderSkillsAdmin(); renderMessages();
    checkEmpty();
  }

  async function enterApp(session) {
    const { data: isAdmin, error } = await sb.rpc('is_admin');
    if (error || !isAdmin) {
      await sb.auth.signOut();
      show('login');
      const a = $('#login-alert');
      a.textContent = error
        ? 'Tidak bisa memeriksa hak admin. Sudah menjalankan supabase/schema.sql?'
        : 'Akun ini belum terdaftar sebagai admin. Tambahkan ke tabel admin_users (lihat README).';
      a.hidden = false;
      return;
    }
    $('#admin-email').textContent = session.user.email;
    show('app');
    let tab = 'projects';
    try { tab = sessionStorage.getItem('adminTab') || 'projects'; } catch (e) {}
    selectTab(tab);
    try { await loadAll(); } catch (ex) { console.error(ex); toast(friendlyError(ex), true); }
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const a = $('#login-alert');
    const btn = $('#login-submit');
    if (!email || !password) { a.textContent = 'Isi email dan password.'; a.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = 'Masuk';
    if (error) { a.textContent = 'Email atau password salah.'; a.hidden = false; return; }
    a.hidden = true;
    $('#login-password').value = '';
    enterApp(data.session);
  });

  $('#logout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
    show('login');
  });

  /* =================================================================
     BOOT
     ================================================================= */
  (async function boot() {
    if (!sb) { show('setup'); return; }
    const { data } = await sb.auth.getSession();
    if (data.session) enterApp(data.session);
    else show('login');
  })();
})();
