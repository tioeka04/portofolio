/* =====================================================================
   HALAMAN DETAIL PROJECT (project.html?slug=...)
   Ambil satu project berdasarkan slug di URL, lalu tampilkan sebagai case study.
   ===================================================================== */
(function () {
  'use strict';

  const { esc, safeUrl, richText, loadProjectBySlug, STATUS_LABEL, debug } = window.Portfolio;
  const root = document.getElementById('project');

  document.getElementById('year').textContent = new Date().getFullYear();

  function renderNotFound() {
    document.title = 'Project not found — Tio Eka Friadi';
    root.innerHTML = `
      <a class="d-inline-block mb-3" href="index.html#projects">← All projects</a>
      <h1>Project not found</h1>
      <p>This project may have been moved or unpublished.</p>`;
  }

  function renderProject(project) {
    document.title = `${project.title} — Tio Eka Friadi`;
    const description = document.querySelector('meta[name="description"]');
    if (description && project.summary) description.setAttribute('content', project.summary);

    const image = safeUrl(project.image_url);
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

      ${image ? `<img class="detail-cover" src="${esc(image)}" alt="Screenshot of ${esc(project.title)}">` : ''}

      ${facts.length ? `
        <dl class="card detail-meta">
          ${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}
        </dl>` : ''}

      ${tech.length ? `<h2 class="visually-hidden">Tech stack</h2><ul class="tags mb-4">${tech.map((t) => `<li class="tag">${esc(t)}</li>`).join('')}</ul>` : ''}

      ${highlights.length ? `<div class="prose"><h3>Highlights</h3><ul>${highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul></div>` : ''}
      <div class="prose">${richText(project.description)}</div>`;
  }

  const slug = new URLSearchParams(location.search).get('slug') || '';
  debug('membuka project:', slug);

  loadProjectBySlug(slug).then((project) => {
    if (project) renderProject(project);
    else renderNotFound();
  });
})();
