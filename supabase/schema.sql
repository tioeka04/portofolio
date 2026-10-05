-- =====================================================================
-- PORTFOLIO CMS — SUPABASE SCHEMA
-- Jalankan SEKALI di: Supabase Dashboard → SQL Editor → New query → Run
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

-- ---------- 1. ADMIN ALLOWLIST ----------------------------------------
-- Hanya user yang user_id-nya ada di tabel ini yang bisa edit konten.
-- Jadi walaupun ada orang yang berhasil sign-up, dia TIDAK bisa edit apa pun.
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

drop policy if exists "admin can read admin list" on public.admin_users;
create policy "admin can read admin list" on public.admin_users
  for select using (public.is_admin());

-- ---------- 2. updated_at helper --------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- 3. PROFILE (1 baris saja) ---------------------------------
create table if not exists public.profile (
  id            int primary key default 1 check (id = 1),
  name          text not null default '',
  headline      text not null default '',
  bio           text not null default '',
  location      text not null default '',
  email         text not null default '',
  github_url    text not null default '',
  linkedin_url  text not null default '',
  avatar_url    text not null default '',
  resume_url    text not null default '',
  open_to_work  boolean not null default true,
  updated_at    timestamptz not null default now()
);
insert into public.profile (id) values (1) on conflict (id) do nothing;

-- ---------- 4. PROJECTS -----------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null check (char_length(title) between 1 and 150),
  summary      text not null default '' check (char_length(summary) <= 400),
  description  text not null default '',          -- case study (format sederhana, lihat README)
  role         text not null default '',          -- peran kamu di project
  category     text not null default '',          -- mis. Backend, Full Stack, AI/ML
  status       text not null default 'completed'
               check (status in ('completed','in-progress','archived')),
  tech_stack   text[] not null default '{}',
  highlights   text[] not null default '{}',      -- poin pencapaian / fitur utama
  repo_url     text not null default '',
  demo_url     text not null default '',
  image_url    text not null default '',
  year         int,
  featured     boolean not null default false,
  published    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists projects_order_idx on public.projects (sort_order, created_at desc);

-- ---------- 5. EXPERIENCES (kerja, pendidikan, organisasi) ------------
create table if not exists public.experiences (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'work'
                check (kind in ('work','education','organization','certification')),
  title         text not null,
  organization  text not null default '',
  location      text not null default '',
  start_label   text not null default '',          -- mis. "Sep 2022"
  end_label     text not null default '',          -- kosong = "Present"
  description   text not null default '',
  highlights    text[] not null default '{}',
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- 6. SKILL GROUPS -------------------------------------------
create table if not exists public.skill_groups (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  items       text[] not null default '{}',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- 7. MESSAGES (form kontak) ---------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  email       text not null check (char_length(email) between 3 and 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message     text not null check (char_length(message) between 5 and 5000),
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- 8. TRIGGERS updated_at ------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profile','projects','experiences','skill_groups'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s
                    for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- 9. ROW LEVEL SECURITY -------------------------------------
alter table public.profile      enable row level security;
alter table public.projects     enable row level security;
alter table public.experiences  enable row level security;
alter table public.skill_groups enable row level security;
alter table public.messages     enable row level security;

-- PROFILE: publik boleh baca, hanya admin boleh ubah
drop policy if exists "public read profile" on public.profile;
create policy "public read profile" on public.profile for select using (true);
drop policy if exists "admin write profile" on public.profile;
create policy "admin write profile" on public.profile for all
  using (public.is_admin()) with check (public.is_admin());

-- PROJECTS: publik hanya lihat yang published; admin lihat & ubah semua
drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects" on public.projects for select
  using (published = true or public.is_admin());
drop policy if exists "admin write projects" on public.projects;
create policy "admin write projects" on public.projects for all
  using (public.is_admin()) with check (public.is_admin());

-- EXPERIENCES
drop policy if exists "public read experiences" on public.experiences;
create policy "public read experiences" on public.experiences for select using (true);
drop policy if exists "admin write experiences" on public.experiences;
create policy "admin write experiences" on public.experiences for all
  using (public.is_admin()) with check (public.is_admin());

-- SKILLS
drop policy if exists "public read skills" on public.skill_groups;
create policy "public read skills" on public.skill_groups for select using (true);
drop policy if exists "admin write skills" on public.skill_groups;
create policy "admin write skills" on public.skill_groups for all
  using (public.is_admin()) with check (public.is_admin());

-- MESSAGES: siapa pun boleh KIRIM (insert), hanya admin boleh BACA/ubah/hapus
drop policy if exists "anyone can send message" on public.messages;
create policy "anyone can send message" on public.messages for insert
  with check (is_read = false);
drop policy if exists "admin read messages" on public.messages;
create policy "admin read messages" on public.messages for select using (public.is_admin());
drop policy if exists "admin update messages" on public.messages;
create policy "admin update messages" on public.messages for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete messages" on public.messages;
create policy "admin delete messages" on public.messages for delete using (public.is_admin());

-- ---------- 10. STORAGE (gambar project, foto, CV PDF) ----------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 5242880,
        array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read portfolio files" on storage.objects;
create policy "public read portfolio files" on storage.objects for select
  using (bucket_id = 'portfolio');
drop policy if exists "admin upload portfolio files" on storage.objects;
create policy "admin upload portfolio files" on storage.objects for insert
  with check (bucket_id = 'portfolio' and public.is_admin());
drop policy if exists "admin update portfolio files" on storage.objects;
create policy "admin update portfolio files" on storage.objects for update
  using (bucket_id = 'portfolio' and public.is_admin());
drop policy if exists "admin delete portfolio files" on storage.objects;
create policy "admin delete portfolio files" on storage.objects for delete
  using (bucket_id = 'portfolio' and public.is_admin());

-- =====================================================================
-- SETELAH SCRIPT INI SELESAI:
-- 1) Authentication → Users → "Add user" → isi email + password kamu
--    (centang "Auto Confirm User").
-- 2) Authentication → Sign In / Providers → MATIKAN "Allow new users to sign up".
-- 3) Jalankan query di bawah (ganti emailnya) supaya akun kamu jadi admin:
--
--    insert into public.admin_users (user_id)
--    select id from auth.users where email = 'friaditioeka@gmail.com'
--    on conflict do nothing;
-- =====================================================================
