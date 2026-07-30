-- Repair Auth users created while the profile trigger was unavailable.
-- Safe to run repeatedly; existing profiles and progress rows are preserved.

insert into public.profiles (id, full_name, role)
select
  auth_user.id,
  coalesce(
    nullif(trim(auth_user.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(auth_user.email, '@', 1), ''),
    'Pengguna KITMOTION'
  ),
  case
    when auth_user.raw_user_meta_data->>'requested_role' = 'teacher'
      then 'teacher'::public.user_role
    else 'student'::public.user_role
  end
from auth.users as auth_user
on conflict (id) do nothing;

insert into public.user_progress (user_id)
select profile.id
from public.profiles as profile
on conflict (user_id) do nothing;
