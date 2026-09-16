-- Keep existing candidate IDs unchanged and use IND for new candidates.
create or replace function public.generate_candidate_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  seq text;
begin
  select lpad(nextval('public.candidate_id_seq')::text, 5, '0') into seq;
  new.candidate_id := 'IND-' || to_char(now(), 'YYYY') || '-' || seq;
  return new;
end;
$$;

revoke all on function public.generate_candidate_id() from public, anon, authenticated;
