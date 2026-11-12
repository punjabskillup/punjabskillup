create extension if not exists vector with schema extensions;

create table public.lecture_transcripts (
  lecture_id uuid primary key references public.lectures (id) on delete cascade,
  language text not null default 'English' check (length(trim(language)) > 0),
  full_text text not null check (length(trim(full_text)) > 0)
);

create table public.transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  embedding extensions.vector(768) not null,
  chunk_index integer not null check (chunk_index >= 0),
  unique (lecture_id, chunk_index)
);

create index transcript_chunks_embedding_hnsw_idx
  on public.transcript_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create index transcript_chunks_lecture_idx
  on public.transcript_chunks (lecture_id, chunk_index);

create table public.lecture_ai (
  lecture_id uuid primary key references public.lectures (id) on delete cascade,
  summary text,
  quiz jsonb,
  generated_at timestamptz not null default now()
);

create table public.ai_request_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_date date not null default (now() at time zone 'utc')::date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, request_date)
);

alter table public.lecture_transcripts enable row level security;
alter table public.transcript_chunks enable row level security;
alter table public.lecture_ai enable row level security;
alter table public.ai_request_limits enable row level security;

revoke all on public.lecture_transcripts, public.transcript_chunks,
  public.lecture_ai, public.ai_request_limits from public, anon, authenticated;
grant select on public.lecture_transcripts, public.transcript_chunks,
  public.lecture_ai to authenticated;
grant all on public.lecture_transcripts, public.transcript_chunks,
  public.lecture_ai, public.ai_request_limits to service_role;

create policy "Enrolled users can read lecture transcripts"
  on public.lecture_transcripts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.lectures
      join public.enrollments
        on enrollments.course_id = lectures.course_id
      where lectures.id = lecture_transcripts.lecture_id
        and enrollments.user_id = (select auth.uid())
    )
  );

create policy "Enrolled users can read transcript chunks"
  on public.transcript_chunks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.lectures
      join public.enrollments
        on enrollments.course_id = lectures.course_id
      where lectures.id = transcript_chunks.lecture_id
        and enrollments.user_id = (select auth.uid())
    )
  );

create policy "Enrolled users can read lecture AI cache"
  on public.lecture_ai
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.lectures
      join public.enrollments
        on enrollments.course_id = lectures.course_id
      where lectures.id = lecture_ai.lecture_id
        and enrollments.user_id = (select auth.uid())
    )
  );

create function public.consume_ai_request(p_user_id uuid, p_daily_limit integer)
returns table (allowed boolean, request_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if p_daily_limit < 1 then
    raise exception 'AI request limit must be positive';
  end if;

  insert into public.ai_request_limits as limits (user_id, request_date, request_count)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, request_date)
  do update
    set request_count = limits.request_count + 1
    where limits.request_count < p_daily_limit
  returning limits.request_count into updated_count;

  if updated_count is null then
    return query select false, p_daily_limit;
  else
    return query select true, updated_count;
  end if;
end;
$$;

revoke all on function public.consume_ai_request(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid, integer) to service_role;

create function public.replace_lecture_transcript(
  p_lecture_id uuid,
  p_language text,
  p_full_text text,
  p_chunks jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_language is null or length(trim(p_language)) = 0 then
    raise exception 'Transcript language is required';
  end if;
  if p_full_text is null or length(trim(p_full_text)) = 0 then
    raise exception 'Transcript text is required';
  end if;
  if p_chunks is null
    or jsonb_typeof(p_chunks) <> 'array'
    or jsonb_array_length(p_chunks) = 0 then
    raise exception 'Transcript chunks are required';
  end if;

  insert into public.lecture_transcripts (lecture_id, language, full_text)
  values (p_lecture_id, p_language, p_full_text)
  on conflict (lecture_id)
  do update set language = excluded.language, full_text = excluded.full_text;

  delete from public.transcript_chunks
  where lecture_id = p_lecture_id;

  insert into public.transcript_chunks (lecture_id, content, embedding, chunk_index)
  select
    p_lecture_id,
    item ->> 'content',
    ((item -> 'embedding')::text)::extensions.vector(768),
    (item ->> 'chunk_index')::integer
  from jsonb_array_elements(p_chunks) as items(item);

  delete from public.lecture_ai
  where lecture_id = p_lecture_id;
end;
$$;

revoke all on function public.replace_lecture_transcript(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_lecture_transcript(uuid, text, text, jsonb)
  to service_role;

create function public.cache_lecture_ai(
  p_lecture_id uuid,
  p_summary text default null,
  p_quiz jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_summary is null and p_quiz is null then
    raise exception 'At least one AI result must be provided';
  end if;

  insert into public.lecture_ai (lecture_id, summary, quiz, generated_at)
  values (p_lecture_id, p_summary, p_quiz, now())
  on conflict (lecture_id)
  do update set
    summary = coalesce(excluded.summary, public.lecture_ai.summary),
    quiz = coalesce(excluded.quiz, public.lecture_ai.quiz),
    generated_at = excluded.generated_at;
end;
$$;

revoke all on function public.cache_lecture_ai(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.cache_lecture_ai(uuid, text, jsonb)
  to service_role;

create function public.match_transcript_chunks(
  query_embedding extensions.vector(768),
  target_lecture_id uuid,
  match_count integer default 5
)
returns table (id uuid, content text, chunk_index integer, similarity double precision)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    chunks.id,
    chunks.content,
    chunks.chunk_index,
    1 - (chunks.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.transcript_chunks as chunks
  where chunks.lecture_id = target_lecture_id
  order by chunks.embedding OPERATOR(extensions.<=>) query_embedding
  limit greatest(least(match_count, 5), 1);
$$;

revoke all on function public.match_transcript_chunks(extensions.vector, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.match_transcript_chunks(extensions.vector, uuid, integer)
  to service_role;
