grant insert, update on table public.courses to authenticated;

drop policy if exists "Instructors can create their own courses"
  on public.courses;
create policy "Instructors can create their own courses"
  on public.courses
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.is_course_editor())
  );

drop policy if exists "Instructors can update their own courses"
  on public.courses;
create policy "Instructors can update their own courses"
  on public.courses
  for update
  to authenticated
  using (
    created_by = (select auth.uid())
    and (select public.is_course_editor())
  )
  with check (
    created_by = (select auth.uid())
    and (select public.is_course_editor())
  );
