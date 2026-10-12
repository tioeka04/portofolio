/* =====================================================================
   HALAMAN UTAMA (index.html)
   Alur: DOMContentLoaded → setup interaksi → ambil konten → render tiap section.

   Isi file (urut dari atas):
     1. Helper kecil            5. Experience
     2. Tema (dark / light)     6. Skills
     3. Salam & animasi scroll  7. Form kontak
     4. Profile & Projects      8. Start
   Konten datang dari Supabase (fallback: js/data.js) lewat core.js.
   ===================================================================== */
(function () {
  'use strict';

  const { esc, safeUrl, loadContent, STATUS_LABEL, debug } = window.Portfolio;

  /* ---------------------------------------------------------------
     1. HELPER
     --------------------------------------------------------------- */
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  /** Tampilkan teks di semua elemen [data-bind="..."]. */
  function bindText(name, value) {
    $$(`[data-bind="${name}"]`).forEach((el) => { el.textContent = value; });
  }

  /** Kalimat pertama saja — dipakai untuk ringkasan di hero. */
  function firstSentence(text) {
    const match = String(text || '').match(/^.+?[.!?](\s|$)/);
    return match ? match[0].trim() : String(text || '');
  }

  /** Isi atribut `--i` supaya kartu muncul bergantian (lihat .appear di CSS). */
  const stagger = (index) => `style="--i:${index}"`;

  /* ---------------------------------------------------------------
     2. TEMA — dark / light
     --------------------------------------------------------------- */
  function setupTheme() {
    const root = document.documentElement;
    const button = $('#theme-toggle');
    const icon = $('#theme-icon use');

    const show = (theme) => {
      root.setAttribute('data-bs-theme', theme);
      icon.setAttribute('href', theme === 'dark' ? '#i-sun' : '#i-moon');
    };

    show(root.getAttribute('data-bs-theme') || 'light');

    button.addEventListener('click', () => {
      const next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      show(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* mode privat: abaikan */ }
      document.dispatchEvent(new CustomEvent('themechange', { detail: next })); // chart ikut berganti
      debug('tema:', next);
    });
  }

  /* ---------------------------------------------------------------
     3. SALAM BERDASARKAN WAKTU & ANIMASI SCROLL
     --------------------------------------------------------------- */
  function greetingFor(hour) {
    switch (true) {
      case hour < 5:  return 'Working late?';
      case hour < 12: return 'Good morning';
      case hour < 15: return 'Good afternoon';
      case hour < 19: return 'Good evening';
      default:        return 'Good night';
    }
  }

  function setupGreeting() {
    $('#greeting').textContent = `${greetingFor(new Date().getHours())} — I'm`;
  }

  /** Section memudar masuk saat pertama kali terlihat. */
  function setupScrollReveal() {
    const sections = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      sections.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // cukup sekali
      });
    }, { threshold: 0.08 });
    sections.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------------
     4a. PROFILE
     --------------------------------------------------------------- */
  /** Tampilkan link hanya jika URL-nya valid; sembunyikan kalau kosong. */
  function showLink(selector, url, wrapperSelector) {
    const link = $(selector);
    const safe = safeUrl(url);
    if (!link || !safe) return;
    link.href = safe;
    link.hidden = false;
    if (wrapperSelector) $(wrapperSelector).hidden = false;
  }

  function renderProfile(profile) {
    bindText('name', profile.name || '');
    bindText('headline', profile.headline || '');
    bindText('bio', profile.bio || '');
    bindText('bio-short', firstSentence(profile.bio));
    if (profile.name) document.title = `${profile.name} — ${profile.headline || 'Portfolio'}`;

    $('#open-to-work').hidden = !profile.open_to_work;

    if (profile.location) {
      $('#hero-location span').textContent = profile.location;
      $('#hero-location').hidden = false;
    }

    showLink('#hero-github', profile.github_url);
    showLink('#hero-linkedin', profile.linkedin_url);
    showLink('#contact-github', profile.github_url, '#contact-github-item');
    showLink('#contact-linkedin', profile.linkedin_url, '#contact-linkedin-item');

    if (profile.email) {
      $('#contact-email').href = `mailto:${profile.email}`;
      $('#contact-email span').textContent = profile.email;
      $('#contact-email-item').hidden = false;
    }

    const avatar = safeUrl(profile.avatar_url);
    if (avatar) {
      $('#hero-avatar').src = avatar;
      $('#hero-avatar').hidden = false;
    }

    const resume = safeUrl(profile.resume_url);
    if (resume) $('#resume-btn').href = resume; // PDF dari admin; kalau kosong → cv.html
  }

  /** Daftar fakta singkat di section About. */
  function renderAbout(profile, experiences) {
    const education = experiences.find((x) => x.kind === 'education');
    const facts = [
      { icon: 'cap', label: 'Education', value: education && `${education.title} — ${education.organization}` },
      { icon: 'pin', label: 'Location', value: profile.location },
      { icon: 'mail', label: 'Email', value: profile.email },
      { icon: 'download', label: 'Status', value: profile.open_to_work ? 'Open to internships & junior roles' : 'Not looking right now' }
    ].filter((fact) => fact.value);

    $('#about-facts').innerHTML = facts.map((f) => `
      <li>
        <svg class="icon"><use href="#i-${f.icon}"/></svg>
        <div><small>${f.label}</small>${esc(f.value)}</div>
      </li>`).join('');
  }

  /** Angka ringkas di hero, dihitung dari data. */
  function renderHeroStats(content) {
    const technologies = new Set();
    content.projects.forEach((p) => (p.tech_stack || []).forEach((t) => technologies.add(t)));
    $('#stat-projects').textContent = content.projects.length;
    $('#stat-tech').textContent = technologies.size;
    $('#stat-experience').textContent = content.experiences.length;
  }

  /* ---------------------------------------------------------------
     4b. PROJECTS (kartu + filter kategori)
     --------------------------------------------------------------- */
  let allProjects = [];

  function projectCard(project, index) {
    const detailUrl = `project.html?slug=${encodeURIComponent(project.slug)}`;
    const image = safeUrl(project.image_url);
    const repo = safeUrl(project.repo_url);
    const demo = safeUrl(project.demo_url);

    const tags = (project.tech_stack || []).slice(0, 6)
      .map((tech) => `<li class="tag">${esc(tech)}</li>`).join('');

    let badge = '';
    if (project.status === 'in-progress') badge = `<span class="badge-soft is-progress">${STATUS_LABEL['in-progress']}</span>`;
    else if (project.featured) badge = '<span class="badge-soft">Featured</span>';

    const meta = [project.category, project.year].filter(Boolean).map(esc).join(' · ');

    return `
      <div class="col-md-6 col-lg-4">
        <article class="card project-card h-100 appear" ${stagger(index)}>
          ${image ? `<a href="${esc(detailUrl)}" tabindex="-1" aria-hidden="true"><img class="card-img-top" src="${esc(image)}" alt="" loading="lazy"></a>` : ''}
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
              <span class="project-meta">${meta}</span>${badge}
            </div>
            <h3 class="card-title h5"><a href="${esc(detailUrl)}">${esc(project.title)}</a></h3>
            <p class="card-text flex-grow-1">${esc(project.summary)}</p>
            <ul class="tags">${tags}</ul>
          </div>
          <div class="card-footer">
            <a href="${esc(detailUrl)}">Case study →</a>
            ${repo ? `<a href="${esc(repo)}" target="_blank" rel="noopener">Source code</a>` : ''}
            ${demo ? `<a href="${esc(demo)}" target="_blank" rel="noopener">Live demo</a>` : ''}
          </div>
        </article>
      </div>`;
  }

  function drawProjects(list) {
    const container = $('#projects-list');
    container.innerHTML = list.length
      ? list.map(projectCard).join('')
      : '<div class="col-12"><div class="empty-state">No projects published yet.</div></div>';
  }

  /** Featured dulu, lalu urutan manual (sort_order). */
  function sortProjects(projects) {
    return [...projects].sort((a, b) =>
      Number(!!b.featured) - Number(!!a.featured) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  function renderProjects(projects) {
    allProjects = sortProjects(projects);
    const categories = [...new Set(allProjects.map((p) => p.category).filter(Boolean))];
    const filters = $('#project-filters');

    if (categories.length < 2) {
      filters.remove(); // satu kategori saja: filter tidak berguna
    } else {
      filters.innerHTML = ['All', ...categories]
        .map((c, i) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`)
        .join('');

      filters.addEventListener('click', (event) => {
        const button = event.target.closest('.chip');
        if (!button) return;
        filters.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        const category = button.dataset.cat;
        drawProjects(category === 'All' ? allProjects : allProjects.filter((p) => p.category === category));
        debug('filter project:', category);
      });
    }
    drawProjects(allProjects);
  }

  /* ---------------------------------------------------------------
     5. EXPERIENCE
     --------------------------------------------------------------- */
  const KIND_LABEL = { work: 'Work', education: 'Education', organization: 'Organization', certification: 'Certification' };

  function experienceItem(item) {
    const date = [item.start_label, item.start_label ? (item.end_label || 'Present') : item.end_label]
      .filter(Boolean).join(' – ');
    const highlights = (item.highlights || []).filter(Boolean);
    const place = [item.organization, item.location].filter(Boolean).join(' · ');

    return `
      <li class="timeline-item">
        <span class="timeline-date">${esc(date)}</span><span class="timeline-kind">${esc(KIND_LABEL[item.kind] || '')}</span>
        <h3>${esc(item.title)}</h3>
        <p class="timeline-org">${esc(place)}</p>
        ${item.description ? `<p class="mb-0">${esc(item.description)}</p>` : ''}
        ${highlights.length ? `<ul>${highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
      </li>`;
  }

  function renderExperience(items) {
    if (!items.length) { $('#experience').hidden = true; return; }
    $('#experience-list').innerHTML = items.map(experienceItem).join('');
  }

  /* ---------------------------------------------------------------
     6. SKILLS
     --------------------------------------------------------------- */
  function renderSkills(groups) {
    if (!groups.length) { $('#skills').hidden = true; return; }
    $('#skills-list').innerHTML = groups.map((group, index) => `
      <div class="col-sm-6 col-lg-4">
        <div class="card skill-card h-100 appear" ${stagger(index)}>
          <div class="card-body">
            <h3>${esc(group.category)}</h3>
            <ul class="tags">${(group.items || []).map((item) => `<li class="tag">${esc(item)}</li>`).join('')}</ul>
          </div>
        </div>
      </div>`).join('');
  }

  /* ---------------------------------------------------------------
     7. FORM KONTAK → tabel `messages` di Supabase
     --------------------------------------------------------------- */
  const SPAM_DELAY_MS = 60 * 1000; // 1 pesan per menit per browser
  const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  /** Kembalikan pesan error (string), atau '' kalau input valid. */
  function validateMessage({ name, email, message }) {
    if (!name || !email || !message) return 'Please fill in your name, email and message.';
    if (!EMAIL_PATTERN.test(email)) return 'Please enter a valid email address.';
    if (message.length < 5) return 'Your message is a bit too short.';
    return '';
  }

  function isRateLimited() {
    try {
      const last = Number(localStorage.getItem('lastMessageAt') || 0);
      return Date.now() - last < SPAM_DELAY_MS;
    } catch (e) {
      return false;
    }
  }

  function setupContactForm() {
    const form = $('#contact-form');
    const alertBox = $('#form-alert');
    const submit = $('#cf-submit');

    const showAlert = (type, text) => {
      alertBox.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
      alertBox.textContent = text;
      alertBox.hidden = false;
    };

    /** Cadangan kalau Supabase belum aktif: buka aplikasi email pengunjung. */
    const openMailApp = ({ name, email, message }) => {
      const to = ($('#contact-email').getAttribute('href') || '').replace('mailto:', '');
      if (!to) return showAlert('error', 'Messaging is temporarily unavailable. Please reach me on LinkedIn.');
      const subject = encodeURIComponent(`Portfolio contact from ${name}`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      showAlert('success', 'Opening your email app…');
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = {
        name: form.elements.namedItem('name').value.trim(),
        email: form.elements.namedItem('email').value.trim(),
        message: form.elements.namedItem('message').value.trim()
      };

      // Honeypot: bot mengisi field tersembunyi → pura-pura sukses
      if (form.elements.namedItem('website').value) {
        showAlert('success', 'Thanks! Your message has been sent.');
        form.reset();
        return;
      }

      const problem = validateMessage(data);
      if (problem) return showAlert('error', problem);
      if (isRateLimited()) return showAlert('error', 'Please wait a minute before sending another message.');

      const supabase = window.supabaseClient;
      if (!supabase) return openMailApp(data);

      submit.disabled = true;
      submit.textContent = 'Sending…';
      const { error } = await supabase.from('messages').insert(data);
      submit.disabled = false;
      submit.textContent = 'Send message';

      if (error) {
        console.error('[portfolio] gagal mengirim pesan', error);
        return showAlert('error', 'Sorry, your message could not be sent. Please email me directly instead.');
      }
      try { localStorage.setItem('lastMessageAt', String(Date.now())); } catch (e) { /* abaikan */ }
      form.reset();
      showAlert('success', "Thanks! Your message has been sent — I'll get back to you by email.");
      debug('pesan terkirim');
    });
  }

  /* ---------------------------------------------------------------
     8. START
     --------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    setupTheme();
    setupGreeting();
    setupScrollReveal();
    setupContactForm();
    $('#year').textContent = new Date().getFullYear();

    const content = await loadContent();
    debug('konten dimuat dari:', content.source, content);

    renderProfile(content.profile);
    renderAbout(content.profile, content.experiences);
    renderHeroStats(content);
    renderSkills(content.skill_groups);
    renderProjects(content.projects);
    renderExperience(content.experiences);
    window.Dashboard.render(content);
  });
})();
