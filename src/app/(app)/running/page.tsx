import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { formatDistance, formatDuration, formatPace } from "@/features/running/metrics";
import { listRuns } from "@/features/running/queries";
import { RunTracker } from "@/features/running/run-tracker";

export const dynamic = "force-dynamic";

export default async function RunningPage() {
  const runs = await listRuns(12);
  const totalDistance = runs.reduce((sum, run) => sum + Number(run.distance_meters), 0);
  const totalSeconds = runs.reduce((sum, run) => sum + run.duration_seconds, 0);

  return <Container className="py-xl tablet-narrow:py-section">
    <header className="flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
      <div><p className="eyebrow text-mute">Outdoor activity</p><h1 className="mt-md font-display text-6xl uppercase leading-none tablet-narrow:text-8xl">Lari & rekam rute</h1><p className="mt-md max-w-2xl text-sm leading-relaxed text-mute">Pantau jarak, pace, durasi, dan rute secara langsung dengan GPS perangkatmu.</p></div>
      <div className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline-soft tablet-narrow:w-auto" aria-label="Ringkasan seluruh aktivitas lari"><SummaryStat label="Total jarak" value={formatDistance(totalDistance)} unit="km" /><SummaryStat label="Waktu lari" value={formatDuration(totalSeconds)} /></div>
    </header>

    <div className="mt-xl"><RunTracker /></div>

    <section className="mt-section">
      <div className="flex items-end justify-between gap-md"><div><p className="text-[10px] font-bold uppercase tracking-widest text-mute">Aktivitas tersimpan</p><h2 className="mt-xs font-display text-4xl uppercase">Lari terbaru</h2></div><span className="chip">{runs.length} aktivitas</span></div>
      {runs.length > 0 ? <div className="mt-lg grid gap-md tablet-narrow:grid-cols-2 desktop-small:grid-cols-3">{runs.map((run) => <Link key={run.id} href={`/running/${run.id}`} className="group rounded-sm bg-white p-lg transition-transform hover:-translate-y-1"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-full bg-sport-lime"><Icon name="route" className="h-5 w-5" /></span><Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div><p className="mt-lg text-[10px] font-bold uppercase tracking-widest text-mute">{formatRunDate(run.completed_at)}</p><p className="mt-xs font-display text-4xl">{formatDistance(Number(run.distance_meters))}<span className="ml-xs font-sans text-xs text-mute">km</span></p><div className="mt-md grid grid-cols-2 gap-sm border-t border-hairline-soft pt-md"><MiniStat label="Durasi" value={formatDuration(run.duration_seconds)} /><MiniStat label="Pace" value={`${formatPace(run.average_pace_seconds_per_km)} /km`} /></div></Link>)}</div> : <div className="mt-lg rounded-sm border border-dashed border-hairline bg-white p-section text-center"><Icon name="route" className="mx-auto h-8 w-8 text-mute" /><h3 className="mt-md font-semibold">Belum ada aktivitas lari</h3><p className="mt-xs text-sm text-mute">Aktivitas pertamamu akan muncul setelah rute selesai disimpan.</p></div>}
    </section>
  </Container>;
}

function SummaryStat({ label, value, unit }: { label: string; value: string; unit?: string }) { return <div className="min-w-0 bg-white p-lg text-sport-black tablet-narrow:min-w-36"><p className="text-[9px] font-bold uppercase tracking-widest text-mute">{label}</p><p className="mt-sm truncate font-display text-3xl leading-none">{value}<span className="ml-xs font-sans text-[9px] text-mute">{unit}</span></p></div>; }
function MiniStat({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] uppercase tracking-widest text-mute">{label}</p><p className="mt-xs text-xs font-semibold">{value}</p></div>; }
function formatRunDate(iso: string): string { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); }
