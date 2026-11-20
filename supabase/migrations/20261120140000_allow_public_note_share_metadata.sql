-- Allow signed-out visitors to load only the minimal metadata needed to show
-- the sign-in gate on a published note share page. File access stays protected
-- by the authenticated download route.
grant select (id, title, is_published, file_name, content_type)
  on table public.notes to anon;

drop policy if exists "Anonymous visitors can read published note share metadata"
  on public.notes;
create policy "Anonymous visitors can read published note share metadata"
  on public.notes
  for select
  to anon
  using (is_published);
