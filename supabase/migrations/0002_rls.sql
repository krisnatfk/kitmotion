-- KITMOTION — Row Level Security.
-- Principle: a user reads only their own data. Scores, XP, level, badges,
-- and challenge progress are written exclusively by the server (service role,
-- which bypasses RLS) inside finalize / admin actions. Clients never write
-- authoritative rows.
--
-- Admin operations also run through the service role, so policies here are
-- own-data-only. The is_admin() helper exists for optional server-component
-- reads but is not relied upon for mutation authorization.

-- =============================================================================
-- Enable RLS
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_versions enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_repetitions enable row level security;
alter table public.session_feedback enable row level security;
alter table public.user_progress enable row level security;
alter table public.xp_events enable row level security;
alter table public.level_definitions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.schools enable row level security;
alter table public.admin_audit_logs enable row level security;

-- =============================================================================
-- Public catalog (read-only for everyone; writes via service role)
-- =============================================================================

create policy "catalog_read" on public.exercises
  for select to anon, authenticated using (true);
create policy "versions_read" on public.exercise_versions
  for select to anon, authenticated using (true);
create policy "levels_read" on public.level_definitions
  for select to anon, authenticated using (true);
create policy "badges_read" on public.badges
  for select to anon, authenticated using (true);
create policy "challenges_read" on public.challenges
  for select to anon, authenticated using (is_active);
create policy "schools_read" on public.schools
  for select to anon, authenticated using (true);

-- =============================================================================
-- profiles — read own (and admin reads all). Update own non-role columns.
-- =============================================================================

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- The role column is never client-writable. Revoke UPDATE on it from anon/auth.
revoke update (role) on public.profiles from anon, authenticated;

-- =============================================================================
-- workout_sessions — read own only
-- =============================================================================

create policy "sessions_select_own" on public.workout_sessions
  for select to authenticated using (user_id = auth.uid());

-- =============================================================================
-- workout_repetitions — read if owned via parent session
-- =============================================================================

create policy "reps_select_own" on public.workout_repetitions
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- =============================================================================
-- session_feedback — read if owned via parent session
-- =============================================================================

create policy "feedback_select_own" on public.session_feedback
  for select to authenticated
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Gamification — read own only (writes via service role)
-- =============================================================================

create policy "progress_select_own" on public.user_progress
  for select to authenticated using (user_id = auth.uid());

create policy "xp_select_own" on public.xp_events
  for select to authenticated using (user_id = auth.uid());

create policy "user_badges_select_own" on public.user_badges
  for select to authenticated using (user_id = auth.uid());

create policy "challenge_progress_select_own" on public.challenge_progress
  for select to authenticated using (user_id = auth.uid());

-- =============================================================================
-- admin_audit_logs — no client access (service role only)
-- =============================================================================

-- No policies => anon/authenticated get no rows. Service role bypasses RLS.
