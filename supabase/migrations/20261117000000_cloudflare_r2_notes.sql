alter table public.notes
  add column if not exists file_name text,
  add column if not exists file_size_bytes bigint,
  add column if not exists content_type text;

create policy "Instructors can read their own courses"
  on public.courses
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    and (select public.is_course_editor())
  );

drop policy if exists "Signed-in users can read published notes"
  on public.notes;
create policy "Signed-in users can read published notes"
  on public.notes
  for select
  to authenticated
  using (
    is_published
    and (
      course_id is null
      or exists (
        select 1
        from public.courses
        where courses.id = notes.course_id
          and courses.is_published
      )
    )
  );

create policy "Instructors can read notes on their own courses"
  on public.notes
  for select
  to authenticated
  using (
    (select public.is_course_editor())
    and exists (
      select 1
      from public.courses
      where courses.id = notes.course_id
        and courses.created_by = (select auth.uid())
    )
  );

create policy "Instructors can add notes to their own courses"
  on public.notes
  for insert
  to authenticated
  with check (
    (select public.is_course_editor())
    and exists (
      select 1
      from public.courses
      where courses.id = notes.course_id
        and courses.created_by = (select auth.uid())
    )
  );

create policy "Instructors can update notes on their own courses"
  on public.notes
  for update
  to authenticated
  using (
    (select public.is_course_editor())
    and exists (
      select 1
      from public.courses
      where courses.id = notes.course_id
        and courses.created_by = (select auth.uid())
    )
  )
  with check (
    (select public.is_course_editor())
    and exists (
      select 1
      from public.courses
      where courses.id = notes.course_id
        and courses.created_by = (select auth.uid())
    )
  );

create policy "Instructors can delete notes on their own courses"
  on public.notes
  for delete
  to authenticated
  using (
    (select public.is_course_editor())
    and exists (
      select 1
      from public.courses
      where courses.id = notes.course_id
        and courses.created_by = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.notes to authenticated;
