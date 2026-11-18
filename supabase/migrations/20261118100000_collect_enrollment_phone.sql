alter table public.profiles
  add column contact_phone text;

grant update (contact_phone) on public.profiles to authenticated;
