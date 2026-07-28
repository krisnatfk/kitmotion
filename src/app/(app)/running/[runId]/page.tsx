import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { calculateKilometerSplits, formatDistance, formatDuration, formatPace } from "@/features/running/metrics";
import { getRun } from "@/features/running/queries";
import { RunMapClient } from "@/features/running/run-map-client";

export const dynamic = "force-dynamic";

export default async function RunResultPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) notFound();
  const splits = calculateKilometerSplits(run.parsedRoute);
  const distance = Number(run.distance_meters);

  return <Container className="py-xl tablet-narrow:py-section">
    <Link href="/running" className="inline-flex items-center gap-sm text-xs text-mute hover:text-ink"><Icon name="arrow" className="h-4 w-4 rotate-180" /> Kembali ke menu lari</Link>

    <section className="mt-lg overflow-hidden rounded-sm bg-sport-black text-white">
      <div className="grid desktop-small:grid-cols-[0.72fr_1.28fr]">
        <div className="flex flex-col justify-between p-xl tablet-narrow:p-section">
          <div><p className="eyebrow text-sport-lime">Aktivitas selesai</p><h1 className="mt-lg font-display text-6xl uppercase leading-[0.86] tablet-narrow:text-8xl">Hasil lari</h1><p className="mt-md text-sm text-white/50">{formatDate(run.completed_at)}</p></div>
          <div className="mt-section"><p className="font-display text-8xl leading-none text-sport-lime tablet-narrow:text-9xl">{formatDistance(distance)}</p><p className="mt-sm text-xs font-bold uppercase tracking-[0.2em] text-white/45">Kilometer</p></div>
        </div>
        <div className="relative min-h-[380px] border-t border-white/10 tablet-narrow:min-h-[520px] desktop-small:border-l desktop-small:border-t-0"><RunMapClient points={run.parsedRoute} fitRoute /></div>
      </div>
    </section>

    <section className="mt-lg grid grid-cols-2 gap-sm tablet-narrow:grid-cols-3 desktop-small:grid-cols-6">
      <ResultStat label="Durasi aktif" value={formatDuration(run.duration_seconds)} />
      <ResultStat label="Pace rata-rata" value={formatPace(run.average_pace_seconds_per_km)} unit="/km" />
      <ResultStat label="Pace terbaik" value={formatPace(run.best_pace_seconds_per_km)} unit="/km" />
      <ResultStat label="Elevasi naik" value={Math.round(Number(run.elevation_gain_meters)).toString()} unit="m" />
      <ResultStat label="Kalori estimasi" value={String(run.calories_estimate)} unit="kkal" />
      <ResultStat label="Titik GPS" value={String(run.parsedRoute.length)} />
    </section>

    <div className="mt-section grid gap-lg desktop-small:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-sm bg-white p-xl">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-mute">Analisis ritme</p><h2 className="mt-xs font-display text-3xl uppercase">Split per kilometer</h2></div><span className="grid h-11 w-11 place-items-center rounded-full bg-sport-lime"><Icon name="activity" className="h-5 w-5" /></span></div>
        {splits.length > 0 ? <div className="mt-lg divide-y divide-hairline-soft">{splits.map((split) => <div key={split.kilometer} className="grid grid-cols-[auto_1fr_auto] items-center gap-md py-md"><span className="grid h-9 w-9 place-items-center rounded-full bg-sport-black text-xs font-bold text-sport-lime">{split.kilometer}</span><div className="h-2 overflow-hidden rounded-full bg-soft-cloud"><div className="h-full rounded-full bg-sport-lime-deep" style={{ width: `${Math.max(20, Math.min(100, 720 / Math.max(180, split.paceSeconds) * 100))}%` }} /></div><span className="min-w-16 text-right font-display text-2xl">{formatPace(split.paceSeconds)}<small className="ml-xs font-sans text-[9px] text-mute">/km</small></span></div>)}</div> : <div className="mt-lg rounded-sm bg-soft-cloud p-lg"><p className="text-sm font-semibold">Belum mencapai satu kilometer penuh</p><p className="mt-xs text-xs leading-relaxed text-mute">Split pertama akan tersedia setelah jarak melewati 1 km.</p></div>}
      </section>

      <section className="rounded-sm bg-sport-lime p-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Ringkasan aktivitas</p>
        <h2 className="mt-md font-display text-4xl uppercase leading-none">Rute tersimpan dengan aman</h2>
        <ul className="mt-lg space-y-md text-sm"><li className="flex gap-sm"><Icon name="check" className="h-5 w-5 shrink-0" />Loncatan GPS berkecepatan tidak wajar sudah difilter.</li><li className="flex gap-sm"><Icon name="check" className="h-5 w-5 shrink-0" />Waktu jeda tidak masuk ke durasi aktif atau pace.</li><li className="flex gap-sm"><Icon name="check" className="h-5 w-5 shrink-0" />Rute hanya dapat dilihat oleh akunmu.</li></ul>
        <p className="mt-xl border-t border-black/15 pt-lg text-[10px] leading-relaxed text-black/55">Kalori merupakan estimasi umum berbasis jarak, bukan pengukuran medis.</p>
      </section>
    </div>

    <div className="mt-section flex flex-col gap-sm mobile-landscape:flex-row"><ButtonLink href="/running"><Icon name="route" className="h-4 w-4" /> Lari lagi</ButtonLink><ButtonLink href="/history" variant="secondary">Buka seluruh riwayat</ButtonLink></div>
  </Container>;
}

function ResultStat({ label, value, unit }: { label: string; value: string; unit?: string }) { return <div className="rounded-sm bg-white p-lg"><p className="text-[9px] font-bold uppercase tracking-widest text-mute">{label}</p><p className="mt-sm font-display text-3xl leading-none">{value}<span className="ml-xs font-sans text-[9px] text-mute">{unit}</span></p></div>; }
function formatDate(iso: string): string { return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); }
