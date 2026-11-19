grant insert (id, full_name, contact_phone)
  on table public.profiles
  to authenticated;

drop policy if exists "Users can create their own profile" on public.profiles;

create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);
