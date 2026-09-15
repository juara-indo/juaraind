-- ============================================================
-- PT. JUAARA — Skema Supabase
-- 1) Buat project di https://supabase.com/dashboard
-- 2) SQL Editor → paste seluruh file ini → Run
-- 3) Authentication → Providers → aktifkan "Google",
--    isi Client ID & Client Secret dari Google Cloud Console
--    (OAuth consent screen + OAuth 2.0 Client ID, tipe Web)
-- 4) Authentication → URL Configuration → Site URL & Redirect URLs
--    tambahkan: https://<username>.github.io/<nama-repo>/
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. Tabel kandidat
-- ------------------------------------------------------------
create table if not exists public.candidates (
  id             uuid primary key references auth.users(id) on delete cascade,
  candidate_id   text unique,                      -- contoh: TKI-2026-00001
  full_name      text,
  phone          text,
  position       text,                             -- posisi yang dipilih
  experience     text,                             -- pengalaman kerja singkat
  status         text not null default 'Pendaftaran Baru',
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. Sequence + function pembuat candidate_id (server-side,
--    bukan random di client, agar anti-tabrakan & berurutan)
-- ------------------------------------------------------------
create sequence if not exists public.candidate_id_seq start 1;

create or replace function public.generate_candidate_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  seq text;
begin
  if new.candidate_id is null or new.candidate_id = '' then
    select lpad(nextval('public.candidate_id_seq')::text, 5, '0') into seq;
    new.candidate_id := 'TKI-' || to_char(now(), 'YYYY') || '-' || seq; -- TKI-2026-00001
  end if;
  return new;
end;
$$;

drop trigger if exists on_candidate_created on public.candidates;
create trigger on_candidate_created
  before insert on public.candidates
  for each row execute function public.generate_candidate_id();

-- ------------------------------------------------------------
-- 3. Row Level Security: setiap kandidat hanya boleh melihat
--    dan mengubah baris miliknya sendiri
-- ------------------------------------------------------------
alter table public.candidates enable row level security;

drop policy if exists "Kandidat melihat data sendiri" on public.candidates;
create policy "Kandidat melihat data sendiri"
  on public.candidates for select
  using (auth.uid() = id);

drop policy if exists "Kandidat mengisi data sendiri" on public.candidates;
create policy "Kandidat mengisi data sendiri"
  on public.candidates for insert
  with check (auth.uid() = id);

drop policy if exists "Kandidat mengubah data sendiri" on public.candidates;
create policy "Kandidat mengubah data sendiri"
  on public.candidates for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- 4. Sync otomatis: begitu user login Google pertama kali,
--    buat baris kandidatnya + candidate_id langsung terbit
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.candidates (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 5. (Opsional) View ringkasan untuk admin/agency
--    Hitungan kandidat per posisi
-- ------------------------------------------------------------
create or replace view public.candidate_stats as
  select position, count(*) as total
  from public.candidates
  group by position;
