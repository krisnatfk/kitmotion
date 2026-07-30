-- KITMOTION learning platform: level gates, tutorials, teachers, classes,
-- consent, and teacher-scoped reporting.

create type public.membership_status as enum ('pending', 'active', 'rejected', 'left', 'removed');
create type public.invitation_status as enum ('pending', 'accepted', 'rejected', 'expired');
create type public.milestone_status as enum ('locked', 'available', 'completed');

alter table public.user_progress
  add column max_unlocked_level integer not null default 10,
  add constraint user_progress_max_unlocked_milestone
    check (max_unlocked_level >= 10 and max_unlocked_level % 10 = 0);

create table public.exercise_tutorials (
  exercise_id uuid primary key references public.exercises(id) on delete cascade,
  start_position text not null,
  steps jsonb not null default '[]'::jsonb,
  common_mistakes jsonb not null default '[]'::jsonb,
  safety_tips jsonb not null default '[]'::jsonb,
  animation_url text,
  updated_at timestamptz not null default now(),
  constraint tutorial_steps_array check (jsonb_typeof(steps) = 'array'),
  constraint tutorial_mistakes_array check (jsonb_typeof(common_mistakes) = 'array'),
  constraint tutorial_safety_array check (jsonb_typeof(safety_tips) = 'array')
);

create table public.level_difficulty_configs (
  level integer primary key references public.level_definitions(level) on delete cascade,
  target_multiplier numeric(5,2) not null default 1,
  minimum_score numeric(5,2) not null default 60,
  tolerance_multiplier numeric(5,2) not null default 1,
  created_at timestamptz not null default now(),
  constraint level_target_multiplier_positive check (target_multiplier >= 1),
  constraint level_minimum_score_range check (minimum_score between 0 and 100),
  constraint level_tolerance_multiplier_range check (tolerance_multiplier between 0.25 and 1)
);

create table public.milestone_challenges (
  id uuid primary key default gen_random_uuid(),
  milestone_level integer not null unique,
  exercise_id uuid not null references public.exercises(id),
  title text not null,
  description text not null,
  target_reps integer not null,
  minimum_score numeric(5,2) not null,
  max_form_errors integer not null default 3,
  require_tracking_continuity boolean not null default true,
  xp_reward integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint milestone_level_multiple_of_ten check (milestone_level >= 10 and milestone_level % 10 = 0),
  constraint milestone_target_positive check (target_reps > 0),
  constraint milestone_score_range check (minimum_score between 0 and 100),
  constraint milestone_error_nonnegative check (max_form_errors >= 0)
);

create table public.user_milestones (
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_level integer not null references public.milestone_challenges(milestone_level) on delete cascade,
  status public.milestone_status not null default 'locked',
  attempt_count integer not null default 0,
  completed_at timestamptz,
  reward_claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, milestone_level),
  constraint milestone_attempt_count_nonnegative check (attempt_count >= 0)
);

create table public.milestone_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_level integer not null references public.milestone_challenges(milestone_level),
  session_id uuid not null unique references public.workout_sessions(id) on delete cascade,
  success boolean not null,
  achieved_reps integer not null,
  achieved_score numeric(5,2) not null,
  form_errors integer not null,
  tracking_loss_count integer not null default 0,
  attempted_at timestamptz not null default now(),
  constraint milestone_attempt_values_nonnegative check (
    achieved_reps >= 0 and form_errors >= 0 and tracking_loss_count >= 0
  )
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  school_year text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_name_not_blank check (length(trim(name)) >= 2)
);

create table public.class_join_codes (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint class_join_code_format check (code ~ '^[A-Z0-9]{8}$')
);

create table public.class_invitations (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  code_used text not null,
  status public.invitation_status not null default 'pending',
  consented_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (classroom_id, student_id, created_at)
);

create table public.class_memberships (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  invitation_id uuid references public.class_invitations(id) on delete set null,
  status public.membership_status not null default 'pending',
  consented_at timestamptz,
  joined_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (classroom_id, student_id)
);

create index classrooms_teacher_idx on public.classrooms (teacher_id, created_at desc);
create index class_memberships_student_idx on public.class_memberships (student_id, status);
create index class_memberships_class_idx on public.class_memberships (classroom_id, status);
create index milestone_attempts_user_idx on public.milestone_attempts (user_id, attempted_at desc);

create trigger exercise_tutorials_set_updated_at before update on public.exercise_tutorials
  for each row execute function public.set_updated_at();
create trigger user_milestones_set_updated_at before update on public.user_milestones
  for each row execute function public.set_updated_at();
create trigger classrooms_set_updated_at before update on public.classrooms
  for each row execute function public.set_updated_at();
create trigger class_memberships_set_updated_at before update on public.class_memberships
  for each row execute function public.set_updated_at();

-- Public registration may request student or teacher. Admin is never accepted
-- from user metadata and profile.role remains non-client-writable.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role := case
    when new.raw_user_meta_data->>'requested_role' = 'teacher' then 'teacher'::public.user_role
    else 'student'::public.user_role
  end;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Pengguna KITMOTION'),
    requested_role
  );
  return new;
end;
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  );
$$;

create or replace function public.teacher_has_active_student(target_student uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.classrooms c
    join public.class_memberships m on m.classroom_id = c.id
    where c.teacher_id = auth.uid()
      and c.is_active
      and m.student_id = target_student
      and m.status = 'active'
      and m.consented_at is not null
  );
$$;

create or replace function public.teacher_can_view_student_session(target_student uuid, session_completed_at timestamptz)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.classrooms c
    join public.class_memberships m on m.classroom_id = c.id
    where c.teacher_id = auth.uid()
      and c.is_active
      and m.student_id = target_student
      and m.status = 'active'
      and m.consented_at is not null
      and session_completed_at >= m.consented_at
  );
$$;

create or replace function public.owns_classroom(target_classroom uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = target_classroom and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.belongs_to_classroom(target_classroom uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.class_memberships m
    where m.classroom_id = target_classroom and m.student_id = auth.uid()
  );
$$;

alter table public.exercise_tutorials enable row level security;
alter table public.level_difficulty_configs enable row level security;
alter table public.milestone_challenges enable row level security;
alter table public.user_milestones enable row level security;
alter table public.milestone_attempts enable row level security;
alter table public.classrooms enable row level security;
alter table public.class_join_codes enable row level security;
alter table public.class_invitations enable row level security;
alter table public.class_memberships enable row level security;

create policy "exercise_tutorials_read" on public.exercise_tutorials
  for select to authenticated using (true);
create policy "level_difficulty_read" on public.level_difficulty_configs
  for select to authenticated using (true);
create policy "milestone_challenges_read" on public.milestone_challenges
  for select to authenticated using (is_active);
create policy "user_milestones_own_or_teacher" on public.user_milestones
  for select to authenticated using (user_id = auth.uid() or public.teacher_has_active_student(user_id));
create policy "milestone_attempts_own_or_teacher" on public.milestone_attempts
  for select to authenticated using (user_id = auth.uid() or public.teacher_has_active_student(user_id));

create policy "classrooms_teacher_all" on public.classrooms
  for all to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "classrooms_student_read" on public.classrooms
  for select to authenticated using (public.belongs_to_classroom(id));
create policy "class_join_codes_teacher_read" on public.class_join_codes
  for select to authenticated using (public.owns_classroom(classroom_id));
create policy "class_invitations_participant_read" on public.class_invitations
  for select to authenticated using (student_id = auth.uid() or public.owns_classroom(classroom_id));
create policy "class_memberships_participant_read" on public.class_memberships
  for select to authenticated using (student_id = auth.uid() or public.owns_classroom(classroom_id));

create policy "profiles_teacher_active_class" on public.profiles
  for select to authenticated using (public.teacher_has_active_student(id));
create policy "sessions_teacher_active_class" on public.workout_sessions
  for select to authenticated using (public.teacher_can_view_student_session(user_id, completed_at));
create policy "reps_teacher_active_class" on public.workout_repetitions
  for select to authenticated using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and public.teacher_can_view_student_session(s.user_id, s.completed_at)
    )
  );
create policy "feedback_teacher_active_class" on public.session_feedback
  for select to authenticated using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and public.teacher_can_view_student_session(s.user_id, s.completed_at)
    )
  );
create policy "progress_teacher_active_class" on public.user_progress
  for select to authenticated using (public.teacher_has_active_student(user_id));
create policy "challenge_progress_teacher_active_class" on public.challenge_progress
  for select to authenticated using (public.teacher_has_active_student(user_id));

revoke insert, update, delete on public.classrooms, public.class_join_codes,
  public.class_invitations, public.class_memberships, public.user_milestones,
  public.milestone_attempts from anon, authenticated;
revoke update (max_unlocked_level) on public.user_progress from anon, authenticated;

grant select on public.exercise_tutorials, public.level_difficulty_configs,
  public.milestone_challenges, public.user_milestones, public.milestone_attempts,
  public.classrooms, public.class_join_codes, public.class_invitations,
  public.class_memberships to authenticated;

-- Extend levels far enough for several milestone gates.
insert into public.level_definitions (level, name, min_total_xp, icon)
select n,
  case when n < 10 then 'Rising Athlete'
       when n < 20 then 'Skilled Athlete'
       when n < 30 then 'Advanced Athlete'
       when n < 40 then 'Elite Athlete'
       else 'Master Athlete' end,
  3000 + (n - 6) * 1000,
  'level-' || n
from generate_series(7, 50) as n
on conflict (level) do nothing;

insert into public.level_difficulty_configs (level, target_multiplier, minimum_score, tolerance_multiplier)
select level,
  1 + least(1.5, (level - 1) * 0.03),
  least(90, 60 + floor((level - 1) / 5) * 3),
  greatest(0.55, 1 - (level - 1) * 0.01)
from public.level_definitions
on conflict (level) do update set
  target_multiplier = excluded.target_multiplier,
  minimum_score = excluded.minimum_score,
  tolerance_multiplier = excluded.tolerance_multiplier;

insert into public.exercise_tutorials
  (exercise_id, start_position, steps, common_mistakes, safety_tips)
select id,
  case slug
    when 'squat' then 'Berdiri tegak dengan kaki selebar bahu dan pandangan lurus ke depan.'
    when 'jumping-jack' then 'Berdiri tegak dengan kaki rapat dan tangan di samping tubuh.'
    else 'Mulai dari plank tinggi dengan tubuh lurus dari kepala sampai tumit.' end,
  case slug
    when 'squat' then '["Dorong pinggul ke belakang","Tekuk lutut dengan dada terangkat","Turun sesuai kemampuan","Kembali berdiri dengan kontrol"]'::jsonb
    when 'jumping-jack' then '["Buka kaki dengan lompatan ringan","Angkat tangan ke atas kepala","Mendarat lembut","Kembali ke posisi rapat"]'::jsonb
    else '["Kencangkan otot inti","Tekuk kedua siku","Turunkan dada hingga siku mendekati 90 derajat","Dorong kembali ke plank tinggi"]'::jsonb end,
  case slug
    when 'squat' then '["Lutut masuk ke dalam","Tumit terangkat","Punggung membulat"]'::jsonb
    when 'jumping-jack' then '["Tangan terlalu rendah","Kaki terlalu sempit","Tangan dan kaki tidak selaras"]'::jsonb
    else '["Siku kurang menekuk","Pinggul turun atau terlalu tinggi","Garis tubuh tidak stabil"]'::jsonb end,
  '["Gunakan area datar dan tidak licin","Hentikan latihan bila terasa nyeri"]'::jsonb
from public.exercises
where slug in ('squat', 'jumping-jack', 'push-up')
on conflict (exercise_id) do nothing;

insert into public.milestone_challenges
  (milestone_level, exercise_id, title, description, target_reps, minimum_score, max_form_errors, require_tracking_continuity, xp_reward)
select milestone,
  e.id,
  'Challenge Level ' || milestone,
  'Selesaikan ' || (20 + milestone) || ' squat dengan skor minimum ' || least(90, 75 + milestone / 10 * 2) || '.',
  20 + milestone,
  least(90, 75 + milestone / 10 * 2),
  greatest(1, 4 - milestone / 20),
  true,
  100 + milestone * 5
from generate_series(10, 50, 10) as milestone
cross join public.exercises e
where e.slug = 'squat'
on conflict (milestone_level) do nothing;

-- Persist the stricter camera configs introduced by the v2 engines.
update public.exercise_versions ev
set config = ev.config || '{"elbowSymmetryMaxDelta":18}'::jsonb
from public.exercises e
where ev.exercise_id = e.id and e.slug = 'push-up';

update public.exercise_versions ev
set config = ev.config || '{"armHeightMinRatio":0.3,"coordinationMaxDelta":0.35}'::jsonb
from public.exercises e
where ev.exercise_id = e.id and e.slug = 'jumping-jack';
