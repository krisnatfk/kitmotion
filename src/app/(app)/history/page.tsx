import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { listExercises } from "@/features/exercises/queries";
import { listSessions } from "@/features/history/queries";
import { formatDistance, formatDuration, formatPace } from "@/features/running/metrics";
import { listRuns } from "@/features/running/queries";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ exercise?: string }> }) {
  const params = await searchParams;
  const [sessions, exercises, runs] = await Promise.all([
    listSessions(params.exercise ? { exerciseSlug: params.exercise } : undefined),
    listExercises(),
    params.exercise ? Promise.resolve([]) : listRuns(20),
  ]);
  const average = sessions.length ? Math.round(sessions.reduce((sum, session) => sum + Number(session.final_score ?? 0), 0) / sessions.length) : 0;
  const validReps = sessions.reduce((sum, session) => sum + session.valid_reps, 0);
  const invalidReps = sessions.reduce((sum, session) => sum + session.invalid_reps, 0);

  return <Container className="py-xl tablet-narrow:py-section">
    <header className="flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
      <div><p className="eyebrow text-mute">Performance log</p><h1 className="mt-md font-display text-6xl uppercase leading-none tablet-narrow:text-8xl">Riwayat aktivitas</h1><p className="mt-md max-w-2xl text-sm leading-relaxed text-mute">Lihat bukan hanya hasil akhirnya, tetapi repetisi mana yang benar, apa yang perlu diperbaiki, serta perkembangan aktivitas larimu.</p></div>
      <div className="grid grid-cols-2 gap-sm tablet-narrow:grid-cols-4"><HeaderStat label="Aktivitas" value={String(sessions.length + runs.length)} dark /><HeaderStat label="Rata-rata skor" value={average ? String(average) : "—"} /><HeaderStat label="Rep valid" value={String(validReps)} /><HeaderStat label="Perlu perbaikan" value={String(invalidReps)} /></div>
    </header>

    <nav className="mt-xl flex gap-sm overflow-x-auto pb-sm" aria-label="Filter latihan"><Link href="/history" className={`chip shrink-0 ${!params.exercise ? "chip-active" : ""}`}>Semua aktivitas</Link>{exercises.map((exercise) => <Link key={exercise.slug} href={`/history?exercise=${exercise.slug}`} className={`chip shrink-0 ${params.exercise === exercise.slug ? "chip-active" : ""}`}>{exercise.name}</Link>)}</nav>

    <section className="mt-lg">
      <div><p className="text-[10px] font-bold uppercase tracking-widest text-mute">Analisis kamera</p><h2 className="mt-xs font-display text-4xl uppercase">Latihan gerakan</h2></div>
      {sessions.length > 0 ? <div className="mt-lg space-y-sm">{sessions.map((session, index) => {
        const total = Math.max(session.total_reps, session.valid_reps + session.invalid_reps);
        const rate = total > 0 ? Math.round((session.valid_reps / total) * 100) : 0;
        return <Link key={session.id} href={`/history/${session.id}`} className="group grid gap-lg rounded-sm bg-white p-lg transition-transform hover:-translate-y-0.5 tablet-narrow:grid-cols-[auto_minmax(0,1fr)_auto] tablet-narrow:items-center tablet-narrow:p-xl"><span className="hidden h-12 w-12 place-items-center rounded-full bg-sport-lime font-display text-xl tablet-narrow:grid">{String(index + 1).padStart(2, "0")}</span><div><div className="flex flex-wrap items-center gap-sm"><p className="font-semibold">{session.exercises?.name ?? "Latihan"}</p><span className="rounded-full bg-soft-cloud px-sm py-xs text-[9px] font-bold uppercase tracking-wider text-mute">Grade {session.grade ?? "—"}</span></div><p className="mt-xs text-xs text-mute">{formatDate(session.completed_at)} · {formatDuration(session.duration_seconds)}</p><div className="mt-md flex flex-wrap gap-sm"><span className="rounded-full bg-[#ddf8e8] px-md py-xs text-[10px] font-semibold text-success">{session.valid_reps} valid</span><span className="rounded-full bg-[#fff0eb] px-md py-xs text-[10px] font-semibold text-[#a43b20]">{session.invalid_reps} perlu perbaikan</span><span className="rounded-full bg-soft-cloud px-md py-xs text-[10px] font-semibold text-mute">Akurasi gerakan {rate}%</span></div></div><div className="flex items-center justify-between gap-lg border-t border-hairline-soft pt-md tablet-narrow:border-0 tablet-narrow:pt-0"><div className="text-left tablet-narrow:text-right"><p className="font-display text-4xl">{session.final_score != null ? Math.round(Number(session.final_score)) : "—"}</p><p className="text-[9px] uppercase tracking-widest text-mute">Skor / 100</p></div><Icon name="arrow" className="h-5 w-5 transition-transform group-hover:translate-x-1" /></div></Link>;
      })}</div> : <EmptyState title="Belum ada sesi latihan" body="Selesaikan latihan kamera dan analisis repetisinya akan muncul di sini." href="/exercises" action="Pilih latihan" icon="activity" />}
    </section>

    {!params.exercise && <section className="mt-section">
      <div><p className="text-[10px] font-bold uppercase tracking-widest text-mute">GPS activity</p><h2 className="mt-xs font-display text-4xl uppercase">Lari & rute</h2></div>
      {runs.length > 0 ? <div className="mt-lg grid gap-md tablet-narrow:grid-cols-2 desktop-small:grid-cols-3">{runs.map((run) => <Link key={run.id} href={`/running/${run.id}`} className="group rounded-sm bg-sport-black p-lg text-white transition-transform hover:-translate-y-1"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-full bg-sport-lime text-sport-black"><Icon name="route" className="h-5 w-5" /></span><Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div><p className="mt-lg text-[10px] uppercase tracking-widest text-white/40">{formatDate(run.completed_at)}</p><p className="mt-xs font-display text-5xl text-sport-lime">{formatDistance(Number(run.distance_meters))}<span className="ml-xs font-sans text-xs text-white/40">km</span></p><div className="mt-md grid grid-cols-2 gap-sm border-t border-white/10 pt-md"><SmallStat label="Durasi" value={formatDuration(run.duration_seconds)} /><SmallStat label="Pace" value={`${formatPace(run.average_pace_seconds_per_km)} /km`} /></div></Link>)}</div> : <EmptyState title="Belum ada aktivitas lari" body="Rekam rute, jarak, dan pace pertamamu melalui tracker GPS." href="/running" action="Buka tracker lari" icon="route" />}
    </section>}
  </Container>;
}

function HeaderStat({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) { return <div className={`min-w-28 rounded-sm px-lg py-md ${dark ? "bg-sport-black text-white" : "bg-white"}`}><p className={`text-[9px] uppercase tracking-widest ${dark ? "text-white/45" : "text-mute"}`}>{label}</p><p className={`mt-xs font-display text-3xl ${dark ? "text-sport-lime" : ""}`}>{value}</p></div>; }
function SmallStat({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] uppercase tracking-widest text-white/35">{label}</p><p className="mt-xs text-xs font-semibold">{value}</p></div>; }
function EmptyState({ title, body, href, action, icon }: { title: string; body: string; href: string; action: string; icon: "activity" | "route" }) { return <div className="mt-lg flex flex-col items-center rounded-sm border border-dashed border-hairline bg-white px-xl py-section text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-soft-cloud"><Icon name={icon} className="h-6 w-6 text-mute" /></span><h3 className="mt-lg font-semibold">{title}</h3><p className="mt-xs max-w-md text-sm text-mute">{body}</p><Link href={href} className="mt-lg font-semibold underline underline-offset-4">{action}</Link></div>; }
function formatDate(iso: string | null): string { return iso ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—"; }
