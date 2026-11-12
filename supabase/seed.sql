insert into public.courses (
  id, title, description, thumbnail_url, price_inr, is_published, created_by
)
select
  'a1000000-0000-4000-8000-000000000001',
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
  id, title, description, thumbnail_url, price_inr, is_published, created_by
)
select
  'a1000000-0000-4000-8000-000000000002',
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

insert into public.lectures (course_id, title, position, video_provider, video_ref)
values
  ('a1000000-0000-4000-8000-000000000001', 'Getting comfortable online', 1, 'youtube', 'M7lc1UVf-VE'),
  ('a1000000-0000-4000-8000-000000000001', 'Finding trustworthy information', 2, 'youtube', 'M7lc1UVf-VE'),
  ('a1000000-0000-4000-8000-000000000002', 'Start with your audience', 1, 'youtube', 'M7lc1UVf-VE'),
  ('a1000000-0000-4000-8000-000000000002', 'Make your message clear', 2, 'youtube', 'M7lc1UVf-VE')
on conflict (course_id, position) do nothing;
