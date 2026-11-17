alter table public.courses
  add column if not exists slug text,
  add column if not exists thumbnail_path text,
  add column if not exists updated_at timestamptz not null default now();

update public.courses
set slug =
  coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'course'
  ) || '-' || left(id::text, 8)
where slug is null or length(trim(slug)) = 0;

alter table public.courses
  alter column slug set not null,
  alter column created_by drop not null;

create unique index if not exists courses_slug_unique_idx
  on public.courses (slug);

alter table public.lectures
  add column if not exists is_free boolean not null default false,
  add column if not exists is_published boolean not null default false;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  body text,
  file_path text,
  is_free boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (body is not null or file_path is not null)
);

alter table public.courses enable row level security;
alter table public.lectures enable row level security;
alter table public.notes enable row level security;

revoke all on public.courses, public.lectures, public.notes
  from public, anon, authenticated;
grant select on public.courses, public.lectures, public.notes
  to authenticated;

drop policy if exists "Signed-in users can read published courses"
  on public.courses;
drop policy if exists "Instructors can create their own courses"
  on public.courses;
drop policy if exists "Instructors can update their own courses"
  on public.courses;
create policy "Signed-in users can read published courses"
  on public.courses
  for select
  to authenticated
  using (is_published);

drop policy if exists "Signed-in users can read lectures for readable courses"
  on public.lectures;
drop policy if exists "Instructors can add lectures to their own courses"
  on public.lectures;
drop policy if exists "Instructors can update lectures in their own courses"
  on public.lectures;
drop policy if exists "Signed-in users can read published lectures"
  on public.lectures;
create policy "Signed-in users can read published lectures"
  on public.lectures
  for select
  to authenticated
  using (
    is_published
    and exists (
      select 1
      from public.courses
      where courses.id = lectures.course_id
        and courses.is_published
    )
  );

drop policy if exists "Signed-in users can read published notes"
  on public.notes;
create policy "Signed-in users can read published notes"
  on public.notes
  for select
  to authenticated
  using (is_published);

insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', false)
on conflict (id) do update set public = false;

grant select on storage.objects to authenticated;
drop policy if exists "Signed-in users can read published course thumbnails"
  on storage.objects;
create policy "Signed-in users can read published course thumbnails"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'course-thumbnails'
    and exists (
      select 1
      from public.courses
      where courses.thumbnail_path = storage.objects.name
        and courses.is_published
    )
  );
