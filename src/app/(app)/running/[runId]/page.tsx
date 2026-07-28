import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import {
  calculateKilometerSplits,
  formatDistance,
  formatDuration,
  formatPace,
} from "@/features/running/metrics";
import { getRun } from "@/features/running/queries";
import { RunMapClient } from "@/features/running/run-map-client";

export const dynamic = "force-dynamic";

export default async function RunResultPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) notFound();

  const splits = calculateKilometerSplits(run.parsedRoute);
  const distance = Number(run.distance_meters);

  return (
    <Container className="py-lg tablet-narrow:py-section">
      <Link
        href="/running"
        className="inline-flex min-h-11 items-center gap-sm text-xs font-semibold text-mute transition-colors hover:text-ink"
      >
        <Icon name="arrow" className="h-4 w-4 rotate-180" />
        Kembali ke menu lari
      </Link>

      <article className="mt-md overflow-hidden rounded-sm border border-hairline-soft bg-white tablet-narrow:mt-lg">
        <header className="grid gap-xl p-xl tablet-narrow:grid-cols-[1fr_auto] tablet-narrow:items-end tablet-narrow:p-section">
          <div>
            <p className="eyebrow text-sport-lime-deep">Aktivitas selesai</p>
            <h1 className="mt-md font-display text-6xl uppercase leading-[0.88] tablet-narrow:text-8xl">
              Hasil lari
            </h1>
            <p className="mt-md text-sm text-mute">{formatDate(run.completed_at)}</p>
          </div>
          <div className="border-l-4 border-sport-lime pl-lg tablet-narrow:min-w-56 tablet-narrow:text-right">
            <p className="font-display text-7xl leading-none text-sport-black tablet-narrow:text-8xl">
              {formatDistance(distance)}
            </p>
            <p className="mt-xs text-[10px] font-bold uppercase tracking-[0.24em] text-mute">
              Kilometer
            </p>
          </div>
        </header>

        <div className="relative isolate z-0 h-[360px] border-y border-hairline-soft tablet-narrow:h-[500px] desktop-small:h-[560px]">
          <RunMapClient points={run.parsedRoute} fitRoute mode="result" />
          <div className="pointer-events-none absolute inset-x-md top-md z-[500] flex items-start justify-between gap-sm tablet-narrow:inset-x-lg tablet-narrow:top-lg">
            <span className="inline-flex items-center gap-sm rounded-full bg-white/95 px-md py-sm text-[10px] font-bold uppercase tracking-widest text-sport-black shadow-sm backdrop-blur">
              <Icon name="route" className="h-4 w-4 text-sport-lime-deep" />
              Rute GPS
            </span>
            <span className="rounded-full bg-sport-black/85 px-md py-sm text-[10px] font-bold text-white backdrop-blur">
              {run.parsedRoute.length} titik
            </span>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-px bg-hairline-soft tablet-narrow:grid-cols-3 desktop-small:grid-cols-6" aria-label="Ringkasan lari">
          <ResultStat label="Durasi aktif" value={formatDuration(run.duration_seconds)} />
          <ResultStat label="Pace rata-rata" value={formatPace(run.average_pace_seconds_per_km)} unit="/km" />
          <ResultStat label="Pace terbaik" value={formatPace(run.best_pace_seconds_per_km)} unit="/km" />
          <ResultStat label="Elevasi naik" value={Math.round(Number(run.elevation_gain_meters)).toString()} unit="m" />
          <ResultStat label="Kalori estimasi" value={String(run.calories_estimate)} unit="kkal" />
          <ResultStat label="Titik GPS" value={String(run.parsedRoute.length)} />
        </section>
      </article>

      <section className="mt-lg flex flex-col gap-md rounded-sm bg-sport-lime p-lg mobile-landscape:flex-row mobile-landscape:items-center tablet-narrow:p-xl">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sport-black text-sport-lime">
          <Icon name="check" className="h-6 w-6" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Aktivitas tersimpan</p>
          <h2 className="mt-xs text-lg font-bold">Rute dan statistik lari berhasil direkam</h2>
          <p className="mt-xs text-xs leading-relaxed text-black/60">
            Garis pada peta mengikuti setiap segmen saat GPS aktif; waktu jeda tidak menghubungkan dua lokasi secara palsu.
          </p>
        </div>
      </section>

      <div className="mt-section grid gap-lg desktop-small:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-sm bg-white p-xl">
          <div className="flex items-center justify-between gap-md">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-mute">Analisis ritme</p>
              <h2 className="mt-xs font-display text-3xl uppercase">Split per kilometer</h2>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sport-lime">
              <Icon name="activity" className="h-5 w-5" />
            </span>
          </div>

          {splits.length > 0 ? (
            <div className="mt-lg divide-y divide-hairline-soft">
              {splits.map((split) => (
                <div key={split.kilometer} className="grid grid-cols-[auto_1fr_auto] items-center gap-md py-md">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-sport-black text-xs font-bold text-sport-lime">
                    {split.kilometer}
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-soft-cloud">
                    <div
                      className="h-full rounded-full bg-sport-lime-deep"
                      style={{ width: `${Math.max(20, Math.min(100, (720 / Math.max(180, split.paceSeconds)) * 100))}%` }}
                    />
                  </div>
                  <span className="min-w-16 text-right font-display text-2xl">
                    {formatPace(split.paceSeconds)}
                    <small className="ml-xs font-sans text-[9px] text-mute">/km</small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-lg rounded-sm bg-soft-cloud p-lg">
              <p className="text-sm font-semibold">Belum mencapai satu kilometer penuh</p>
              <p className="mt-xs text-xs leading-relaxed text-mute">
                Split pertama akan tersedia setelah jarak melewati 1 km.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-sm bg-sport-black p-xl text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sport-lime">Kualitas data</p>
          <h2 className="mt-md font-display text-4xl uppercase leading-none">Rute diproses dengan aman</h2>
          <ul className="mt-lg space-y-md text-sm text-white/75">
            <li className="flex gap-sm"><Icon name="check" className="h-5 w-5 shrink-0 text-sport-lime" />Loncatan GPS berkecepatan tidak wajar sudah difilter.</li>
            <li className="flex gap-sm"><Icon name="check" className="h-5 w-5 shrink-0 text-sport-lime" />Waktu jeda tidak masuk ke durasi aktif atau pace.</li>
            <li className="flex gap-sm"><Icon name="check" className="h-5 w-5 shrink-0 text-sport-lime" />Rute hanya dapat dilihat oleh akunmu.</li>
          </ul>
          <p className="mt-xl border-t border-white/10 pt-lg text-[10px] leading-relaxed text-white/40">
            Kalori merupakan estimasi umum berbasis jarak, bukan pengukuran medis.
          </p>
        </section>
      </div>

      <div className="mt-section flex flex-col gap-sm mobile-landscape:flex-row">
        <ButtonLink href="/running"><Icon name="route" className="h-4 w-4" /> Lari lagi</ButtonLink>
        <ButtonLink href="/history" variant="secondary">Buka seluruh riwayat</ButtonLink>
      </div>
    </Container>
  );
}

function ResultStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0 bg-white p-lg">
      <p className="text-[9px] font-bold uppercase tracking-widest text-mute">{label}</p>
      <p className="mt-sm truncate font-display text-3xl leading-none">
        {value}<span className="ml-xs font-sans text-[9px] text-mute">{unit}</span>
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
