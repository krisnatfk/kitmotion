-- KITMOTION — initial schema (application-first MVP).
-- Source of truth: schema.md. No device/telemetry tables exist in this phase.
-- sensor_source / sensor_summary are future-ready optional fields, always
-- 'none' / NULL for now (enforced by workout_sensor_future_guard + app layer).

create extension if not exists pgcrypto;

-- =============================================================================
-- Enums
-- =============================================================================

create type public.user_role as enum ('student', 'admin');

create type public.exercise_difficulty as enum ('beginner', 'intermediate', 'advanced');

create type public.workout_status as enum ('created', 'active', 'completed', 'cancelled', 'failed');

create type public.feedback_severity as enum ('info', 'warning', 'critical');

create type public.reward_source as enum ('workout', 'challenge', 'badge', 'admin_adjustment');

create type public.challenge_period as enum ('daily', 'weekly', 'custom');

-- sensor_source is provided for future IoT compatibility. Only 'none' is used now.
create type public.sensor_source as enum ('none', 'iot_necklace');

-- =============================================================================
-- Tables
-- =============================================================================

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  province text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_name_not_blank check (length(trim(name)) > 0)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text not null,
  school_id uuid references public.schools(id) on delete set null,
  class_name text,
  avatar_path text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_not_blank check (length(trim(full_name)) >= 2)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  difficulty public.exercise_difficulty not null,
  tutorial_media_url text,
  thumbnail_url text,
  camera_position text not null,
  default_target_reps integer,
  default_target_seconds integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.exercise_versions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  version integer not null,
  engine_key text not null,
  scoring_version text not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (exercise_id, version),
  unique (exercise_id, scoring_version)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  exercise_version_id uuid references public.exercise_versions(id),
  client_session_id uuid not null,
  status public.workout_status not null default 'created',
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer not null default 0,
  target_reps integer,
  target_seconds integer,
  total_reps integer not null default 0,
  valid_reps integer not null default 0,
  invalid_reps integer not null default 0,
  form_score numeric(5,2),
  range_score numeric(5,2),
  consistency_score numeric(5,2),
  tempo_score numeric(5,2),
  stability_score numeric(5,2),
  final_score numeric(5,2),
  grade text,
  used_camera boolean not null default true,
  sensor_source public.sensor_source not null default 'none',
  sensor_summary jsonb,
  app_version text,
  scoring_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_session_id),
  constraint workout_duration_nonnegative check (duration_seconds >= 0),
  constraint workout_rep_counts_nonnegative check (
    total_reps >= 0 and valid_reps >= 0 and invalid_reps >= 0
  ),
  constraint workout_scores_valid check (
    (form_score is null or form_score between 0 and 100) and
    (range_score is null or range_score between 0 and 100) and
    (consistency_score is null or consistency_score between 0 and 100) and
    (tempo_score is null or tempo_score between 0 and 100) and
    (stability_score is null or stability_score between 0 and 100) and
    (final_score is null or final_score between 0 and 100)
  ),
  constraint workout_sensor_future_guard check (
    (sensor_source = 'none' and sensor_summary is null)
    or (sensor_source <> 'none')
  )
);

create table public.workout_repetitions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  rep_number integer not null,
  started_offset_ms integer not null,
  completed_offset_ms integer not null,
  is_valid boolean not null,
  form_score numeric(5,2),
  range_score numeric(5,2),
  tempo_score numeric(5,2),
  stability_score numeric(5,2),
  metrics jsonb not null default '{}'::jsonb,
  issue_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (session_id, rep_number)
);

create table public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  repetition_id uuid references public.workout_repetitions(id) on delete cascade,
  code text not null,
  severity public.feedback_severity not null,
  message text not null,
  occurrence_count integer not null default 1,
  first_offset_ms integer,
  last_offset_ms integer,
  created_at timestamptz not null default now()
);

create table public.user_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp integer not null default 0,
  current_level integer not null default 1,
  total_sessions integer not null default 0,
  total_valid_reps integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  updated_at timestamptz not null default now()
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source public.reward_source not null,
  source_id uuid,
  idempotency_key text not null,
  xp_amount integer not null,
  description text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.level_definitions (
  level integer primary key,
  name text not null,
  min_total_xp integer not null unique,
  icon text,
  created_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon_url text,
  criteria jsonb not null,
  xp_reward integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_for_id uuid,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  period public.challenge_period not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  criteria jsonb not null,
  xp_reward integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress_value numeric not null default 0,
  target_value numeric not null,
  completed_at timestamptz,
  reward_claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

create index workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc);
create index workout_sessions_exercise_idx
  on public.workout_sessions (exercise_id, completed_at desc);
create index workout_sessions_status_idx
  on public.workout_sessions (status);
create index workout_sessions_client_session_idx
  on public.workout_sessions (user_id, client_session_id);

create index workout_repetitions_session_idx
  on public.workout_repetitions (session_id);
create index session_feedback_session_idx
  on public.session_feedback (session_id);
create index session_feedback_repetition_idx
  on public.session_feedback (repetition_id);

create index exercise_versions_exercise_idx
  on public.exercise_versions (exercise_id);

create index xp_events_user_idx
  on public.xp_events (user_id, created_at desc);
create index user_badges_user_idx
  on public.user_badges (user_id);
create index user_badges_badge_idx
  on public.user_badges (badge_id);
create index challenge_progress_user_idx
  on public.challenge_progress (user_id);
create index challenge_progress_challenge_idx
  on public.challenge_progress (challenge_id);
create index admin_audit_logs_admin_idx
  on public.admin_audit_logs (admin_user_id, created_at desc);

-- =============================================================================
-- Helper functions & triggers
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Pengguna KITMOTION')
  );
  return new;
end;
$$;

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_progress (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- updated_at triggers
create trigger schools_set_updated_at before update on public.schools
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger exercises_set_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger workout_sessions_set_updated_at before update on public.workout_sessions
  for each row execute function public.set_updated_at();
create trigger user_progress_set_updated_at before update on public.user_progress
  for each row execute function public.set_updated_at();
create trigger challenge_progress_set_updated_at before update on public.challenge_progress
  for each row execute function public.set_updated_at();

-- profile + progress auto-creation on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();
