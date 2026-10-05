/* =====================================================================
   KONTEN CADANGAN (FALLBACK)
   ---------------------------------------------------------------------
   Dipakai kalau Supabase belum dikonfigurasi / sedang tidak bisa diakses,
   supaya website tidak pernah tampil kosong.
   Di admin panel ada tombol "Import konten awal" yang menyalin isi file
   ini ke database — setelah itu, edit semuanya lewat /admin.html.
   ===================================================================== */
window.PORTFOLIO_FALLBACK = {
  profile: {
    name: 'Tio Eka Friadi',
    headline: 'Backend & Full Stack Developer',
    bio: 'Informatics student at Universitas Mercu Buana (GPA 3.95/4.00) focused on backend engineering — designing databases, building REST APIs, and integrating AI services into real products. I like turning messy real-world problems into clean, reliable systems, a mindset shaped by running my own e-commerce business before university.',
    location: 'Indonesia',
    email: 'friaditioeka@gmail.com',
    github_url: 'https://github.com/tio-ekafriadi',
    linkedin_url: 'https://www.linkedin.com/in/tio-eka-friadi-b8444a2ab',
    avatar_url: '',
    resume_url: '',
    open_to_work: true
  },

  projects: [
    {
      slug: 'portfolio-cms',
      title: 'Portfolio CMS with Row Level Security',
      summary: 'This website. A static frontend backed by Supabase (PostgreSQL) with an authenticated admin panel to manage projects, experience, skills and contact messages.',
      description: 'A long-lived personal site that I can update without touching code.\n\n**Architecture**\n- Static HTML/CSS/JS frontend, no build step, deployable to any static host\n- Supabase PostgreSQL as the data layer, Supabase Storage for images and the CV\n- Admin authentication with Supabase Auth\n\n**Security**\n- Row Level Security on every table: public can only read published content\n- Admin allowlist table + `is_admin()` function, so a stray sign-up cannot edit anything\n- Contact form writes to an insert-only table guarded by database CHECK constraints\n- All user content is HTML-escaped before rendering (no XSS)',
      role: 'Solo — design, database, frontend, admin panel',
      category: 'Full Stack',
      status: 'completed',
      tech_stack: ['PostgreSQL', 'Supabase', 'Row Level Security', 'JavaScript', 'HTML', 'CSS'],
      highlights: ['RLS-secured CRUD admin panel', 'Image & PDF uploads via Supabase Storage', 'Graceful offline fallback'],
      repo_url: '', demo_url: '', image_url: '', year: 2026, featured: true, published: true, sort_order: 1
    },
    {
      slug: 'cekongkir-ai',
      title: 'CekOngkir AI — Shipping Cost Chatbot',
      summary: 'A chatbot that understands natural-language questions like “ongkir Jakarta ke Solo 2kg pakai JNE” and returns real Indonesian shipping rates.',
      description: '**Problem**\nChecking shipping costs across couriers means filling the same form again and again.\n\n**Solution**\nUsers just type a sentence. The backend uses an LLM (Groq API) to extract origin, destination, weight and courier, then queries the RajaOngkir API and returns the rates in a chat interface.\n\n**My work**\n- Built the Node.js backend that connects the LLM extraction step to RajaOngkir\n- Connected the React Native / React app to the real backend\n- Used Supabase for persistence\n- Produced the flowcharts and feature-mapping diagrams',
      role: 'Backend & integration',
      category: 'Full Stack',
      status: 'completed',
      tech_stack: ['Node.js', 'React Native', 'React', 'TypeScript', 'Supabase', 'Groq API', 'RajaOngkir API'],
      highlights: ['LLM-based entity extraction from free text', 'Third-party API orchestration'],
      repo_url: '', demo_url: '', image_url: '', year: null, featured: true, published: true, sort_order: 2
    },
    {
      slug: 'ai-text-detection-capstone',
      title: 'Hybrid AI-Generated Text Detection (Capstone)',
      summary: 'Bilingual (Indonesian–English) classifier that detects AI-generated fake news by fusing XLM-RoBERTa embeddings, KenLM perplexity and stylometric features.',
      description: '**Research question**\nCan combining a transformer with statistical language-model signals detect AI-generated news better than either alone, in both Indonesian and English?\n\n**Pipeline**\n- Dataset: 12,000 texts (6,000 Indonesian + 6,000 English), balanced 50:50 human vs AI-generated\n- Human data via stratified sampling from Kaggle; AI data generated with the Gemini API\n- Features: XLM-RoBERTa CLS embedding (768-d) + KenLM perplexity (1-d) + stylometry (3-d) → 772-d fused vector\n- Classifier: Random Forest\n- Planned: served as a microservice API for the team application',
      role: 'Researcher — data pipeline, feature engineering, modelling',
      category: 'AI / ML',
      status: 'in-progress',
      tech_stack: ['Python', 'XLM-RoBERTa', 'Hugging Face', 'KenLM', 'scikit-learn', 'Gemini API'],
      highlights: ['772-dimension feature fusion', 'Bilingual 12k-sample dataset'],
      repo_url: '', demo_url: '', image_url: '', year: 2026, featured: true, published: true, sort_order: 3
    },
    {
      slug: 'donation-platform',
      title: 'Creator Donation Platform (Saweria-style)',
      summary: 'Backend architecture for an Indonesian tipping platform: payment gateway integration, job queues, and real-time on-stream alerts.',
      description: '**Scope**\nA platform where viewers send tips to content creators and the creator\'s stream shows a live alert.\n\n**Architecture**\n- Relational schema in PostgreSQL for creators, donations, payouts\n- Payment gateway integration (Midtrans, Xendit, QRIS) with webhook handling\n- Redis + BullMQ for background jobs\n- WebSocket channel pushing real-time alerts to an OBS browser source\n- Phased roadmap from MVP to production',
      role: 'System design & backend',
      category: 'Backend',
      status: 'in-progress',
      tech_stack: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis', 'BullMQ', 'WebSocket', 'Midtrans'],
      highlights: ['Payment webhook flow', 'Real-time alerts via WebSocket'],
      repo_url: '', demo_url: '', image_url: '', year: null, featured: false, published: true, sort_order: 4
    },
    {
      slug: 'numpy-ml-from-scratch',
      title: 'ML Pipeline from Scratch in NumPy',
      summary: 'Custom normalization, a custom optimizer and Softmax Regression implemented with NumPy only — 93.75% test accuracy on Mobile Price Classification.',
      description: 'Built every component without ML libraries to connect the math (Calculus II) to working code.\n\n- Custom LQSN normalization method\n- Custom gradient-based optimizer (DIS-Optimizer)\n- Polynomial feature expansion\n- Softmax Regression trained from scratch\n- **Result:** ~93.75% test accuracy',
      role: 'Solo',
      category: 'AI / ML',
      status: 'completed',
      tech_stack: ['Python', 'NumPy'],
      highlights: ['No ML frameworks used', '93.75% test accuracy'],
      repo_url: '', demo_url: '', image_url: '', year: null, featured: false, published: true, sort_order: 5
    }
  ],

  experiences: [
    {
      kind: 'education', title: 'B.Sc. Informatics (Teknik Informatika)', organization: 'Universitas Mercu Buana',
      location: 'Jakarta', start_label: '2022', end_label: '',
      description: 'GPA 3.95 / 4.00. Coursework in software engineering, databases, machine learning and computer vision.',
      highlights: [], sort_order: 1
    },
    {
      kind: 'work', title: 'E-Commerce Owner & Manager', organization: 'Self-Employed',
      location: 'Indonesia', start_label: '2020', end_label: '2022',
      description: 'Ran an online store end to end.',
      highlights: ['Integrated logistics/shipping APIs into store operations', 'Analyzed sales data to guide pricing and stock decisions'],
      sort_order: 2
    },
    {
      kind: 'organization', title: 'Secretary', organization: 'UMB Esport',
      location: 'Universitas Mercu Buana', start_label: '', end_label: '',
      description: 'Served one term managing administration and documentation for the university esports community.',
      highlights: [], sort_order: 3
    }
  ],

  skill_groups: [
    { category: 'Languages', items: ['JavaScript', 'TypeScript', 'Python', 'SQL'], sort_order: 1 },
    { category: 'Backend', items: ['Node.js', 'Express', 'REST API', 'Supabase'], sort_order: 2 },
    { category: 'Databases', items: ['PostgreSQL', 'MySQL', 'MongoDB Atlas'], sort_order: 3 },
    { category: 'Frontend', items: ['React', 'React Native', 'HTML', 'CSS'], sort_order: 4 },
    { category: 'AI / Data', items: ['NumPy', 'Pandas', 'scikit-learn', 'Hugging Face', 'Gemini API', 'Groq API'], sort_order: 5 },
    { category: 'Tools', items: ['Git', 'GitHub', 'Postman', 'Draw.io', 'Google Colab'], sort_order: 6 }
  ]
};
