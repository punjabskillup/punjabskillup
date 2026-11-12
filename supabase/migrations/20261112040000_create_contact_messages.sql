create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint contact_messages_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint contact_messages_email_length check (char_length(btrim(email)) between 3 and 254),
  constraint contact_messages_message_length check (char_length(btrim(message)) between 1 and 5000)
);

alter table public.contact_messages enable row level security;

revoke all on public.contact_messages from public, anon, authenticated;
grant insert (name, email, message) on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;

create policy "Anyone can submit a contact message"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 120
    and char_length(btrim(email)) between 3 and 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    and char_length(btrim(message)) between 1 and 5000
  );

create policy "Admins can read contact messages"
  on public.contact_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );
