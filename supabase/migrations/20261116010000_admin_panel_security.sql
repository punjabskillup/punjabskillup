create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity text not null,
  entity_id text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
grant select, insert on public.admin_audit_log to authenticated;

create policy "Admins can read audit log"
  on public.admin_audit_log
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert their own audit rows"
  on public.admin_audit_log
  for insert
  to authenticated
  with check (public.is_admin() and admin_id = auth.uid());

create table if not exists public.admin_rate_limits (
  user_id uuid not null references public.admin_users (user_id) on delete cascade,
  bucket text not null check (bucket in ('admin-actions', 'admin-mfa')),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, bucket)
);

alter table public.admin_rate_limits enable row level security;
revoke all on public.admin_rate_limits from public, anon, authenticated;

create or replace function public.consume_admin_rate_limit(p_bucket text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_limit integer;
  v_count integer;
begin
  if v_user_id is null or not public.is_admin() then
    return false;
  end if;

  v_limit := case p_bucket
    when 'admin-actions' then 30
    when 'admin-mfa' then 5
    else null
  end;
  if v_limit is null then
    return false;
  end if;

  insert into public.admin_rate_limits (
    user_id, bucket, window_started_at, request_count
  )
  values (v_user_id, p_bucket, v_now, 1)
  on conflict (user_id, bucket) do update
  set
    window_started_at = case
      when public.admin_rate_limits.window_started_at <= v_now - interval '1 minute'
        then v_now
      else public.admin_rate_limits.window_started_at
    end,
    request_count = case
      when public.admin_rate_limits.window_started_at <= v_now - interval '1 minute'
        then 1
      else public.admin_rate_limits.request_count + 1
    end
  returning request_count into v_count;

  return v_count <= v_limit;
end;
$$;

revoke all on function public.consume_admin_rate_limit(text) from public, anon;
grant execute on function public.consume_admin_rate_limit(text) to authenticated;

grant select, insert, update, delete
  on public.courses, public.notes, public.lectures
  to authenticated;

drop policy if exists "Admins can read all courses" on public.courses;
drop policy if exists "Admins can insert courses" on public.courses;
drop policy if exists "Admins can update courses" on public.courses;
drop policy if exists "Admins can delete courses" on public.courses;
create policy "Admins can read all courses"
  on public.courses for select to authenticated
  using (public.is_admin());
create policy "Admins can insert courses"
  on public.courses for insert to authenticated
  with check (public.is_admin());
create policy "Admins can update courses"
  on public.courses for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete courses"
  on public.courses for delete to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all notes" on public.notes;
drop policy if exists "Admins can insert notes" on public.notes;
drop policy if exists "Admins can update notes" on public.notes;
drop policy if exists "Admins can delete notes" on public.notes;
create policy "Admins can read all notes"
  on public.notes for select to authenticated
  using (public.is_admin());
create policy "Admins can insert notes"
  on public.notes for insert to authenticated
  with check (public.is_admin());
create policy "Admins can update notes"
  on public.notes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete notes"
  on public.notes for delete to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all lectures" on public.lectures;
drop policy if exists "Admins can insert lectures" on public.lectures;
drop policy if exists "Admins can update lectures" on public.lectures;
drop policy if exists "Admins can delete lectures" on public.lectures;
create policy "Admins can read all lectures"
  on public.lectures for select to authenticated
  using (public.is_admin());
create policy "Admins can insert lectures"
  on public.lectures for insert to authenticated
  with check (public.is_admin());
create policy "Admins can update lectures"
  on public.lectures for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete lectures"
  on public.lectures for delete to authenticated
  using (public.is_admin());

revoke insert, update, delete on storage.objects from public, anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

drop policy if exists "Signed-in users can read published course thumbnails"
  on storage.objects;
drop policy if exists "Authenticated users can read course thumbnails"
  on storage.objects;
create policy "Authenticated users can read course thumbnails"
  on storage.objects for select to authenticated
  using (bucket_id = 'course-thumbnails');
drop policy if exists "Restrict course thumbnail reads to bucket"
  on storage.objects;
create policy "Restrict course thumbnail reads to bucket"
  on storage.objects as restrictive for select to authenticated
  using (bucket_id = 'course-thumbnails');

drop policy if exists "Admins can upload course thumbnails" on storage.objects;
drop policy if exists "Admins can update course thumbnails" on storage.objects;
drop policy if exists "Admins can delete course thumbnails" on storage.objects;
create policy "Admins can upload course thumbnails"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'course-thumbnails' and public.is_admin());
create policy "Admins can update course thumbnails"
  on storage.objects for update to authenticated
  using (bucket_id = 'course-thumbnails' and public.is_admin())
  with check (bucket_id = 'course-thumbnails' and public.is_admin());
create policy "Admins can delete course thumbnails"
  on storage.objects for delete to authenticated
  using (bucket_id = 'course-thumbnails' and public.is_admin());

drop policy if exists "Only admins can insert course thumbnails"
  on storage.objects;
drop policy if exists "Only admins can update course thumbnails"
  on storage.objects;
drop policy if exists "Only admins can delete course thumbnails"
  on storage.objects;
create policy "Only admins can insert course thumbnails"
  on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'course-thumbnails' or public.is_admin());
create policy "Only admins can update course thumbnails"
  on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'course-thumbnails' or public.is_admin())
  with check (bucket_id <> 'course-thumbnails' or public.is_admin());
create policy "Only admins can delete course thumbnails"
  on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'course-thumbnails' or public.is_admin());

create or replace function public.audit_admin_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_row jsonb;
  v_meta jsonb;
  v_entity text;
  v_entity_id text;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then
    return new;
  end if;

  if tg_table_schema = 'storage' then
    if v_row->>'bucket_id' <> 'course-thumbnails' then
      if tg_op = 'DELETE' then return old; else return new; end if;
    end if;
    v_entity := 'course_thumbnail';
    v_entity_id := v_row->>'name';
    v_meta := jsonb_build_object(
      'bucket_id', v_row->>'bucket_id',
      'name', v_row->>'name',
      'object_id', v_row->>'id'
    );
  else
    v_entity := case tg_table_name
      when 'courses' then 'course'
      when 'notes' then 'note'
      when 'lectures' then 'lecture'
      else tg_table_name
    end;
    v_entity_id := v_row->>'id';
    v_meta := case tg_table_name
      when 'courses' then jsonb_build_object(
        'slug', v_row->'slug',
        'title', v_row->'title',
        'price_inr', v_row->'price_inr',
        'is_published', v_row->'is_published',
        'thumbnail_path', v_row->'thumbnail_path'
      )
      when 'notes' then jsonb_build_object(
        'course_id', v_row->'course_id',
        'title', v_row->'title',
        'is_free', v_row->'is_free',
        'is_published', v_row->'is_published'
      )
      when 'lectures' then jsonb_build_object(
        'course_id', v_row->'course_id',
        'title', v_row->'title',
        'is_free', v_row->'is_free',
        'is_published', v_row->'is_published'
      )
      else '{}'::jsonb
    end;
  end if;

  if v_admin_id is not null and public.is_admin() then
    insert into public.admin_audit_log (
      admin_id, action, entity, entity_id, meta
    )
    values (
      v_admin_id, lower(tg_op), v_entity, v_entity_id, coalesce(v_meta, '{}'::jsonb)
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.audit_admin_catalog_change() from public, anon, authenticated;

drop trigger if exists audit_admin_course_changes on public.courses;
create trigger audit_admin_course_changes
  after insert or update or delete on public.courses
  for each row execute function public.audit_admin_catalog_change();

drop trigger if exists audit_admin_note_changes on public.notes;
create trigger audit_admin_note_changes
  after insert or update or delete on public.notes
  for each row execute function public.audit_admin_catalog_change();

drop trigger if exists audit_admin_lecture_changes on public.lectures;
create trigger audit_admin_lecture_changes
  after insert or update or delete on public.lectures
  for each row execute function public.audit_admin_catalog_change();

drop trigger if exists audit_admin_course_thumbnail_changes on storage.objects;
create trigger audit_admin_course_thumbnail_changes
  after insert or update or delete on storage.objects
  for each row execute function public.audit_admin_catalog_change();
