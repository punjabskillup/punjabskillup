insert into public.courses (
  id, slug, title, description, thumbnail_url, price_inr, is_published, created_by
)
select
  'a1000000-0000-4000-8000-000000000001',
  'everyday-digital-skills',
  'Everyday Digital Skills',
  'Build confidence with the everyday tools that help you learn, work, and connect.',
  null,
  0,
  true,
  profiles.id
from public.profiles
where profiles.role in ('instructor', 'admin')
order by profiles.created_at
limit 1
on conflict (id) do nothing;

insert into public.courses (
  id, slug, title, description, thumbnail_url, price_inr, is_published, created_by
)
select
  'a1000000-0000-4000-8000-000000000002',
  'clear-communication',
  'Foundations of Clear Communication',
  'Practise the building blocks of clear, thoughtful communication.',
  null,
  0,
  true,
  profiles.id
from public.profiles
where profiles.role in ('instructor', 'admin')
order by profiles.created_at
limit 1
on conflict (id) do nothing;

insert into public.courses (
  id, slug, title, description, price_inr, thumbnail_path, is_published, created_by
)
values (
  'a1000000-0000-4000-8000-000000000003',
  'ai-and-ml',
  'AI and ML',
  'Machine learning, Python and real-world AI skills.',
  0,
  null,
  true,
  null
)
on conflict (slug) do update
set title = excluded.title,
    description = excluded.description,
    price_inr = excluded.price_inr,
    thumbnail_path = excluded.thumbnail_path,
    is_published = excluded.is_published;

insert into public.lectures (
  course_id, title, position, video_provider, video_ref, is_free, is_published
)
values
  ('a1000000-0000-4000-8000-000000000001', 'Getting comfortable online', 1, 'youtube', 'M7lc1UVf-VE', true, true),
  ('a1000000-0000-4000-8000-000000000001', 'Finding trustworthy information', 2, 'youtube', 'M7lc1UVf-VE', true, true),
  ('a1000000-0000-4000-8000-000000000002', 'Start with your audience', 1, 'youtube', 'M7lc1UVf-VE', true, true),
  ('a1000000-0000-4000-8000-000000000002', 'Make your message clear', 2, 'youtube', 'M7lc1UVf-VE', true, true)
on conflict (course_id, position) do nothing;
