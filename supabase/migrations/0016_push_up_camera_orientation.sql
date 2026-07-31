-- Separate front/side push-up thresholds and tolerate brief mobile-camera
-- tracking loss without weakening the standard side-view form checks.

begin;

update public.exercise_versions ev
set is_active = false
from public.exercises e
where ev.exercise_id = e.id
  and e.slug = 'push-up';

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select
  e.id,
  coalesce((select max(ev.version) + 1 from public.exercise_versions ev where ev.exercise_id = e.id), 1),
  'push-up',
  'cam-v6',
  '{
    "elbowDownMax": 90,
    "elbowUpMin": 160,
    "hipSagMaxDrop": 0.12,
    "hipRiseMaxRise": 0.12,
    "elbowSymmetryMaxDelta": 18,
    "frontElbowDownMax": 105,
    "frontElbowIndividualDownMax": 115,
    "frontElbowUpMin": 150,
    "frontElbowSymmetryMaxDelta": 30,
    "bodyHorizontalMinRatio": 0.65,
    "kneeStraightMin": 145,
    "debounceFrames": 3,
    "trackingGraceFrames": 8,
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

update public.exercises
set camera_position = 'Mode depan dapat digunakan portrait atau landscape: pastikan kepala, kedua tangan, bahu, dan pinggul memiliki ruang dari tepi frame; kaki boleh bertumpuk. Mode samping landscape memberikan analisis garis tubuh paling lengkap. Kamera menyesuaikan otomatis saat HP diputar.'
where slug = 'push-up';

commit;
