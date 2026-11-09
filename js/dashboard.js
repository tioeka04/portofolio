/* =====================================================================
   DASHBOARD — 5 chart (Chart.js) di section #dashboard

   Chart yang dibuat:
     1. Bar            Skill level            (warna dinamis = scriptable option)
     2. Pie            Project per kategori   (data asli dari project)
     3. Line           Learning progress
     4. Stacked bar    Status project per kategori (data asli)
     5. Scatter        Tahun pengalaman vs level skill

   Fitur lanjutan:
     - Programmatic update : tombol filter mengubah data lalu chart.update()
     - Animation           : opsi `animation` di tiap chart
     - Hover / sentuh      : elemen yang disentuh menonjol, sisanya meredup
                             (plugin `hoverFocus`), slice pie bergeser keluar,
                             titik membesar dengan cincin, tooltip seragam.
                             Mati otomatis kalau prefers-reduced-motion aktif.
     - Theme-aware         : chart digambar ulang saat dark/light mode berganti

   Cara pakai dari main.js:  Dashboard.render(content)
   ===================================================================== */
(function () {
  'use strict';

  const { STATUS_LABEL, debug } = window.Portfolio;

  /* ---------------------------------------------------------------
     DATA SELF-ASSESSMENT — EDIT DI SINI
     Angka 1–10 adalah penilaian diri sendiri (bersifat ilustrasi).
     `years` = lama memakai skill tersebut.
     --------------------------------------------------------------- */
  const SKILLS = [
    { name: 'Node.js',       group: 'Backend',   level: 7, years: 2 },
    { name: 'PostgreSQL',    group: 'Backend',   level: 8, years: 2.5 },
    { name: 'REST API',      group: 'Backend',   level: 8, years: 2 },
    { name: 'HTML / CSS',    group: 'Frontend',  level: 7, years: 4 },
    { name: 'JavaScript',    group: 'Frontend',  level: 7, years: 3 },
    { name: 'React',         group: 'Frontend',  level: 6, years: 2 },
    { name: 'Python',        group: 'Data & AI', level: 8, years: 3 },
    { name: 'NumPy / Pandas', group: 'Data & AI', level: 7, years: 1.5 },
    { name: 'scikit-learn',  group: 'Data & AI', level: 6, years: 1 },
    { name: 'Git / GitHub',  group: 'Tools',     level: 7, years: 3.5 },
    { name: 'Postman',       group: 'Tools',     level: 6, years: 1.5 }
  ];

  const PROGRESS_YEARS = [2022, 2023, 2024, 2025, 2026];
  const PROGRESS = {
    'Python':     [2, 4, 6, 7, 8],
    'JavaScript': [1, 3, 5, 6, 7],
    'SQL':        [1, 3, 5, 7, 8]
  };

  /* ---------------------------------------------------------------
     STATE
     --------------------------------------------------------------- */
  const charts = {};          // chart yang sedang aktif, dikunci per nama
  let projects = [];          // diisi saat render()
  let activeGroup = 'All';    // filter chart skill

  /* ---------------------------------------------------------------
     HELPER
     --------------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);

  /** Baca CSS variable aktif, supaya chart ikut tema (light/dark). */
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const palette = () => [1, 2, 3, 4, 5].map((n) => cssVar(`--chart-${n}`));

  /** Hitung jumlah item per kunci → { kunci: jumlah }. */
  function countBy(items, getKey) {
    const result = {};
    items.forEach((item) => {
      const key = getKey(item);
      result[key] = (result[key] || 0) + 1;
    });
    return result;
  }

  /** Scriptable option: warna batang ditentukan oleh nilainya. */
  function levelColor(level) {
    const [primary, strong, medium] = palette();
    if (level >= 8) return strong;   // kuat
    if (level >= 6) return primary;  // cakap
    return medium;                   // sedang belajar
  }

  /* ---------------------------------------------------------------
     HOVER / SENTUH
     Saat satu bar / slice / titik di-hover (atau disentuh di HP),
     elemen itu tetap penuh warna dan elemen lain meredup.
     --------------------------------------------------------------- */
  const reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  const DIM_ALPHA = 0.28;   // transparansi elemen yang tidak sedang disorot

  /**
   * Bungkus warna (string, array, atau fungsi) supaya meredup kalau ada
   * elemen lain yang sedang disorot. Hanya untuk chart dengan
   * `plugins.hoverFocus.dim = true`.
   */
  function focusColor(base) {
    return (ctx) => {
      let color = base;
      if (typeof color === 'function') color = color(ctx);
      if (Array.isArray(color)) color = color[ctx.dataIndex % color.length];
      const focus = ctx.chart.$focus;
      if (!focus || ctx.type !== 'data') return color;
      const isActive = focus.some((a) => a.datasetIndex === ctx.datasetIndex && a.index === ctx.dataIndex);
      return isActive ? color : Chart.helpers.color(color).alpha(DIM_ALPHA).rgbString();
    };
  }

  /** Plugin: catat elemen yang aktif, ubah kursor, lalu animasikan warna. */
  const hoverFocus = {
    id: 'hoverFocus',
    defaults: { dim: false },
    afterEvent(chart, args, opts) {
      if (args.replay) return;
      const active = chart.getActiveElements();
      chart.canvas.style.cursor = active.length ? 'pointer' : '';
      if (!opts.dim) return;
      const key = active.map((a) => `${a.datasetIndex}:${a.index}`).join('|');
      if (key === (chart.$focusKey || '')) return;
      chart.$focusKey = key;
      chart.$focus = active.length ? active : null;
      chart.update('active');   // warna berubah dengan transisi 'active'
    }
  };

  /** Hapus sorotan (dipakai saat jari menyentuh area di luar chart). */
  function clearFocus(chart) {
    if (!chart.getActiveElements().length && !chart.$focus) return;
    chart.setActiveElements([]);
    chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    chart.$focusKey = '';
    chart.$focus = null;
    chart.update('active');
  }

  /** Setelan umum semua chart. */
  function applyDefaults() {
    const motion = !reducedMotion.matches;
    const surface = cssVar('--surface');

    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.color = cssVar('--chart-text');
    Chart.defaults.borderColor = cssVar('--chart-grid');
    // Object.assign, BUKAN `Chart.defaults.animation = {...}`: Chart.js membaca
    // daftar kunci objek ini (type, fn, ...). Kalau diganti objek baru,
    // tipe animasi warna hilang dan hover melempar "this._fn is not a function".
    Object.assign(Chart.defaults.animation, { duration: motion ? 800 : 0, easing: 'easeOutQuart' });

    // Transisi saat hover / sentuh (warna, ukuran titik, offset slice)
    Chart.defaults.transitions.active.animation = { duration: motion ? 300 : 0, easing: 'easeOutCubic' };

    // Gaya hover yang seragam untuk semua jenis elemen
    Object.assign(Chart.defaults.elements.arc, { hoverOffset: 14, hoverBorderColor: surface });
    Object.assign(Chart.defaults.elements.point, { hoverBorderWidth: 3, hoverBorderColor: surface });

    // Tooltip seragam, ikut tema
    Object.assign(Chart.defaults.plugins.tooltip, {
      backgroundColor: surface,
      titleColor: cssVar('--bs-heading-color'),
      bodyColor: cssVar('--chart-text'),
      borderColor: cssVar('--line'),
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      boxPadding: 4,
      caretSize: 6,
      usePointStyle: true,
      animation: motion ? { duration: 200, easing: 'easeOutQuart' } : false
    });
    Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
  }

  /** Buat chart baru; chart lama dengan nama sama dihancurkan dulu. */
  function create(name, canvasId, config) {
    const canvas = $(canvasId);
    if (!canvas) return;
    if (charts[name]) charts[name].destroy();
    config.options = Object.assign({ responsive: true, maintainAspectRatio: false }, config.options);
    config.plugins = [hoverFocus];
    charts[name] = new Chart(canvas, config);
    debug('chart dibuat:', name);
  }

  /** Legend memakai warna asli, tidak ikut meredup saat ada elemen yang disorot. */
  function legendLabels(chart) {
    const type = chart.config.type;
    const generate = (Chart.overrides[type] && Chart.overrides[type].plugins && Chart.overrides[type].plugins.legend
      && Chart.overrides[type].plugins.legend.labels && Chart.overrides[type].plugins.legend.labels.generateLabels)
      || Chart.defaults.plugins.legend.labels.generateLabels;
    const focus = chart.$focus;
    chart.$focus = null;
    try { return generate.call(this, chart); } finally { chart.$focus = focus; }
  }

  const baseLegend = () => ({
    position: 'bottom',
    labels: { usePointStyle: true, boxWidth: 8, padding: 16, generateLabels: legendLabels }
  });
  const axisTitle = (text) => ({ display: true, text });

  /* ---------------------------------------------------------------
     KPI CARDS
     --------------------------------------------------------------- */
  function renderKpis() {
    const technologies = new Set();
    projects.forEach((p) => (p.tech_stack || []).forEach((t) => technologies.add(t)));

    const inProgress = projects.filter((p) => p.status === 'in-progress').length;
    const total = SKILLS.reduce((sum, s) => sum + s.level, 0);
    const average = (total / SKILLS.length).toFixed(1);

    const kpis = [
      { value: projects.length, label: 'Published projects' },
      { value: inProgress, label: 'In progress' },
      { value: technologies.size, label: 'Technologies used' },
      { value: average, label: 'Average skill level' }
    ];

    $('kpi-row').innerHTML = kpis.map((k) => `
      <div class="col-6 col-lg-3">
        <div class="card kpi">
          <div class="kpi-value">${k.value}</div>
          <div class="kpi-label">${k.label}</div>
        </div>
      </div>`).join('');
  }

  /* ---------------------------------------------------------------
     1. BAR — skill level + filter (programmatic update)
     --------------------------------------------------------------- */
  const skillsInGroup = () => SKILLS.filter((s) => activeGroup === 'All' || s.group === activeGroup);

  function renderSkillChart() {
    const items = skillsInGroup();
    create('skills', 'chart-skills', {
      type: 'bar',
      data: {
        labels: items.map((s) => s.name),
        datasets: [{
          label: 'Skill level',
          data: items.map((s) => s.level),
          // Scriptable option: fungsi dijalankan untuk SETIAP batang
          backgroundColor: focusColor((ctx) => levelColor(ctx.parsed.y)),
          borderRadius: 6,
          maxBarThickness: 44
        }]
      },
      options: {
        plugins: { legend: { display: false }, hoverFocus: { dim: true } },
        scales: { y: { min: 0, max: 10, ticks: { stepSize: 2 } }, x: { grid: { display: false } } }
      }
    });

    $('skill-legend').innerHTML = [
      ['≥ 8 strong', palette()[1]], ['6–7 proficient', palette()[0]], ['< 6 learning', palette()[2]]
    ].map(([text, color]) => `<span class="me-3"><span class="legend-dot" style="background:${color}"></span>${text}</span>`).join('');
  }

  /** Dipanggil saat tombol filter diklik: ganti data, lalu chart.update(). */
  function updateSkillChart(group) {
    activeGroup = group;
    const items = skillsInGroup();
    const chart = charts.skills;
    chart.data.labels = items.map((s) => s.name);
    chart.data.datasets[0].data = items.map((s) => s.level);
    chart.update();
    debug('filter skill:', group, items.length, 'item');
  }

  function renderSkillFilter() {
    const groups = ['All', ...new Set(SKILLS.map((s) => s.group))];
    const box = $('skill-filter');
    box.innerHTML = groups
      .map((g) => `<button type="button" class="chip" data-group="${g}" aria-pressed="${g === activeGroup}">${g}</button>`)
      .join('');
    // satu listener untuk semua tombol (event delegation)
    box.onclick = (event) => {
      const button = event.target.closest('.chip');
      if (!button) return;
      box.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      updateSkillChart(button.dataset.group);
    };
  }

  /* ---------------------------------------------------------------
     2. PIE — project per kategori
     --------------------------------------------------------------- */
  function renderCategoryChart() {
    const counts = countBy(projects, (p) => p.category || 'Other');
    create('categories', 'chart-categories', {
      type: 'pie',
      data: {
        labels: Object.keys(counts),
        datasets: [{ data: Object.values(counts), backgroundColor: focusColor(palette()), borderColor: cssVar('--surface'), borderWidth: 3 }]
      },
      options: { plugins: { legend: baseLegend(), hoverFocus: { dim: true } } }
    });
  }

  /* ---------------------------------------------------------------
     3. LINE — learning progress
     --------------------------------------------------------------- */
  function renderProgressChart() {
    const colors = palette();
    const datasets = Object.entries(PROGRESS).map(([name, values], i) => ({
      label: name,
      data: values,
      borderColor: colors[i],
      backgroundColor: colors[i],
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 7
    }));
    create('progress', 'chart-progress', {
      type: 'line',
      data: { labels: PROGRESS_YEARS, datasets },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: baseLegend() },
        scales: { y: { min: 0, max: 10, title: axisTitle('Level (1–10)') } }
      }
    });
  }

  /* ---------------------------------------------------------------
     4. STACKED BAR — status project per kategori
     --------------------------------------------------------------- */
  function renderStatusChart() {
    const categories = [...new Set(projects.map((p) => p.category || 'Other'))];
    const colors = palette();
    const statuses = Object.keys(STATUS_LABEL).filter((s) => projects.some((p) => p.status === s));

    const datasets = statuses.map((status, i) => ({
      label: STATUS_LABEL[status],
      data: categories.map((c) => projects.filter((p) => (p.category || 'Other') === c && p.status === status).length),
      backgroundColor: focusColor(colors[i]),
      borderRadius: 4
    }));

    create('status', 'chart-status', {
      type: 'bar',
      data: { labels: categories, datasets },
      options: {
        plugins: { legend: baseLegend(), hoverFocus: { dim: true } },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, ticks: { precision: 0 }, title: axisTitle('Projects') }
        }
      }
    });
  }

  /* ---------------------------------------------------------------
     5. SCATTER — tahun pengalaman vs level (satu dataset per group)
     --------------------------------------------------------------- */
  function renderScatterChart() {
    const colors = palette();
    const groups = [...new Set(SKILLS.map((s) => s.group))];
    const datasets = groups.map((group, i) => ({
      label: group,
      data: SKILLS.filter((s) => s.group === group).map((s) => ({ x: s.years, y: s.level, name: s.name })),
      backgroundColor: focusColor(colors[i]),
      pointRadius: 7,
      pointHoverRadius: 10
    }));

    create('scatter', 'chart-scatter', {
      type: 'scatter',
      data: { datasets },
      options: {
        plugins: {
          legend: baseLegend(),
          hoverFocus: { dim: true },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw.name}: ${ctx.raw.x} yrs, level ${ctx.raw.y}`
            }
          }
        },
        scales: {
          x: { min: 0, max: 5, title: axisTitle('Years of experience') },
          y: { min: 0, max: 10, title: axisTitle('Skill level (1–10)') }
        }
      }
    });
  }

  /* ---------------------------------------------------------------
     PUBLIC API
     --------------------------------------------------------------- */
  function drawCharts() {
    applyDefaults();
    renderSkillChart();
    renderCategoryChart();
    renderProgressChart();
    renderStatusChart();
    renderScatterChart();
  }

  /** Dipanggil main.js setelah konten dimuat. */
  function render(content) {
    if (typeof Chart === 'undefined') {
      debug('Chart.js tidak termuat, dashboard disembunyikan');
      $('dashboard').hidden = true;
      return;
    }
    projects = content.projects || [];
    renderKpis();
    renderSkillFilter();
    drawCharts();
  }

  // Warna chart diambil dari CSS variable → gambar ulang saat tema berganti
  document.addEventListener('themechange', () => {
    if (Object.keys(charts).length) drawCharts();
  });

  // Setelan reduced-motion berubah → gambar ulang dengan/ tanpa animasi
  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener('change', () => {
      if (Object.keys(charts).length) drawCharts();
    });
  }

  // Di HP sorotan tetap tampil setelah disentuh; sentuh di luar chart untuk menutupnya
  document.addEventListener('touchstart', (event) => {
    Object.values(charts).forEach((chart) => {
      if (event.target !== chart.canvas) clearFocus(chart);
    });
  }, { passive: true });

  window.Dashboard = { render };
})();
