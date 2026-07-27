import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { getActiveVersion, getExerciseBySlug } from "@/features/exercises/queries";
import { TargetSelector } from "@/features/exercises/target-selector";

const DIFFICULTY_LABEL: Record<string, string> = { beginner: "Pemula", intermediate: "Menengah", advanced: "Lanjutan" };

export default async function ExerciseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exercise = await getExerciseBySlug(slug);
  if (!exercise) notFound();
  const version = await getActiveVersion(exercise.id);

  return (
    <>
      <section className="bg-sport-black text-white">
        <Container className="grid min-h-[430px] gap-xl py-section tablet-narrow:grid-cols-[1.1fr_0.9fr] tablet-narrow:items-center">
          <div><Link href="/exercises" className="inline-flex items-center gap-sm text-sm text-white/55 hover:text-sport-lime"><Icon name="arrow" className="h-4 w-4 rotate-180" /> Semua latihan</Link><p className="eyebrow mt-section text-sport-lime">{DIFFICULTY_LABEL[exercise.difficulty] ?? exercise.difficulty}</p><h1 className="mt-md font-display text-7xl uppercase leading-[0.82] tablet-narrow:text-9xl">{exercise.name}</h1><p className="mt-lg max-w-xl text-white/60">{exercise.description}</p><ButtonLink href={`/workout/${exercise.slug}`} className="mt-xl bg-sport-lime px-xxl text-sport-black hover:bg-white"><Icon name="play" className="h-5 w-5" /> Mulai latihan</ButtonLink></div>
          <div className="relative hidden aspect-square place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] tablet-narrow:grid"><div className="absolute inset-8 rounded-full border border-sport-lime/30" /><div className="absolute inset-16 rounded-full border border-dashed border-white/15" /><Icon name="activity" className="h-36 w-36 text-sport-lime" /><span className="absolute bottom-10 rounded-full bg-white px-lg py-sm text-xs font-bold uppercase tracking-widest text-black">AI Ready</span></div>
        </Container>
      </section>
      <Container className="py-section">
        <div className="grid gap-section desktop-small:grid-cols-[1fr_360px]">
          <div><h2 className="font-display text-4xl uppercase">Persiapan sebelum mulai</h2><div className="mt-xl grid gap-md tablet-narrow:grid-cols-2">{[
            { icon: "camera" as const, title: "Posisi kamera", body: exercise.camera_position },
            { icon: "shield" as const, title: "Area aman", body: "Pastikan seluruh tubuh terlihat, pencahayaan cukup, dan tidak ada benda yang menghalangi gerak." },
          ].map((item) => <article key={item.title} className="rounded-sm bg-white p-xl"><span className="grid h-11 w-11 place-items-center rounded-full bg-sport-lime"><Icon name={item.icon} className="h-5 w-5" /></span><h3 className="mt-lg font-semibold">{item.title}</h3><p className="mt-sm text-sm leading-relaxed text-mute">{item.body}</p></article>)}</div><div className="mt-section"><h2 className="font-display text-4xl uppercase">Cara menggunakan coach</h2><ol className="mt-lg divide-y divide-hairline-soft border-y border-hairline-soft">{["Izinkan akses kamera saat diminta.", "Mundur hingga seluruh tubuh masuk ke frame.", "Tunggu indikator siap, lalu tekan Mulai.", "Ikuti feedback sampai target latihan tercapai."].map((step, index) => <li key={step} className="flex gap-lg py-lg"><span className="font-display text-2xl text-mute">0{index + 1}</span><span className="text-sm">{step}</span></li>)}</ol></div></div>
          <aside className="h-fit rounded-sm bg-white p-xl desktop-small:sticky desktop-small:top-28"><p className="text-xs font-bold uppercase tracking-widest text-mute">Target sesi</p><div className="mt-lg flex items-end justify-between border-b border-hairline-soft pb-lg"><span className="text-sm text-mute">Repetisi bawaan</span><strong className="font-display text-4xl">{exercise.default_target_reps ?? "—"}</strong></div><div className="flex items-end justify-between border-b border-hairline-soft py-lg"><span className="text-sm text-mute">Durasi</span><strong className="font-display text-4xl">{exercise.default_target_seconds ? `${exercise.default_target_seconds}s` : "Bebas"}</strong></div><TargetSelector slug={exercise.slug} defaultReps={exercise.default_target_reps} defaultSeconds={exercise.default_target_seconds} />{version && <p className="mt-lg text-center text-[10px] text-stone">Engine {version.engine_key} · scoring {version.scoring_version} · v{version.version}</p>}</aside>
        </div>
      </Container>
    </>
  );
}
