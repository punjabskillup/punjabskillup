alter table public.profiles
  add column contact_email text;

grant update (contact_email) on public.profiles to authenticated;

update public.profiles
set contact_email = auth.users.email
from auth.users
where profiles.id = auth.users.id
  and profiles.contact_email is null
  and auth.users.email is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, contact_email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  );
  return new;
end;
$$;
