-- Add school fitness assessments requested for camera scoring:
-- sit-up, pull-up, and the timed flexed-arm hang (chinning-up).

begin;

insert into public.exercises
  (slug, name, description, difficulty, camera_position, default_target_reps, default_target_seconds, is_active, sort_order)
values
  (
    'sit-up',
    'Sit-up',
    'Latihan otot perut dengan validasi punggung lurus dan dada mencapai lutut.',
    'beginner',
    'Letakkan kamera di samping setinggi pinggang. Pastikan kepala, bahu, pinggul, lutut, dan kaki terlihat penuh.',
    15,
    null,
    true,
    40
  ),
  (
    'pull-up',
    'Pull-up',
    'Tes kekuatan lengan dengan hitungan valid saat dagu melewati palang dan lengan kembali lurus.',
    'advanced',
    'Letakkan kamera di depan setinggi dada. Pastikan palang, wajah, kedua lengan, badan, dan kaki terlihat penuh.',
    6,
    null,
    true,
    50
  ),
  (
    'chinning-up',
    'Chinning-up',
    'Tes gantung siku tekuk; hanya durasi dengan dagu di atas palang dan badan stabil yang dihitung.',
    'intermediate',
    'Letakkan kamera di depan setinggi dada. Pastikan wajah, kedua lengan, badan, dan kaki terlihat penuh.',
    null,
    30,
    true,
    60
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  difficulty = excluded.difficulty,
  camera_position = excluded.camera_position,
  default_target_reps = excluded.default_target_reps,
  default_target_seconds = excluded.default_target_seconds,
  is_active = true,
  sort_order = excluded.sort_order;

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select e.id, coalesce((select max(v.version) + 1 from public.exercise_versions v where v.exercise_id = e.id), 1), 'sit-up', 'cam-v1',
  '{
    "hipDownMin":145,
    "hipTopMax":75,
    "chestKneeMaxRatio":0.72,
    "backStraightMin":150,
    "kneeBentMin":65,
    "kneeBentMax":115,
    "debounceFrames":3,
    "minConfidence":0.5,
    "tempoFastMs":500,
    "tempoSlowMs":4000
  }'::jsonb,
  true
from public.exercises e where e.slug = 'sit-up'
on conflict (exercise_id, scoring_version) do update set
  engine_key = excluded.engine_key,
  config = excluded.config,
  is_active = true;

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select e.id, coalesce((select max(v.version) + 1 from public.exercise_versions v where v.exercise_id = e.id), 1), 'pull-up', 'cam-v1',
  '{
    "elbowHangMin":155,
    "elbowTopMax":105,
    "chinAboveHandsMarginRatio":0,
    "handsAboveShoulderMinRatio":0.45,
    "elbowSymmetryMaxDelta":20,
    "bodySwingMaxRatio":0.28,
    "debounceFrames":3,
    "minConfidence":0.5,
    "tempoFastMs":500,
    "tempoSlowMs":5000
  }'::jsonb,
  true
from public.exercises e where e.slug = 'pull-up'
on conflict (exercise_id, scoring_version) do update set
  engine_key = excluded.engine_key,
  config = excluded.config,
  is_active = true;

insert into public.exercise_versions
  (exercise_id, version, engine_key, scoring_version, config, is_active)
select e.id, coalesce((select max(v.version) + 1 from public.exercise_versions v where v.exercise_id = e.id), 1), 'chinning-up', 'cam-v1',
  '{
    "elbowHoldMax":105,
    "chinAboveHandsMarginRatio":0,
    "elbowSymmetryMaxDelta":20,
    "bodySwingMaxRatio":0.25,
    "minConfidence":0.5,
    "maximumFrameGapMs":250
  }'::jsonb,
  true
from public.exercises e where e.slug = 'chinning-up'
on conflict (exercise_id, scoring_version) do update set
  engine_key = excluded.engine_key,
  config = excluded.config,
  is_active = true;

insert into public.exercise_tutorials
  (exercise_id, start_position, steps, common_mistakes, safety_tips)
select id,
  case slug
    when 'sit-up' then 'Berbaring telentang menghadap samping kamera, lutut ditekuk sekitar 90 derajat, kaki menapak, dan punggung lurus di matras.'
    when 'pull-up' then 'Menggantung menghadap kamera dengan kedua tangan selebar bahu, siku lurus, serta badan dan tungkai dalam satu garis.'
    else 'Pegang palang dengan telapak menghadap kepala, tekuk siku, posisikan dagu di atas palang, dan luruskan badan.'
  end,
  case slug
    when 'sit-up' then '["Tahan kaki tetap menapak","Angkat badan dengan punggung lurus","Dekatkan dada sampai mencapai lutut dan hitungan bertambah","Kembali telentang sebelum repetisi berikutnya"]'::jsonb
    when 'pull-up' then '["Mulai dari lengan lurus","Tarik tubuh tanpa mengayun","Naik sampai dagu melewati palang dan hitungan bertambah","Kembali sampai kedua lengan lurus sebelum tarikan berikutnya"]'::jsonb
    else '["Ambil posisi siku tekuk","Tahan dagu di atas palang","Jaga badan dan tungkai lurus","Pertahankan posisi selama mungkin"]'::jsonb
  end,
  case slug
    when 'sit-up' then '["Dada belum mencapai lutut","Punggung membulat","Sudut lutut berubah terlalu jauh"]'::jsonb
    when 'pull-up' then '["Dagu belum mencapai palang","Lengan tidak lurus saat turun","Badan mengayun"]'::jsonb
    else '["Dagu turun di bawah palang","Siku terlalu terbuka","Badan mengayun"]'::jsonb
  end,
  '["Gunakan alat yang kokoh dan area yang aman","Hentikan latihan bila terasa nyeri atau pegangan melemah"]'::jsonb
from public.exercises
where slug in ('sit-up', 'pull-up', 'chinning-up')
on conflict (exercise_id) do update set
  start_position = excluded.start_position,
  steps = excluded.steps,
  common_mistakes = excluded.common_mistakes,
  safety_tips = excluded.safety_tips,
  updated_at = now();

commit;
