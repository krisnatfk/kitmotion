-- Version the stricter camera scoring rules without changing historical runs.
-- Existing workout_sessions keep their exercise_version_id and scoring_version.

begin;

update public.exercise_versions ev
set is_active = false
from public.exercises e
where ev.exercise_id = e.id
  and e.slug in ('squat', 'jumping-jack', 'push-up');

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select
  e.id,
  coalesce((select max(ev.version) + 1 from public.exercise_versions ev where ev.exercise_id = e.id), 1),
  'squat',
  'cam-v2',
  '{
    "kneeBottomMax": 100,
    "kneeStandMin": 160,
    "hipBackLeanMax": 70,
    "hipBottomMax": 125,
    "torsoLeanValidMax": 50,
    "debounceFrames": 3,
    "minConfidence": 0.5,
    "tempoFastMs": 400,
    "tempoSlowMs": 3000,
    "kneeCaveinRatio": 0.55
  }'::jsonb,
  true
from public.exercises e
where e.slug = 'squat'
on conflict (exercise_id, scoring_version) do update
set engine_key = excluded.engine_key,
    config = excluded.config,
    is_active = true;

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select
  e.id,
  coalesce((select max(ev.version) + 1 from public.exercise_versions ev where ev.exercise_id = e.id), 1),
  'jumping-jack',
  'cam-v3',
  '{
    "armOpenMinAngle": 150,
    "armClosedMaxAngle": 35,
    "armOpenMinRatio": 1.5,
    "armHeightMinRatio": 0.3,
    "legOpenMinRatio": 1.25,
    "legClosedMaxRatio": 1.1,
    "symmetryMaxDelta": 0.15,
    "coordinationMaxDelta": 0.35,
    "debounceFrames": 3,
    "minConfidence": 0.5,
    "tempoFastMs": 350,
    "tempoSlowMs": 2500
  }'::jsonb,
  true
from public.exercises e
where e.slug = 'jumping-jack'
on conflict (exercise_id, scoring_version) do update
set engine_key = excluded.engine_key,
    config = excluded.config,
    is_active = true;

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select
  e.id,
  coalesce((select max(ev.version) + 1 from public.exercise_versions ev where ev.exercise_id = e.id), 1),
  'push-up',
  'cam-v3',
  '{
    "elbowDownMax": 90,
    "elbowUpMin": 160,
    "hipSagMaxDrop": 0.12,
    "hipRiseMaxRise": 0.12,
    "elbowSymmetryMaxDelta": 18,
    "bodyHorizontalMinRatio": 0.65,
    "debounceFrames": 3,
    "minConfidence": 0.5,
    "tempoFastMs": 400,
    "tempoSlowMs": 3000
  }'::jsonb,
  true
from public.exercises e
where e.slug = 'push-up'
on conflict (exercise_id, scoring_version) do update
set engine_key = excluded.engine_key,
    config = excluded.config,
    is_active = true;

commit;
