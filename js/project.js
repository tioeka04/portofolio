/* =====================================================================
   HALAMAN DETAIL PROJECT (project.html?slug=...)
   Ambil satu project berdasarkan slug di URL, lalu tampilkan sebagai case study.
   ===================================================================== */
(function () {
  'use strict';

  const { esc, safeUrl, richText, loadProjectBySlug, projectImages, STATUS_LABEL, debug } = window.Portfolio;
  const root = document.getElementById('project');

  document.getElementById('year').textContent = new Date().getFullYear();

  function renderNotFound() {
    document.title = 'Project not found — Tio Eka Friadi';
    root.innerHTML = `
      <a class="d-inline-block mb-3" href="index.html#projects">← All projects</a>
      <h1>Project not found</h1>
      <p>This project may have been moved or unpublished.</p>`;
  }

  /* ---------------- Galeri foto (gaya e-commerce) ---------------- */
  /** Satu foto: tampil biasa. Banyak foto: foto besar + thumbnail di bawah. */
  function galleryHtml(images, title) {
    if (!images.length) return '';
    if (images.length === 1) {
      return `<img class="detail-cover" src="${esc(images[0])}" alt="Screenshot of ${esc(title)}">`;
    }
    const thumbs = images.map((url, i) => `
      <button type="button" class="viewer-thumb" data-index="${i}" aria-label="Show photo ${i + 1}">
        <img src="${esc(url)}" alt="" loading="lazy">
      </button>`).join('');
    return `
      <div class="viewer" id="viewer" tabindex="0" aria-label="Photo gallery of ${esc(title)}">
        <div class="viewer-stage">
          <img class="viewer-main" id="viewer-main" src="${esc(images[0])}" alt="${esc(title)} — photo 1">
          <button type="button" class="viewer-nav viewer-prev" data-step="-1" aria-label="Previous photo">‹</button>
          <button type="button" class="viewer-nav viewer-next" data-step="1" aria-label="Next photo">›</button>
          <span class="viewer-count" id="viewer-count"></span>
        </div>
        <div class="viewer-thumbs" id="viewer-thumbs">${thumbs}</div>
      </div>`;
  }

  /** Klik thumbnail / panah / keyboard / swipe → ganti foto utama. */
  function setupViewer(images, title) {
    const viewer = document.getElementById('viewer');
    if (!viewer) return;
    const main = document.getElementById('viewer-main');
    const count = document.getElementById('viewer-count');
    const thumbs = [...viewer.querySelectorAll('.viewer-thumb')];
    let current = 0;

    function show(index) {
      current = (index + images.length) % images.length; // berputar di ujung
      main.classList.add('is-changing');
      main.src = images[current];
      main.alt = `${title} — photo ${current + 1}`;
      count.textContent = `${current + 1} / ${images.length}`;
      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('is-active', i === current);
        thumb.setAttribute('aria-current', String(i === current));
      });
      thumbs[current].scrollIntoView({ block: 'nearest', inline: 'center' });
      debug('foto aktif:', current + 1);
    }

    main.addEventListener('load', () => main.classList.remove('is-changing'));
    viewer.addEventListener('click', (event) => {
      const thumb = event.target.closest('.viewer-thumb');
      const nav = event.target.closest('.viewer-nav');
      if (thumb) show(Number(thumb.dataset.index));
      if (nav) show(current + Number(nav.dataset.step));
    });
    viewer.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') show(current - 1);
      if (event.key === 'ArrowRight') show(current + 1);
    });

    // swipe di layar sentuh
    let startX = null;
    main.addEventListener('touchstart', (event) => { startX = event.touches[0].clientX; }, { passive: true });
    main.addEventListener('touchend', (event) => {
      if (startX === null) return;
      const dx = event.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });

    show(0);
  }

  function renderProject(project) {
    document.title = `${project.title} — Tio Eka Friadi`;
    const description = document.querySelector('meta[name="description"]');
    if (description && project.summary) description.setAttribute('content', project.summary);

    const images = projectImages(project).map(safeUrl).filter(Boolean);
    const repo = safeUrl(project.repo_url);
    const demo = safeUrl(project.demo_url);
    const highlights = (project.highlights || []).filter(Boolean);
    const tech = project.tech_stack || [];

    // Info singkat: tampilkan hanya yang ada isinya
    const facts = [
      ['Role', project.role],
      ['Category', project.category],
      ['Year', project.year],
      ['Status', STATUS_LABEL[project.status]]
    ].filter(([, value]) => value);

    root.innerHTML = `
      <a class="d-inline-block mb-3" href="index.html#projects">← All projects</a>
      ${project.status === 'in-progress' ? '<div><span class="badge-soft is-progress">In progress</span></div>' : ''}
      <h1>${esc(project.title)}</h1>
      <p class="lead">${esc(project.summary)}</p>

      <div class="d-flex flex-wrap gap-2">
        ${repo ? `<a class="btn btn-primary" href="${esc(repo)}" target="_blank" rel="noopener">View source code</a>` : ''}
        ${demo ? `<a class="btn btn-outline-primary" href="${esc(demo)}" target="_blank" rel="noopener">Live demo</a>` : ''}
      </div>

      ${galleryHtml(images, project.title)}

      ${facts.length ? `
        <dl class="card detail-meta">
          ${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}
        </dl>` : ''}

      ${tech.length ? `<h2 class="visually-hidden">Tech stack</h2><ul class="tags mb-4">${tech.map((t) => `<li class="tag">${esc(t)}</li>`).join('')}</ul>` : ''}

      ${highlights.length ? `<div class="prose"><h3>Highlights</h3><ul>${highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>` : ''}
      <div class="prose">${richText(project.description)}</div>`;

    setupViewer(images, project.title);
  }

  const slug = new URLSearchParams(location.search).get('slug') || '';
  debug('membuka project:', slug);

  loadProjectBySlug(slug).then((project) => {
    if (project) renderProject(project);
    else renderNotFound();
  });
})();
