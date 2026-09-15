alter table public.candidates
  add column if not exists birth_place text check (birth_place is null or char_length(birth_place) <= 100),
  add column if not exists birth_date date,
  add column if not exists gender text check (gender is null or gender in ('Laki-laki', 'Perempuan')),
  add column if not exists address text check (address is null or char_length(address) <= 500),
  add column if not exists province text check (province is null or char_length(province) <= 100),
  add column if not exists city text check (city is null or char_length(city) <= 100),
  add column if not exists postal_code text check (postal_code is null or char_length(postal_code) <= 10);

grant update (
  full_name, birth_place, birth_date, gender, phone, address,
  province, city, postal_code, position, experience
) on table public.candidates to authenticated;
