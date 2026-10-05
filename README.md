# Portfolio — Tio Eka Friadi

Website portofolio statis (HTML/CSS/JS murni, **tanpa build step**) dengan **admin CMS** berbasis Supabase.
Isi website (profil, project, pengalaman, skill) diedit dari `/admin.html`, tanpa perlu menyentuh kode.

```
index.html          Halaman utama
project.html        Halaman detail / case study tiap project (?slug=...)
cv.html             CV otomatis dari database (bisa Print → Save as PDF)
admin.html          Admin CMS (login)
404.html            Halaman tidak ditemukan
css/style.css       Style publik (warna utama: --accent)
css/admin.css       Style admin
js/supabase.js      ⚙️ KONFIGURASI: URL + anon key Supabase
js/data.js          Konten cadangan (dipakai kalau database tidak bisa diakses)
js/core.js          Helper bersama (escape HTML, load data, format teks)
js/main.js          Logika halaman utama
js/admin.js         Logika admin CMS
js/vendor/          Library Supabase (disimpan lokal, tidak tergantung CDN)
supabase/schema.sql Struktur database + keamanan (RLS) + storage
github-workflow/    Keep-alive Supabase (pindahkan ke .github/workflows/ sebelum push ke GitHub)
```

---

## 1. Setup Supabase (sekali saja, ±10 menit)

1. Buat akun & project baru di <https://supabase.com> (region **Southeast Asia (Singapore)**).
2. Buka **SQL Editor → New query**, salin seluruh isi `supabase/schema.sql`, lalu klik **Run**.
3. **Authentication → Users → Add user → Create new user**
   isi email + password kamu, centang **Auto Confirm User**.
4. **Authentication → Sign In / Providers → Email**: matikan **"Allow new users to sign up"**.
5. Kembali ke SQL Editor, jalankan (ganti email kalau beda):
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'friaditioeka@gmail.com'
   on conflict do nothing;
   ```
6. **Project Settings → API** (atau **API Keys**): salin **Project URL** dan **anon / publishable key**
   ke `js/supabase.js`:
   ```js
   const SUPABASE_URL = 'https://xxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJ...';   // atau sb_publishable_...
   ```
   > ⚠️ Jangan pernah pakai **service_role / secret key** di file ini.
7. Buka `admin.html` → login → klik **Import konten awal** (menyalin isi `js/data.js` ke database).
8. Lengkapi semuanya dari admin: foto, CV PDF, link GitHub tiap project, screenshot.

## 2. Deploy (gratis)

Pilih salah satu, semuanya mendukung custom domain + HTTPS:

| Host | Cara |
|---|---|
| **Cloudflare Pages** (disarankan) | Push folder ini ke GitHub → Cloudflare Pages → Connect repo → Build command: *(kosong)*, Output: `/` |
| **Netlify** | Drag & drop folder ini ke <https://app.netlify.com/drop>, atau connect repo |
| **Vercel** | Import repo → Framework: *Other* → deploy |
| **GitHub Pages** | Repo → Settings → Pages → Branch `main` / root |

Setelah punya domain:
- `index.html`: aktifkan baris `og:url` & `canonical`, dan ubah `og:image` jadi URL lengkap (`https://domainmu.com/assets/og-image.png`).
- `robots.txt`: aktifkan baris `Sitemap`, lalu buat `sitemap.xml` (opsional).
- Supabase → **Authentication → URL Configuration → Site URL**: isi domain kamu.

## 3. Supaya awet bertahun-tahun

- **Project Supabase gratis di-pause kalau tidak ada aktivitas ±7 hari.** Selama di-pause, website tetap tampil memakai `js/data.js`, tapi isinya bisa ketinggalan.
  Solusi: push repo ke GitHub, tambahkan secret `SUPABASE_URL` & `SUPABASE_ANON_KEY` di **Settings → Secrets → Actions**. Pindahkan `github-workflow/keep-supabase-awake.yml` ke folder `.github/workflows/` (buat foldernya), lalu workflow itu akan "menyapa" database tiap 3 hari. Kalau nanti sudah kerja, upgrade ke Supabase Pro supaya lebih aman.
- **Backup**: sesekali buka Supabase → **Database → Backups**, atau export tabel dari Table Editor (CSV).
- **Sinkronkan `js/data.js`** setahun sekali dengan isi terbaru, sebagai cadangan.
- Tidak ada framework/build tool, jadi tidak ada dependency yang "kedaluwarsa". Library Supabase disimpan lokal di `js/vendor/`.
  Update opsional: download `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js` → timpa `js/vendor/supabase.min.js`.

## 4. Cara pakai admin

| Menu | Fungsi |
|---|---|
| **Projects** | Tambah/edit/hapus, upload screenshot, Draft ↔ Published, Featured, urutan (↑ ↓) |
| **Profil** | Nama, headline, bio, link, foto, upload CV PDF, badge "Open to work" |
| **Pengalaman** | Kerja, magang, pendidikan, organisasi, sertifikasi |
| **Skills** | Kelompok skill |
| **Pesan** | Pesan dari form kontak: tandai dibaca, balas via email, hapus |

**Format deskripsi project** (case study):
```
**Problem**
Satu-dua kalimat masalahnya.

**Solution**
- Poin pertama
- Poin dengan **tebal** dan `kode`
```

Tips isi project yang dilirik recruiter backend: *Problem → Solusi → Arsitektur (diagram/screenshot) → Peran kamu → Hasil (pakai angka)*, plus link GitHub dengan README yang jelas.

## 5. Keamanan (ringkas)

- Semua tabel memakai **Row Level Security**. Publik hanya bisa *membaca* konten yang published, dan *mengirim* pesan.
- Edit hanya bisa oleh user yang terdaftar di `admin_users` (fungsi `is_admin()`), jadi akun lain yang berhasil login pun tidak bisa mengubah apa-apa.
- Form kontak divalidasi di database (CHECK constraint), plus honeypot dan jeda 60 detik di browser.
- Semua teks di-escape sebelum ditampilkan (anti-XSS); link hanya boleh `http(s)`/`mailto`.
