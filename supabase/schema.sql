-- ============================================================
-- PT. JUAARA — Skema Supabase
-- 1) Buat project di https://supabase.com/dashboard
-- 2) SQL Editor → paste seluruh file ini → Run
-- 3) Authentication → Providers → aktifkan "Google",
--    isi Client ID & Client Secret dari Google Cloud Console
--    (OAuth consent screen + OAuth 2.0 Client ID, tipe Web)
-- 4) Authentication → URL Configuration → Site URL & Redirect URLs
--    tambahkan: https://juaraind.com
-- ============================================================

create extension if not exists "pgcrypto";
create sequence if not exists public.candidate_id_seq start 1;

-- ------------------------------------------------------------
-- 1. Tabel kandidat
-- ------------------------------------------------------------
create table if not exists public.candidates (
  id             uuid primary key references auth.users(id) on delete cascade,
  candidate_id   text unique not null,              -- contoh: TKI-2026-00001
  full_name      text not null default '' check (char_length(full_name) <= 160),
  birth_place    text check (birth_place is null or char_length(birth_place) <= 100),
  birth_date     date,
  gender         text check (gender is null or gender in ('Laki-laki', 'Perempuan')),
  phone          text check (phone is null or char_length(phone) <= 32),
  address        text check (address is null or char_length(address) <= 500),
  province       text check (province is null or char_length(province) <= 100),
  city           text check (city is null or char_length(city) <= 100),
  postal_code    text check (postal_code is null or char_length(postal_code) <= 10),
  position       text check (position is null or position in (
    'F&B Service (Waiter/Waitress)', 'Housekeeping',
    'Front Office / Receptionist', 'Kitchen / Pastry',
    'Guest Relations', 'Spa & Wellness Therapist',
    'Animation / Kids Club', 'Barista / Bartender'
  )),
  experience     text check (experience is null or char_length(experience) <= 2000),
  status         text not null default 'Pendaftaran Baru' check (status in (
    'Pendaftaran Baru', 'Terdaftar — Menunggu Seleksi', 'Dalam Seleksi',
    'Lolos', 'Ditolak', 'Ditempatkan'
  )),
  created_at     timestamptz not null default now()
);

-- Tambahkan field biodata untuk project yang sudah memiliki tabel candidates.
-- IF NOT EXISTS membuat blok ini aman dijalankan ulang.
alter table public.candidates
  add column if not exists birth_place text check (birth_place is null or char_length(birth_place) <= 100),
  add column if not exists birth_date date,
  add column if not exists gender text check (gender is null or gender in ('Laki-laki', 'Perempuan')),
  add column if not exists address text check (address is null or char_length(address) <= 500),
  add column if not exists province text check (province is null or char_length(province) <= 100),
  add column if not exists city text check (city is null or char_length(city) <= 100),
  add column if not exists postal_code text check (postal_code is null or char_length(postal_code) <= 10);

-- Migrasi aman untuk project yang sudah pernah menjalankan schema lama.
-- ID lama yang kosong akan diterbitkan ulang sebelum NOT NULL diterapkan.
do $$
declare
  candidate_row record;
  generated_id text;
begin
  for candidate_row in
    select id, coalesce(created_at, now()) as created_at
    from public.candidates
    where candidate_id is null or candidate_id = ''
  loop
    loop
      generated_id := 'TKI-' || to_char(candidate_row.created_at, 'YYYY') || '-' || lpad(nextval('public.candidate_id_seq')::text, 5, '0');
      exit when not exists (select 1 from public.candidates where candidate_id = generated_id);
    end loop;
    update public.candidates set candidate_id = generated_id where id = candidate_row.id;
  end loop;
end $$;
update public.candidates set full_name = '' where full_name is null;
alter table public.candidates alter column candidate_id set not null;
alter table public.candidates alter column full_name set default '';
alter table public.candidates alter column full_name set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'candidates_full_name_length') then
    alter table public.candidates add constraint candidates_full_name_length check (char_length(full_name) <= 160);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'candidates_phone_length') then
    alter table public.candidates add constraint candidates_phone_length check (phone is null or char_length(phone) <= 32);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'candidates_experience_length') then
    alter table public.candidates add constraint candidates_experience_length check (experience is null or char_length(experience) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'candidates_position_allowed') then
    alter table public.candidates add constraint candidates_position_allowed check (position is null or position in (
      'F&B Service (Waiter/Waitress)', 'Housekeeping', 'Front Office / Receptionist',
      'Kitchen / Pastry', 'Guest Relations', 'Spa & Wellness Therapist',
      'Animation / Kids Club', 'Barista / Bartender'
    ));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'candidates_status_allowed') then
    alter table public.candidates add constraint candidates_status_allowed check (status in (
      'Pendaftaran Baru', 'Terdaftar — Menunggu Seleksi', 'Dalam Seleksi',
      'Lolos', 'Ditolak', 'Ditempatkan'
    ));
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Sequence + function pembuat candidate_id (server-side,
--    bukan random di client, agar anti-tabrakan & berurutan)
-- ------------------------------------------------------------
create or replace function public.generate_candidate_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  seq text;
begin
  select lpad(nextval('public.candidate_id_seq')::text, 5, '0') into seq;
  new.candidate_id := 'TKI-' || to_char(now(), 'YYYY') || '-' || seq; -- TKI-2026-00001
  return new;
end;
$$;

drop trigger if exists on_candidate_created on public.candidates;
create trigger on_candidate_created
  before insert on public.candidates
  for each row execute function public.generate_candidate_id();

revoke all on function public.generate_candidate_id() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3. Row Level Security: setiap kandidat hanya boleh melihat
--    dan mengubah field profil miliknya sendiri.
-- ------------------------------------------------------------
alter table public.candidates enable row level security;

-- Jangan berikan hak tulis umum lewat PostgREST. Baris dibuat oleh trigger
-- auth di bawah; kandidat hanya boleh mengubah empat field profil.
revoke all on table public.candidates from anon, authenticated;
revoke all on sequence public.candidate_id_seq from anon, authenticated;
grant select on table public.candidates to authenticated;
grant update (
  full_name, birth_place, birth_date, gender, phone, address,
  province, city, postal_code, position, experience
)
  on table public.candidates to authenticated;

drop policy if exists "Kandidat mengisi data sendiri" on public.candidates;
drop policy if exists "Kandidat melihat data sendiri" on public.candidates;
create policy "Kandidat melihat data sendiri"
  on public.candidates for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Kandidat mengubah data sendiri" on public.candidates;
create policy "Kandidat mengubah data sendiri"
  on public.candidates for update
  to authenticated
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

-- Fungsi trigger harus tetap dapat membuat baris walau INSERT publik dicabut.
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 5. Jangan expose view statistik ke API publik.
--    Statistik admin harus diambil dari dashboard/server menggunakan service role.
-- ------------------------------------------------------------
drop view if exists public.candidate_stats;
