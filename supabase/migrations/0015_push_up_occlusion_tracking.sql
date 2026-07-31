-- Keep front-facing push-ups active when legs overlap in perspective, while
-- rejecting knee-supported or cropped side-view setup poses.

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
  'cam-v5',
  '{
    "elbowDownMax": 90,
    "elbowUpMin": 160,
    "hipSagMaxDrop": 0.12,
    "hipRiseMaxRise": 0.12,
    "elbowSymmetryMaxDelta": 18,
    "bodyHorizontalMinRatio": 0.65,
    "kneeStraightMin": 145,
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

update public.exercises
set camera_position = 'Mode utama di HP portrait: letakkan kamera rendah di depan dan pastikan kedua tangan, bahu, serta pinggul terlihat; kaki boleh saling menutupi. Jika memilih posisi samping, putar HP ke landscape agar seluruh tubuh masuk frame. Mulai dari plank dengan lutut lurus.'
where slug = 'push-up';

commit;
