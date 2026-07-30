import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { getExerciseVisual } from "@/features/exercises/presentation";
import { getActiveVersion, getExerciseBySlug } from "@/features/exercises/queries";
import { TargetSelector } from "@/features/exercises/target-selector";
import { getExerciseTutorial } from "@/features/exercises/tutorials";
import { ExerciseMotionDemo } from "@/features/exercises/motion-demo";
import { targetRepsForLevel } from "@/features/exercises/difficulty";
import { getCurrentProgress } from "@/features/profile/queries";
import { getSupabaseServer } from "@/lib/supabase/server";

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: "Pemula",
  intermediate: "Menengah",
  advanced: "Lanjutan",
};

const COACH_STEPS = [
  "Izinkan akses kamera saat diminta.",
  "Mundur hingga seluruh tubuh masuk ke frame.",
  "Tahan posisi sampai hitung mundur otomatis dimulai.",
  "Ikuti feedback sampai target latihan tercapai.",
];

export default async function ExerciseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ milestone?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const parsedMilestone = Number.parseInt(query.milestone ?? "", 10);
  const milestoneLevel = Number.isInteger(parsedMilestone) && parsedMilestone >= 10 && parsedMilestone % 10 === 0 ? parsedMilestone : null;
  const exercise = await getExerciseBySlug(slug);

  if (!exercise) notFound();

  const version = await getActiveVersion(exercise.id);
  const visual = getExerciseVisual(exercise.slug);
  const fallbackTutorial = getExerciseTutorial(exercise.slug);
  const supabase = await getSupabaseServer();
  const [milestoneResult, tutorialResult, progress] = await Promise.all([
    milestoneLevel == null
      ? Promise.resolve({ data: null })
      : supabase.from("milestone_challenges")
        .select("target_reps, minimum_score, max_form_errors, require_tracking_continuity")
        .eq("milestone_level", milestoneLevel)
        .eq("exercise_id", exercise.id)
        .eq("is_active", true)
        .maybeSingle(),
    supabase.from("exercise_tutorials").select("start_position, steps, common_mistakes, safety_tips, animation_url").eq("exercise_id", exercise.id).maybeSingle(),
    getCurrentProgress(),
  ]);
  const milestoneChallenge = milestoneResult.data;
  const tutorialRow = tutorialResult.data;
  const tutorial = tutorialRow ? {
    startPosition: tutorialRow.start_position,
    steps: stringArray(tutorialRow.steps, fallbackTutorial.steps),
    mistakes: stringArray(tutorialRow.common_mistakes, fallbackTutorial.mistakes),
    safety: stringArray(tutorialRow.safety_tips, fallbackTutorial.safety),
    animationUrl: tutorialRow.animation_url ?? fallbackTutorial.animationUrl,
  } : fallbackTutorial;
  const levelTargetReps = targetRepsForLevel(exercise.default_target_reps, progress?.current_level ?? 1);
  const displayedTargetReps = milestoneChallenge?.target_reps ?? levelTargetReps;

  return (
    <>
      <section className="overflow-hidden bg-sport-black text-white">
        <Container className="grid gap-xxl py-xl tablet-narrow:py-xxl desktop-small:min-h-[calc(100svh-76px)] desktop-small:grid-cols-2 desktop-small:items-center desktop-small:gap-section">
            <div className="min-w-0 desktop-small:pr-xl">
              <div className="flex flex-wrap items-center gap-sm mobile-landscape:gap-md">
                <Link
                  href="/exercises"
                  className="inline-flex min-h-10 items-center gap-sm text-sm text-white/60 transition-colors hover:text-sport-lime"
                >
                  <Icon name="arrow" className="h-4 w-4 shrink-0 rotate-180" />
                  <span>Semua latihan</span>
                </Link>
                <span className="inline-flex min-h-9 items-center gap-sm rounded-full border border-sport-lime/30 bg-sport-lime/10 px-md text-[11px] font-bold uppercase tracking-[0.16em] text-sport-lime">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sport-lime" />
                  {DIFFICULTY_LABEL[exercise.difficulty] ?? exercise.difficulty}
                </span>
              </div>

              <p className="mt-xl text-xs font-bold uppercase tracking-[0.2em] text-white/45">
                Panduan gerakan
              </p>
              <h1 className="mt-md text-balance break-words font-display text-[clamp(4.75rem,19vw,7.5rem)] uppercase leading-[0.8] desktop-small:text-[clamp(7rem,8vw,9rem)]">
              {exercise.name}
            </h1>
            <p className="mt-xl max-w-xl text-sm leading-relaxed text-white/65 tablet-narrow:text-base">
              {exercise.description}
            </p>
              <div className="mt-xxl flex flex-col gap-lg mobile-landscape:flex-row mobile-landscape:items-center">
                <ButtonLink
                  href="#motion-demo-title"
                  className="w-full bg-sport-lime px-xxl text-sport-black hover:bg-white mobile-landscape:w-auto"
                >
                  <Icon name="play" className="h-5 w-5" />
                  Lihat tutorial
                </ButtonLink>
                <div className="flex items-center gap-md border-white/15 mobile-landscape:border-l mobile-landscape:pl-lg">
                  <strong className="font-display text-4xl leading-none text-white">
                    {displayedTargetReps ?? exercise.default_target_seconds ?? "—"}
                  </strong>
                  <span className="max-w-20 text-[10px] font-bold uppercase leading-relaxed tracking-[0.15em] text-white/45">
                    {displayedTargetReps ? "Target repetisi" : "Target detik"}
                  </span>
                </div>
              </div>
            </div>

            <figure className="relative aspect-square w-[min(100%,520px,calc(100svh-124px))] justify-self-center overflow-hidden rounded-[28px] border border-white/15 bg-[#111310] desktop-small:justify-self-end">
              <Image
                src={visual.src}
                alt={visual.alt}
                fill
                priority
                sizes="(min-width: 1200px) 520px, (min-width: 1024px) 47vw, 100vw"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />
              <span className="absolute left-lg top-lg rounded-full border border-white/15 bg-black/55 px-md py-sm text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                Contoh teknik
              </span>
              <figcaption className="absolute inset-x-lg bottom-lg flex items-end justify-between gap-md">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sport-lime">
                    Posisi gerakan
                  </p>
                  <p className="mt-xs text-sm font-semibold text-white">{visual.cue}</p>
                </div>
                <span className="hidden rounded-full bg-sport-lime px-md py-sm text-[10px] font-bold uppercase tracking-widest text-sport-black mobile-landscape:inline-flex">
                  {exercise.name}
                </span>
              </figcaption>
            </figure>
        </Container>
      </section>

      <Container className="py-section">
        <div className="grid gap-section desktop-small:grid-cols-[1fr_360px]">
          <div>
            {milestoneChallenge && (
              <div className="mb-section rounded-sm border border-[#e7c951] bg-[#fff6c7] p-xl">
                <p className="text-xs font-bold uppercase tracking-widest">Challenge level {milestoneLevel}</p>
                <p className="mt-sm text-sm leading-relaxed text-charcoal">Selesaikan {milestoneChallenge.target_reps} repetisi dengan skor minimal {Number(milestoneChallenge.minimum_score)}, maksimal {milestoneChallenge.max_form_errors} kesalahan{milestoneChallenge.require_tracking_continuity ? ", dan tetap terlihat kamera sepanjang sesi" : ""}.</p>
              </div>
            )}
            <h2 className="font-display text-4xl uppercase tablet-narrow:text-5xl">
              Persiapan sebelum mulai
            </h2>
            <div className="mt-xl grid gap-md tablet-narrow:grid-cols-2">
              {[
                {
                  icon: "camera" as const,
                  title: "Posisi kamera",
                  body: exercise.camera_position,
                },
                {
                  icon: "shield" as const,
                  title: "Area aman",
                  body: "Pastikan seluruh tubuh terlihat, pencahayaan cukup, dan tidak ada benda yang menghalangi gerak.",
                },
              ].map((item) => (
                <article key={item.title} className="rounded-sm bg-white p-xl">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-sport-lime">
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-lg font-semibold">{item.title}</h3>
                  <p className="mt-sm text-sm leading-relaxed text-mute">{item.body}</p>
                </article>
              ))}
            </div>

            <ExerciseMotionDemo
              slug={exercise.slug}
              exerciseName={exercise.name}
              animationUrl={tutorial.animationUrl}
            />

            <div className="mt-section">
              <p className="text-xs font-bold uppercase tracking-widest text-mute">Posisi awal</p>
              <p className="mt-sm max-w-2xl text-sm leading-relaxed text-charcoal">{tutorial.startPosition}</p>
            </div>

            <div className="mt-section">
              <h2 className="font-display text-4xl uppercase tablet-narrow:text-5xl">
                Tahapan gerakan
              </h2>
              <ol className="mt-lg grid gap-md tablet-narrow:grid-cols-2">
                {tutorial.steps.map((step, index) => (
                  <li key={step} className="flex gap-md rounded-sm bg-white p-lg">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sport-black font-display text-lg text-sport-lime">{index + 1}</span>
                    <span className="pt-xs text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-section grid gap-md tablet-narrow:grid-cols-2">
              <article className="rounded-sm border border-[#f2c16b] bg-[#fff8e7] p-xl">
                <h2 className="font-display text-3xl uppercase">Kesalahan umum</h2>
                <ul className="mt-lg space-y-sm text-sm leading-relaxed text-charcoal">
                  {tutorial.mistakes.map((item) => <li key={item} className="flex gap-sm"><span aria-hidden="true">•</span><span>{item}</span></li>)}
                </ul>
              </article>
              <article className="rounded-sm border border-[#b9d8c4] bg-[#eef8f1] p-xl">
                <h2 className="font-display text-3xl uppercase">Tips keselamatan</h2>
                <ul className="mt-lg space-y-sm text-sm leading-relaxed text-charcoal">
                  {tutorial.safety.map((item) => <li key={item} className="flex gap-sm"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span>{item}</span></li>)}
                </ul>
              </article>
            </div>

            <div className="mt-section">
              <h2 className="font-display text-4xl uppercase tablet-narrow:text-5xl">
                Cara menggunakan coach
              </h2>
              <ol className="mt-lg divide-y divide-hairline-soft border-y border-hairline-soft">
                {COACH_STEPS.map((step, index) => (
                  <li key={step} className="flex items-start gap-lg py-lg">
                    <span className="font-display text-2xl text-mute">0{index + 1}</span>
                    <span className="pt-xs text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <aside className="h-fit rounded-sm bg-white p-xl desktop-small:sticky desktop-small:top-28">
            <p className="text-xs font-bold uppercase tracking-widest text-mute">Target sesi</p>
            <div className="mt-lg flex items-end justify-between border-b border-hairline-soft pb-lg">
              <span className="text-sm text-mute">Repetisi bawaan</span>
              <strong className="font-display text-4xl">{displayedTargetReps ?? "—"}</strong>
            </div>
            <div className="flex items-end justify-between border-b border-hairline-soft py-lg">
              <span className="text-sm text-mute">Durasi</span>
              <strong className="font-display text-4xl">
                {exercise.default_target_seconds ? `${exercise.default_target_seconds}s` : "Bebas"}
              </strong>
            </div>
            <TargetSelector
              slug={exercise.slug}
              defaultReps={displayedTargetReps}
              defaultSeconds={exercise.default_target_seconds}
              milestoneLevel={milestoneLevel}
            />
            {version && (
              <p className="mt-lg text-center text-[10px] text-stone">
                Engine {version.engine_key} · scoring {version.scoring_version} · v{version.version}
              </p>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}

function stringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}
