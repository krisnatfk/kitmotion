import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/features/admin/guard";
import { adminListExercises } from "@/features/admin/queries";
import { AdminExerciseForm } from "@/features/admin/admin-exercise-form";

export const dynamic = "force-dynamic";

export default async function AdminExercisesPage() {
  await requireAdmin("/admin/exercises");
  const exercises = await adminListExercises();
  const active = exercises.filter((exercise) => exercise.is_active).length;

  return <div className="space-y-xl"><header className="flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between"><div><p className="eyebrow text-sport-lime-deep">AI movement catalog</p><h1 className="mt-md font-display text-5xl uppercase leading-none tablet-narrow:text-6xl">Konten latihan</h1><p className="mt-md max-w-2xl text-sm leading-relaxed text-mute">Atur gerakan, tingkat kesulitan, target, serta konfigurasi engine pose.</p></div><div className="flex gap-sm"><span className="rounded-full bg-white px-md py-sm text-xs font-semibold">{exercises.length} total</span><span className="rounded-full bg-sport-lime px-md py-sm text-xs font-semibold">{active} aktif</span></div></header><div className="grid gap-md desktop:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] desktop:items-start"><section className="overflow-hidden rounded-sm border border-black/[0.08] bg-white"><div className="border-b border-black/[0.08] p-lg"><p className="font-semibold">Daftar latihan</p><p className="mt-xs text-xs text-mute">Pilih latihan untuk mengelola versi engine.</p></div><div className="divide-y divide-black/[0.08]">{exercises.map((exercise) => <Link key={exercise.id} href={`/admin/exercises/${exercise.id}`} className="group flex items-center gap-md p-lg transition-colors hover:bg-[#f5f7f3]"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sport-black text-sport-lime"><Icon name="activity" className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-sm"><p className="font-semibold">{exercise.name}</p><span className={`h-2 w-2 rounded-full ${exercise.is_active ? "bg-success-bright" : "bg-stone"}`} /></div><p className="mt-xs truncate text-xs text-mute">{exercise.slug} · {difficultyLabel(exercise.difficulty)}</p></div><Icon name="arrow" className="h-4 w-4 text-mute transition-transform group-hover:translate-x-1" /></Link>)}{exercises.length === 0 && <p className="p-xl text-center text-sm text-mute">Belum ada latihan.</p>}</div></section><section className="rounded-sm border border-black/[0.08] bg-white p-lg tablet-narrow:p-xl"><div className="mb-xl flex items-center gap-md border-b border-black/[0.08] pb-lg"><span className="grid h-11 w-11 place-items-center rounded-full bg-sport-lime"><Icon name="activity" className="h-5 w-5" /></span><div><p className="font-semibold">Buat latihan baru</p><p className="mt-xs text-xs text-mute">Tambahkan gerakan ke katalog KITMOTION.</p></div></div><AdminExerciseForm /></section></div></div>;
}

function difficultyLabel(value: string) { return value === "beginner" ? "Pemula" : value === "intermediate" ? "Menengah" : "Lanjutan"; }
