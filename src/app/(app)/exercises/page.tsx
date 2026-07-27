import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { listExercises } from "@/features/exercises/queries";

const DIFFICULTY_LABEL: Record<string, string> = { beginner: "Pemula", intermediate: "Menengah", advanced: "Lanjutan" };
const TONES = ["bg-sport-lime", "bg-[#9bd7ff]", "bg-[#ffad7a]", "bg-[#d4c5ff]"];

export default async function ExercisesPage() {
  const exercises = await listExercises();
  return (
    <Container className="py-xl tablet-narrow:py-section">
      <header className="max-w-3xl"><p className="eyebrow text-mute">Training library</p><h1 className="mt-md font-display text-6xl uppercase leading-[0.85] tablet-narrow:text-8xl">Pilih gerakan.<br />Mulai progres.</h1><p className="mt-lg max-w-xl text-charcoal">Pelajari teknik, atur posisi kamera, lalu biarkan KITMOTION menghitung dan menilai setiap repetisimu.</p></header>
      <div className="mt-section grid gap-lg tablet-narrow:grid-cols-2 desktop-small:grid-cols-3">
        {exercises.map((exercise, index) => (
          <Link key={exercise.slug} href={`/exercises/${exercise.slug}`} className="group overflow-hidden rounded-sm bg-white">
            <div className={`relative aspect-[16/10] overflow-hidden ${TONES[index % TONES.length]}`}>
              <span className="absolute left-lg top-lg rounded-full bg-black/10 px-md py-sm text-[10px] font-bold uppercase tracking-widest">{DIFFICULTY_LABEL[exercise.difficulty] ?? exercise.difficulty}</span>
              <span className="absolute -bottom-8 -right-4 font-display text-[10rem] leading-none text-black/[0.08]">0{index + 1}</span>
              <Icon name={index === 1 ? "bolt" : "activity"} className="absolute bottom-lg left-lg h-20 w-20 text-black/70 transition-transform duration-300 group-hover:scale-110" />
              <span className="absolute bottom-lg right-lg grid h-12 w-12 place-items-center rounded-full bg-sport-black text-white transition-transform group-hover:-rotate-45"><Icon name="arrow" className="h-5 w-5" /></span>
            </div>
            <div className="p-xl"><p className="text-xs font-semibold uppercase tracking-widest text-mute">{exercise.default_target_reps ? `${exercise.default_target_reps} repetisi` : `${exercise.default_target_seconds ?? 30} detik`}</p><h2 className="mt-sm font-display text-4xl uppercase">{exercise.name}</h2><p className="mt-md line-clamp-2 text-sm leading-relaxed text-mute">{exercise.description}</p></div>
          </Link>
        ))}
        {exercises.length === 0 && <div className="rounded-sm border border-dashed border-hairline bg-white p-section"><Icon name="activity" className="h-8 w-8 text-mute" /><h2 className="mt-lg font-semibold">Latihan belum tersedia</h2><p className="mt-sm text-sm text-mute">Admin belum mengaktifkan program latihan.</p></div>}
      </div>
    </Container>
  );
}
