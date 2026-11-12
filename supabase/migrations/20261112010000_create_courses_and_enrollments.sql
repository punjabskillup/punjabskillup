create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  thumbnail_url text,
  price_inr integer not null default 0 check (price_inr >= 0),
  is_published boolean not null default false,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.lectures (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  position integer not null check (position > 0),
  video_provider text not null default 'youtube'
    check (video_provider in ('youtube')),
  video_ref text not null,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  unique (course_id, position)
);

create table public.enrollments (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create index courses_published_created_at_idx
  on public.courses (created_at desc)
  where is_published;
create index lectures_course_position_idx
  on public.lectures (course_id, position);
create index enrollments_course_id_idx
  on public.enrollments (course_id);

alter table public.courses enable row level security;
alter table public.lectures enable row level security;
alter table public.enrollments enable row level security;

create function public.is_course_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('instructor', 'admin')
  );
$$;

revoke all on function public.is_course_editor() from public;
grant execute on function public.is_course_editor() to authenticated;

grant select, insert, update on public.courses to authenticated;
grant select, insert, update on public.lectures to authenticated;
grant select, insert on public.enrollments to authenticated;

create policy "Signed-in users can read published courses"
  on public.courses
  for select
  to authenticated
  using (
    is_published
    or (created_by = (select auth.uid()) and (select public.is_course_editor()))
  );

create policy "Instructors can create their own courses"
  on public.courses
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (select public.is_course_editor())
  );

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

create policy "Signed-in users can read lectures for readable courses"
  on public.lectures
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.courses
      where courses.id = lectures.course_id
    )
  );

create policy "Instructors can add lectures to their own courses"
  on public.lectures
  for insert
  to authenticated
  with check (
    (select public.is_course_editor())
    and exists (
      select 1
      from public.courses
      where courses.id = lectures.course_id
        and courses.created_by = (select auth.uid())
    )
  );

create policy "Instructors can update lectures in their own courses"
  on public.lectures
  for update
  to authenticated
  using (
    (select public.is_course_editor())
    and exists (
      select 1
      from public.courses
      where courses.id = lectures.course_id
        and courses.created_by = (select auth.uid())
    )
  )
  with check (
    (select public.is_course_editor())
    and exists (
      select 1
      from public.courses
      where courses.id = lectures.course_id
        and courses.created_by = (select auth.uid())
    )
  );

create policy "Users can read their own enrollments"
  on public.enrollments
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can enroll themselves in published free courses"
  on public.enrollments
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.courses
      where courses.id = enrollments.course_id
        and courses.is_published
        and courses.price_inr = 0
    )
  );
