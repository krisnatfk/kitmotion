-- KITMOTION — seed data.
-- Exercises, active exercise versions (engine config), level definitions,
-- badges, and one daily challenge. No device/badge IoT content.

-- =============================================================================
-- Exercises
-- =============================================================================

insert into public.exercises
  (slug, name, description, difficulty, camera_position, default_target_reps, default_target_seconds, is_active, sort_order)
values
  (
    'squat',
    'Squat',
    'Gerakan dasar untuk memperkuat otot paha, pinggul, dan inti tubuh. Turunkan pinggul seperti hendak duduk, lalu kembali berdiri.',
    'beginner',
    'Kamera dipasang menyamping, seluruh tubuh terlihat dari kepala hingga pergelangan kaki.',
    15,
    null,
    true,
    10
  ),
  (
    'jumping-jack',
    'Jumping Jack',
    'Latihan kardio sederhana: lompat sambil membuka kaki dan mengangkat tangan, lalu kembali ke posisi awal.',
    'beginner',
    'Kamera dipasang di depan, seluruh tubuh terlihat dari kepala hingga pergelangan kaki.',
    20,
    null,
    true,
    20
  ),
  (
    'push-up',
    'Push-up',
    'Gerakan kekuatan tubuh bagian atas. Turunkan dada ke arah lantai dengan siku menekuk, lalu dorong kembali ke atas.',
    'intermediate',
    'Kamera dipasang menyamping rendah, seluruh tubuh terlihat dari kepala hingga pergelangan kaki.',
    10,
    null,
    true,
    30
  )
on conflict (slug) do nothing;

-- =============================================================================
-- Exercise versions (active engine config per exercise)
-- =============================================================================
-- config jsonb holds tunable thresholds consumed by the matching engine.
-- Engine code carries its own defaults; DB config overrides/tunes them.
-- scoring_version is versioned so old sessions keep their original algorithm.

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select e.id, 1, 'squat', 'cam-v1',
  '{
    "kneeBottomMax": 100,
    "kneeStandMin": 160,
    "hipBackLeanMax": 70,
    "debounceFrames": 3,
    "minConfidence": 0.5,
    "tempoFastMs": 400,
    "tempoSlowMs": 3000,
    "kneeCaveinRatio": 0.55
  }'::jsonb, true
from public.exercises e where e.slug = 'squat'
on conflict do nothing;

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select e.id, 1, 'jumping-jack', 'cam-v1',
  '{
    "armOpenMinAngle": 150,
    "legOpenMinRatio": 1.25,
    "symmetryMaxDelta": 0.15,
    "debounceFrames": 3,
    "minConfidence": 0.5,
    "tempoFastMs": 350,
    "tempoSlowMs": 2500
  }'::jsonb, true
from public.exercises e where e.slug = 'jumping-jack'
on conflict do nothing;

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select e.id, 1, 'push-up', 'cam-v1',
  '{
    "elbowDownMax": 90,
    "elbowUpMin": 160,
    "hipSagMaxDrop": 0.12,
    "hipRiseMaxRise": 0.12,
    "debounceFrames": 3,
    "minConfidence": 0.5,
    "tempoFastMs": 400,
    "tempoSlowMs": 3000
  }'::jsonb, true
from public.exercises e where e.slug = 'push-up'
on conflict do nothing;

-- =============================================================================
-- Level definitions
-- =============================================================================

insert into public.level_definitions (level, name, min_total_xp, icon)
values
  (1, 'Beginner',        0,    'level-1'),
  (2, 'Active Starter',  100,  'level-2'),
  (3, 'Intermediate',    300,  'level-3'),
  (4, 'Advanced',        700,  'level-4'),
  (5, 'Expert',          1500, 'level-5'),
  (6, 'Master',          3000, 'level-6')
on conflict (level) do nothing;

-- =============================================================================
-- Badges
-- =============================================================================
-- criteria jsonb is evaluated server-side after each session.
-- { "type": "<metric>", "target": <number> }

insert into public.badges (code, name, description, criteria, xp_reward, is_active)
values
  (
    'first-workout',
    'Latihan Pertama',
    'Selesaikan sesi latihan pertamamu.',
    '{"type":"total_sessions","target":1}'::jsonb,
    20,
    true
  ),
  (
    'five-sessions',
    'Lima Sesi',
    'Selesaikan lima sesi latihan.',
    '{"type":"total_sessions","target":5}'::jsonb,
    50,
    true
  ),
  (
    'score-90',
    'Skor Sempurna',
    'Raih skor 90 atau lebih dalam satu sesi.',
    '{"type":"max_score","target":90}'::jsonb,
    80,
    true
  ),
  (
    'hundred-reps',
    'Seratus Repetisi',
    'Akumulasi 100 repetisi valid.',
    '{"type":"total_valid_reps","target":100}'::jsonb,
    60,
    true
  ),
  (
    'seven-day-streak',
    'Tujuh Hari Aktif',
    'Berlatih tujuh hari berturut-turut.',
    '{"type":"longest_streak","target":7}'::jsonb,
    100,
    true
  )
on conflict (code) do nothing;

-- =============================================================================
-- Daily challenge (demo MVP window)
-- =============================================================================

insert into public.challenges
  (code, title, description, period, starts_at, ends_at, criteria, xp_reward, is_active)
values
  (
    'daily-squat-30',
    'Harian: 30 Squat',
    'Selesaikan 30 repetisi squat hari ini.',
    'daily',
    now(),
    now() + interval '30 days',
    '{"type":"session_reps","exercise_slug":"squat","target":30}'::jsonb,
    30,
    true
  )
on conflict (code) do nothing;
