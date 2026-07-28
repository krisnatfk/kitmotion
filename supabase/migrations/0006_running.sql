-- GPS running activities. Location is recorded only while the user explicitly
-- runs the tracker and is stored as a compact JSON route on the completed row.

alter type public.reward_source add value if not exists 'run';

create table if not exists public.running_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_session_id uuid not null,
  status public.workout_status not null default 'completed',
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_seconds integer not null,
  distance_meters numeric(12,2) not null,
  average_pace_seconds_per_km integer,
  best_pace_seconds_per_km integer,
  elevation_gain_meters numeric(10,2) not null default 0,
  calories_estimate integer not null default 0,
  route jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, client_session_id),
  constraint running_duration_valid check (duration_seconds between 1 and 86400),
  constraint running_distance_valid check (distance_meters between 0 and 1000000),
  constraint running_average_pace_valid check (
    average_pace_seconds_per_km is null or average_pace_seconds_per_km between 60 and 7200
  ),
  constraint running_best_pace_valid check (
    best_pace_seconds_per_km is null or best_pace_seconds_per_km between 60 and 7200
  ),
  constraint running_route_array check (jsonb_typeof(route) = 'array')
);

create index if not exists running_sessions_user_completed_idx
  on public.running_sessions (user_id, completed_at desc);

alter table public.running_sessions enable row level security;

drop policy if exists "running_sessions_select_own" on public.running_sessions;
create policy "running_sessions_select_own" on public.running_sessions
  for select to authenticated using (user_id = auth.uid());

revoke insert, update, delete on public.running_sessions from anon, authenticated;
grant select on public.running_sessions to authenticated;
