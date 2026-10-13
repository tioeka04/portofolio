-- =====================================================================
-- Tambah galeri foto (maks 5) ke tabel projects
-- Jalankan SEKALI: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

-- 1. Kolom daftar foto. Foto pertama = cover (image_url tetap dipakai sebagai cover).
alter table public.projects
  add column if not exists images text[] not null default '{}';

-- 2. Batasi maksimal 5 foto di level database
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_images_max') then
    alter table public.projects
      add constraint projects_images_max check (cardinality(images) <= 5);
  end if;
end $$;

-- 3. Project lama: pindahkan image_url yang sudah ada menjadi foto pertama
update public.projects
   set images = array[image_url]
 where image_url <> '' and cardinality(images) = 0;
