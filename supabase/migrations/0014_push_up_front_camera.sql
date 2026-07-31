-- Add front-camera depth scoring while preserving every historical session version.

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
  'cam-v4',
  '{
    "elbowDownMax": 90,
    "elbowUpMin": 160,
    "hipSagMaxDrop": 0.12,
    "hipRiseMaxRise": 0.12,
    "elbowSymmetryMaxDelta": 18,
    "bodyHorizontalMinRatio": 0.65,
    "frontBodyHorizontalMinRatio": 0.6,
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
set camera_position = 'Kamera rendah boleh diletakkan di depan agar layar terlihat, atau di samping untuk analisis garis tubuh yang lebih detail. Pastikan kepala, kedua tangan, pinggul, lutut, dan kaki masuk frame.'
where slug = 'push-up';

commit;
