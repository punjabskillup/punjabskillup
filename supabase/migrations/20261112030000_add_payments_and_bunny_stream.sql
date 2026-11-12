alter table public.lectures
  drop constraint if exists lectures_video_provider_check;

alter table public.lectures
  add constraint lectures_video_provider_check
  check (video_provider in ('youtube', 'bunny'));

create table public.course_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null check (currency = 'INR'),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  check (
    (status = 'pending' and razorpay_payment_id is null and paid_at is null)
    or (status = 'paid' and razorpay_payment_id is not null and paid_at is not null)
  )
);

alter table public.course_payments enable row level security;
revoke all on public.course_payments from anon, authenticated;
grant all on public.course_payments to service_role;

create function public.ensure_bunny_for_paid_course()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.video_provider <> 'bunny'
    and exists (
      select 1
      from public.courses
      where id = new.course_id
        and price_inr > 0
    )
  then
    raise exception 'Paid course lectures must use Bunny Stream';
  end if;
  return new;
end;
$$;

create trigger lectures_require_bunny_for_paid_courses
  before insert or update of course_id, video_provider on public.lectures
  for each row execute function public.ensure_bunny_for_paid_course();

create function public.prevent_invalid_paid_course_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.price_inr = 0 and new.price_inr > 0 and (
    exists (
      select 1
      from public.lectures
      where course_id = old.id
        and video_provider <> 'bunny'
    )
    or exists (
      select 1
      from public.enrollments
      where course_id = old.id
    )
  )
  then
    raise exception 'Migrate lectures to Bunny Stream and create a new paid course for existing learners';
  end if;
  return new;
end;
$$;

create trigger courses_validate_paid_transition
  before update of price_inr on public.courses
  for each row execute function public.prevent_invalid_paid_course_transition();

create function public.complete_razorpay_payment(
  p_order_id text,
  p_payment_id text,
  p_amount_paise bigint,
  p_currency text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row public.course_payments%rowtype;
begin
  select *
  into payment_row
  from public.course_payments
  where razorpay_order_id = p_order_id
  for update;

  if not found
    or p_payment_id is null
    or p_payment_id = ''
    or p_currency is distinct from 'INR'
    or payment_row.currency is distinct from p_currency
    or payment_row.amount_paise is distinct from p_amount_paise
  then
    return false;
  end if;

  if payment_row.status = 'paid' then
    return payment_row.razorpay_payment_id = p_payment_id;
  end if;

  update public.course_payments
  set status = 'paid',
      razorpay_payment_id = p_payment_id,
      paid_at = now()
  where id = payment_row.id;

  insert into public.enrollments (user_id, course_id)
  values (payment_row.user_id, payment_row.course_id)
  on conflict (user_id, course_id) do nothing;

  return true;
end;
$$;

revoke all on function public.ensure_bunny_for_paid_course() from public, anon, authenticated;
revoke all on function public.prevent_invalid_paid_course_transition() from public, anon, authenticated;
revoke all on function public.complete_razorpay_payment(text, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.complete_razorpay_payment(text, text, bigint, text)
  to service_role;
