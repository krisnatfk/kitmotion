"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { finalizeRun } from "./actions";
import { formatDistance, formatDuration, formatPace } from "./metrics";
import { RunMapClient } from "./run-map-client";
import type { RunSummary } from "./types";
import { useRunTracker } from "./use-run-tracker";

export function RunTracker() {
  const router = useRouter();
  const tracker = useRunTracker();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, setPending] = useState<RunSummary | null>(null);

  const save = async (summary: RunSummary) => {
    setSaving(true);
    setSaveError(null);
    const response = await finalizeRun(summary);
    setSaving(false);
    if ("error" in response) {
      setSaveError(response.error);
      return;
    }
    setPending(null);
    router.push(`/running/${response.runId}`);
  };

  const finish = async () => {
    const summary = tracker.finish();
    if (!summary) {
      setSaveError("Belum ada titik GPS yang dapat disimpan. Tunggu sampai posisi terbaca.");
      return;
    }
    setPending(summary);
    await save(summary);
  };

  const isMoving = tracker.status === "active";
  const hasStarted = tracker.status !== "idle";

  return (
    <section className="overflow-hidden rounded-sm border border-black/[0.08] bg-white text-sport-black shadow-[0_16px_40px_rgba(17,19,16,0.06)]">
      <div className="grid desktop-small:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="relative isolate z-0 min-h-[300px] overflow-hidden tablet-narrow:min-h-[480px] desktop-small:min-h-[610px]">
          <RunMapClient points={tracker.points} follow={isMoving} />
          <div className="pointer-events-none absolute inset-x-md top-md z-[500] flex items-start justify-between gap-sm tablet-narrow:inset-x-lg tablet-narrow:top-lg">
            <span className="inline-flex items-center gap-sm rounded-full border border-black/[0.08] bg-white/95 px-md py-sm text-[10px] font-bold uppercase tracking-widest text-sport-black shadow-sm backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${isMoving ? "animate-pulse bg-[#78a600]" : "bg-sport-black/25"}`} />
              {statusLabel(tracker.status)}
            </span>
            {tracker.accuracy != null && <span className={`rounded-full px-md py-sm text-[10px] font-bold shadow-sm backdrop-blur ${tracker.accuracy <= 20 ? "bg-sport-lime text-sport-black" : "border border-black/[0.08] bg-white/95 text-sport-black"}`}>GPS ±{Math.round(tracker.accuracy)} m</span>}
          </div>
          {tracker.points.length === 0 && <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center bg-white/75 p-xl text-center backdrop-blur-[2px]"><div className="max-w-sm text-sport-black"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-black/[0.08] bg-white shadow-[0_12px_30px_rgba(17,19,16,0.08)]"><Icon name="location" className="h-7 w-7 text-[#527100]" /></span><p className="mt-lg font-display text-3xl uppercase">Rute akan muncul di sini</p><p className="mt-sm text-xs leading-relaxed text-sport-black/60">Gunakan di luar ruangan dan izinkan lokasi presisi untuk hasil terbaik.</p></div></div>}
        </div>

        <aside className="run-tracker-panel flex min-h-full flex-col border-t border-black/[0.08] bg-white p-xl desktop-small:border-l desktop-small:border-t-0 desktop-small:p-section">
          <div className="hidden desktop-small:block">
            <p className="eyebrow text-[#527100]">KITRUN GPS</p>
            <h2 className="mt-md font-display text-4xl uppercase leading-none">Lari bebas</h2>
            <p className="mt-sm text-xs leading-relaxed text-sport-black/55">Jarak dan pace dihitung dari titik GPS yang sudah difilter dari noise dan loncatan lokasi.</p>
          </div>

          <div className="order-2 mt-lg grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-hairline bg-hairline-soft desktop-small:order-none desktop-small:mt-xl" aria-label="Statistik aktivitas saat ini">
            <RunStat label="Jarak" value={formatDistance(tracker.distanceMeters)} unit="km" />
            <RunStat label="Durasi aktif" value={formatDuration(tracker.elapsedSeconds)} />
            <RunStat label="Pace rata-rata" value={formatPace(tracker.averagePace)} unit="/km" />
            <RunStat label="Pace saat ini" value={formatPace(tracker.currentPace)} unit="/km" />
          </div>

          {(tracker.error || saveError) && <div className="order-3 mt-lg rounded-sm border border-[#d7553c]/25 bg-[#fff0ec] p-md desktop-small:order-none" role="alert"><p className="text-xs font-semibold text-[#9a321e]">{saveError ?? tracker.error}</p></div>}

          <div className="order-1 desktop-small:order-none desktop-small:mt-auto desktop-small:pt-xl">
            {!hasStarted ? <Button onClick={tracker.start} className="w-full bg-sport-lime text-sport-black hover:bg-sport-black hover:text-white"><Icon name="play" className="h-5 w-5" /> Mulai lari</Button> : tracker.status === "locating" ? <Button disabled className="w-full bg-sport-lime text-sport-black"><span className="h-4 w-4 animate-spin rounded-full border-2 border-sport-black/25 border-t-sport-black" /> Mencari GPS…</Button> : tracker.status === "finished" ? <div className="space-y-sm"><Button onClick={() => pending && save(pending)} disabled={!pending || saving} className="w-full bg-sport-lime text-sport-black hover:bg-sport-black hover:text-white">{saving ? "Menyimpan…" : "Coba simpan lagi"}</Button><Button onClick={tracker.reset} variant="ghost" className="w-full text-sport-black/60 hover:bg-black/[0.05] hover:text-sport-black">Batalkan aktivitas</Button></div> : <div className="grid grid-cols-[1fr_auto] gap-sm"><Button onClick={isMoving ? tracker.pause : tracker.resume} variant="secondary" className="border border-black/[0.08] bg-[#f5f7f2] text-sport-black hover:bg-sport-lime"><Icon name={isMoving ? "pause" : "play"} className="h-5 w-5" />{isMoving ? "Jeda" : "Lanjut"}</Button><Button onClick={finish} disabled={saving || tracker.points.length === 0} className="min-w-14 bg-[#ff7657] px-lg text-sport-black hover:bg-sport-black hover:text-white" aria-label="Selesaikan dan simpan aktivitas"><Icon name="stop" className="h-5 w-5" /></Button></div>}
            <p className="mt-md text-center text-[10px] leading-relaxed text-sport-black/40">Lokasi hanya disimpan saat tracker aktif. Menjeda aktivitas menghentikan pemantauan GPS.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function RunStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return <div className="min-w-0 bg-white p-lg"><p className="text-[9px] font-bold uppercase tracking-widest text-mute">{label}</p><p className="mt-sm truncate font-display text-3xl leading-none text-sport-black">{value}<span className="ml-xs font-sans text-[9px] text-mute">{unit}</span></p></div>;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = { idle: "Siap", locating: "Mencari GPS", active: "Merekam", paused: "Dijeda", finished: "Selesai" };
  return labels[status] ?? status;
}
