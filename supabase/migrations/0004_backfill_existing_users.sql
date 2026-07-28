-- Backfill users who registered before the application tables/triggers were
-- installed on the cloud project. Safe to run more than once.

insert into public.profiles (id, full_name)
select
  user_record.id,
  coalesce(
    nullif(trim(user_record.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(user_record.email, '@', 1), ''),
    'Pengguna KITMOTION'
  )
from auth.users as user_record
on conflict (id) do nothing;

insert into public.user_progress (user_id)
select profile.id
from public.profiles as profile
on conflict (user_id) do nothing;
