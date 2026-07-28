import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { getExerciseVisual } from "@/features/exercises/presentation";
import { listExercises } from "@/features/exercises/queries";

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: "Pemula",
  intermediate: "Menengah",
  advanced: "Lanjutan",
};

export default async function ExercisesPage() {
  const exercises = await listExercises();

  return (
    <Container className="py-xl tablet-narrow:py-section">
      <header className="max-w-3xl">
        <p className="eyebrow text-mute">Training library</p>
        <h1 className="mt-md font-display text-6xl uppercase leading-[0.85] tablet-narrow:text-8xl">
          Pilih gerakan.
          <br />
          Mulai progres.
        </h1>
        <p className="mt-lg max-w-xl text-charcoal">
          Pelajari teknik, atur posisi kamera, lalu biarkan KITMOTION menghitung dan menilai setiap repetisimu.
        </p>
      </header>

      <div className="mt-section grid gap-lg tablet-narrow:grid-cols-2 desktop-small:grid-cols-3">
        {exercises.map((exercise, index) => {
          const visual = getExerciseVisual(exercise.slug);

          return (
            <Link
              key={exercise.slug}
              href={`/exercises/${exercise.slug}`}
              className="group overflow-hidden rounded-sm bg-white transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-square overflow-hidden bg-sport-black">
                <Image
                  src={visual.src}
                  alt={visual.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                <span className="absolute left-lg top-lg rounded-full border border-white/15 bg-black/45 px-md py-sm text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                  {DIFFICULTY_LABEL[exercise.difficulty] ?? exercise.difficulty}
                </span>
                <span className="absolute bottom-lg left-lg font-display text-5xl leading-none text-white/25">
                  0{index + 1}
                </span>
                <span className="absolute bottom-lg right-lg grid h-12 w-12 place-items-center rounded-full bg-sport-lime text-sport-black transition-transform group-hover:-rotate-45">
                  <Icon name="arrow" className="h-5 w-5" />
                </span>
              </div>
              <div className="p-xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-mute">
                  {exercise.default_target_reps
                    ? `${exercise.default_target_reps} repetisi`
                    : `${exercise.default_target_seconds ?? 30} detik`}
                </p>
                <h2 className="mt-sm font-display text-4xl uppercase">{exercise.name}</h2>
                <p className="mt-md line-clamp-2 text-sm leading-relaxed text-mute">
                  {exercise.description}
                </p>
                <p className="mt-lg border-t border-hairline-soft pt-md text-xs font-semibold text-charcoal">
                  {visual.cue}
                </p>
              </div>
            </Link>
          );
        })}

        {exercises.length === 0 && (
          <div className="rounded-sm border border-dashed border-hairline bg-white p-section">
            <Icon name="activity" className="h-8 w-8 text-mute" />
            <h2 className="mt-lg font-semibold">Latihan belum tersedia</h2>
            <p className="mt-sm text-sm text-mute">Admin belum mengaktifkan program latihan.</p>
          </div>
        )}
      </div>
    </Container>
  );
}
