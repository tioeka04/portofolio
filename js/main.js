/* =====================================================================
   HALAMAN UTAMA — render konten dari Supabase / data.js
   ===================================================================== */
(function () {
  'use strict';
  const { esc, safeUrl, loadContent, STATUS_LABEL } = window.Portfolio;
  const $ = (sel) => document.querySelector(sel);

  document.addEventListener('DOMContentLoaded', async () => {
    setupNav();
    setupTheme();
    setupContactForm();
    $('#year').textContent = new Date().getFullYear();

    const content = await loadContent();
    renderProfile(content.profile);
    renderProjects(content.projects);
    renderExperience(content.experiences);
    renderSkills(content.skill_groups);
  });

  /* ---------------- Navigation (mobile menu) ---------------- */
  function setupNav() {
    const btn = $('#menu-btn');
    const links = $('#nav-links');
    if (!btn || !links) return;
    const close = () => { links.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---------------- Dark / light toggle ---------------- */
  function setupTheme() {
    const btn = $('#theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const root = document.documentElement;
      const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------------- Profile ---------------- */
  function renderProfile(p) {
    document.querySelectorAll('[data-bind="name"]').forEach((el) => { el.textContent = p.name || ''; });
    $('[data-bind="headline"]').textContent = p.headline || '';
    $('[data-bind="bio"]').textContent = p.bio || '';
    if (p.name) document.title = `${p.name} — ${p.headline || 'Portfolio'}`;

    $('#open-to-work').hidden = !p.open_to_work;

    const loc = $('#hero-location');
    if (p.location) { loc.querySelector('span').textContent = p.location; loc.hidden = false; }

    linkOrHide('#hero-github', p.github_url);
    linkOrHide('#hero-linkedin', p.linkedin_url);
    linkOrHide('#contact-github', p.github_url, '#contact-github-item');
    linkOrHide('#contact-linkedin', p.linkedin_url, '#contact-linkedin-item');

    if (p.email) {
      const a = $('#contact-email');
      a.href = `mailto:${p.email}`;
      a.querySelector('span').textContent = p.email;
      $('#contact-email-item').hidden = false;
    }

    const avatar = safeUrl(p.avatar_url);
    if (avatar) { const img = $('#hero-avatar'); img.src = avatar; img.hidden = false; }

    const resume = safeUrl(p.resume_url);
    if (resume) $('#resume-btn').href = resume; // PDF dari admin; kalau kosong → cv.html
  }

  function linkOrHide(sel, url, wrapperSel) {
    const el = $(sel);
    const u = safeUrl(url);
    if (!el) return;
    if (u) { el.href = u; el.hidden = false; if (wrapperSel) $(wrapperSel).hidden = false; }
  }

  /* ---------------- Projects ---------------- */
  let allProjects = [];

  function renderProjects(projects) {
    allProjects = [...projects].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const categories = [...new Set(allProjects.map((p) => p.category).filter(Boolean))];
    const filters = $('#project-filters');
    if (categories.length > 1) {
      filters.innerHTML = ['All', ...categories]
        .map((c, i) => `<button type="button" class="chip-btn" data-cat="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`)
        .join('');
      filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-btn');
        if (!btn) return;
        filters.querySelectorAll('.chip-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        drawProjects(btn.dataset.cat === 'All' ? allProjects : allProjects.filter((p) => p.category === btn.dataset.cat));
      });
    } else {
      filters.remove();
    }
    drawProjects(allProjects);
  }

  function drawProjects(list) {
    const container = $('#projects-list');
    if (!list.length) {
      container.innerHTML = '<div class="empty">No projects published yet.</div>';
      return;
    }
    container.innerHTML = list.map(projectCard).join('');
  }

  function projectCard(p) {
    const detail = `project.html?slug=${encodeURIComponent(p.slug)}`;
    const img = safeUrl(p.image_url);
    const repo = safeUrl(p.repo_url);
    const demo = safeUrl(p.demo_url);
    const tags = (p.tech_stack || []).slice(0, 6).map((t) => `<li class="tag">${esc(t)}</li>`).join('');
    const statusBadge = p.status === 'in-progress'
      ? `<span class="badge progress">${STATUS_LABEL['in-progress']}</span>`
      : (p.featured ? '<span class="badge">Featured</span>' : '');
    const meta = [p.category, p.year].filter(Boolean).map(esc).join(' · ');

    return `
      <article class="card fade-in">
        ${img ? `<a href="${esc(detail)}" tabindex="-1" aria-hidden="true"><img class="card-media" src="${esc(img)}" alt="" loading="lazy"></a>` : ''}
        <div class="card-body">
          <div class="card-top"><span>${meta}</span>${statusBadge}</div>
          <h3><a href="${esc(detail)}">${esc(p.title)}</a></h3>
          <p>${esc(p.summary)}</p>
          <ul class="tags" aria-label="Tech stack">${tags}</ul>
          <div class="card-links">
            <a href="${esc(detail)}">Case study →</a>
            ${repo ? `<a href="${esc(repo)}" target="_blank" rel="noopener">Source code</a>` : ''}
            ${demo ? `<a href="${esc(demo)}" target="_blank" rel="noopener">Live demo</a>` : ''}
          </div>
        </div>
      </article>`;
  }

  /* ---------------- Experience ---------------- */
  const KIND_LABEL = { work: 'Work', education: 'Education', organization: 'Organization', certification: 'Certification' };

  function renderExperience(items) {
    const el = $('#experience-list');
    if (!items.length) { $('#experience').hidden = true; return; }
    el.innerHTML = items.map((x) => {
      const date = [x.start_label, x.start_label ? (x.end_label || 'Present') : x.end_label].filter(Boolean).join(' – ');
      const hl = (x.highlights || []).filter(Boolean);
      return `
        <li class="tl-item">
          <div class="tl-date">${esc(date)}<span class="tl-kind">${esc(KIND_LABEL[x.kind] || '')}</span></div>
          <div>
            <h3>${esc(x.title)}</h3>
            <p class="tl-org">${esc([x.organization, x.location].filter(Boolean).join(' · '))}</p>
            ${x.description ? `<p>${esc(x.description)}</p>` : ''}
            ${hl.length ? `<ul>${hl.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
          </div>
        </li>`;
    }).join('');
  }

  /* ---------------- Skills ---------------- */
  function renderSkills(groups) {
    const el = $('#skills-list');
    if (!groups.length) { $('#skills').hidden = true; return; }
    el.innerHTML = groups.map((g) => `
      <div class="skill-group">
        <h3>${esc(g.category)}</h3>
        <ul class="tags">${(g.items || []).map((i) => `<li class="tag">${esc(i)}</li>`).join('')}</ul>
      </div>`).join('');
  }

  /* ---------------- Contact form → tabel messages ---------------- */
  function setupContactForm() {
    const form = $('#contact-form');
    const alertBox = $('#form-alert');
    const submit = $('#cf-submit');
    if (!form) return;

    const show = (type, msg) => {
      alertBox.className = `alert alert-${type}`;
      alertBox.textContent = msg;
      alertBox.hidden = false;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.elements.namedItem('name').value.trim();
      const email = form.elements.namedItem('email').value.trim();
      const message = form.elements.namedItem('message').value.trim();

      if (form.elements.namedItem('website').value) { show('success', 'Thanks! Your message has been sent.'); form.reset(); return; } // bot
      if (!name || !email || !message) return show('error', 'Please fill in your name, email and message.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return show('error', 'Please enter a valid email address.');
      if (message.length < 5) return show('error', 'Your message is a bit too short.');

      // Batasi spam: 1 pesan per 60 detik per browser
      try {
        const last = Number(localStorage.getItem('lastMessageAt') || 0);
        if (Date.now() - last < 60000) return show('error', 'Please wait a minute before sending another message.');
      } catch (err) {}

      const sb = window.supabaseClient;
      if (!sb) {
        // Supabase belum aktif → buka aplikasi email sebagai cadangan
        const to = ($('#contact-email').getAttribute('href') || '').replace('mailto:', '');
        if (to) {
          window.location.href = `mailto:${to}?subject=${encodeURIComponent('Portfolio contact from ' + name)}&body=${encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')')}`;
          show('success', 'Opening your email app…');
        } else {
          show('error', 'Messaging is temporarily unavailable. Please reach me on LinkedIn.');
        }
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      const { error } = await sb.from('messages').insert({ name, email, message });
      submit.disabled = false;
      submit.textContent = 'Send message';

      if (error) {
        console.error(error);
        show('error', 'Sorry, your message could not be sent. Please email me directly instead.');
        return;
      }
      try { localStorage.setItem('lastMessageAt', String(Date.now())); } catch (err) {}
      form.reset();
      show('success', "Thanks! Your message has been sent — I'll get back to you by email.");
    });
  }
})();
