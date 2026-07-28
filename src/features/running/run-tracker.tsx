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
    <section className="overflow-hidden rounded-sm bg-sport-black text-white">
      <div className="grid desktop-small:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="relative min-h-[300px] overflow-hidden tablet-narrow:min-h-[480px] desktop-small:min-h-[610px]">
          <RunMapClient points={tracker.points} follow={isMoving} />
          <div className="pointer-events-none absolute inset-x-md top-md z-[500] flex items-start justify-between gap-sm tablet-narrow:inset-x-lg tablet-narrow:top-lg">
            <span className="inline-flex items-center gap-sm rounded-full bg-sport-black/85 px-md py-sm text-[10px] font-bold uppercase tracking-widest backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${isMoving ? "animate-pulse bg-sport-lime" : "bg-white/35"}`} />
              {statusLabel(tracker.status)}
            </span>
            {tracker.accuracy != null && <span className={`rounded-full px-md py-sm text-[10px] font-bold backdrop-blur ${tracker.accuracy <= 20 ? "bg-sport-lime text-sport-black" : "bg-sport-black/85 text-white"}`}>GPS ±{Math.round(tracker.accuracy)} m</span>}
          </div>
          {tracker.points.length === 0 && <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center bg-gradient-to-b from-sport-black/20 to-sport-black/70 p-xl text-center"><div className="max-w-sm"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-sport-black/80"><Icon name="location" className="h-7 w-7 text-sport-lime" /></span><p className="mt-lg font-display text-3xl uppercase">Rute akan muncul di sini</p><p className="mt-sm text-xs leading-relaxed text-white/60">Gunakan di luar ruangan dan izinkan lokasi presisi untuk hasil terbaik.</p></div></div>}
        </div>

        <aside className="flex min-h-full flex-col border-t border-white/10 p-xl desktop-small:border-l desktop-small:border-t-0 desktop-small:p-section">
          <div className="hidden desktop-small:block">
            <p className="eyebrow text-sport-lime">KITRUN GPS</p>
            <h2 className="mt-md font-display text-4xl uppercase leading-none">Lari bebas</h2>
            <p className="mt-sm text-xs leading-relaxed text-white/50">Jarak dan pace dihitung dari titik GPS yang sudah difilter dari noise dan loncatan lokasi.</p>
          </div>

          <div className="order-2 mt-lg grid grid-cols-2 gap-sm desktop-small:order-none desktop-small:mt-xl">
            <RunStat label="Jarak" value={formatDistance(tracker.distanceMeters)} unit="km" featured />
            <RunStat label="Durasi aktif" value={formatDuration(tracker.elapsedSeconds)} />
            <RunStat label="Pace rata-rata" value={formatPace(tracker.averagePace)} unit="/km" />
            <RunStat label="Pace saat ini" value={formatPace(tracker.currentPace)} unit="/km" />
          </div>

          {(tracker.error || saveError) && <div className="order-3 mt-lg rounded-sm border border-[#ff7657]/40 bg-[#ff7657]/10 p-md desktop-small:order-none" role="alert"><p className="text-xs font-semibold text-[#ffad98]">{saveError ?? tracker.error}</p></div>}

          <div className="order-1 desktop-small:order-none desktop-small:mt-auto desktop-small:pt-xl">
            {!hasStarted ? <Button onClick={tracker.start} className="w-full bg-sport-lime text-sport-black hover:bg-white"><Icon name="play" className="h-5 w-5" /> Mulai lari</Button> : tracker.status === "locating" ? <Button disabled className="w-full bg-sport-lime text-sport-black"><span className="h-4 w-4 animate-spin rounded-full border-2 border-sport-black/25 border-t-sport-black" /> Mencari GPS…</Button> : tracker.status === "finished" ? <div className="space-y-sm"><Button onClick={() => pending && save(pending)} disabled={!pending || saving} className="w-full bg-sport-lime text-sport-black hover:bg-white">{saving ? "Menyimpan…" : "Coba simpan lagi"}</Button><Button onClick={tracker.reset} variant="ghost" className="w-full text-white/65 hover:bg-white/10">Batalkan aktivitas</Button></div> : <div className="grid grid-cols-[1fr_auto] gap-sm"><Button onClick={isMoving ? tracker.pause : tracker.resume} variant="secondary" className="bg-white text-sport-black hover:bg-sport-lime"><Icon name={isMoving ? "pause" : "play"} className="h-5 w-5" />{isMoving ? "Jeda" : "Lanjut"}</Button><Button onClick={finish} disabled={saving || tracker.points.length === 0} className="min-w-14 bg-[#ff7657] px-lg text-sport-black hover:bg-white" aria-label="Selesaikan dan simpan aktivitas"><Icon name="stop" className="h-5 w-5" /></Button></div>}
            <p className="mt-md text-center text-[10px] leading-relaxed text-white/35">Lokasi hanya disimpan saat tracker aktif. Menjeda aktivitas menghentikan pemantauan GPS.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function RunStat({ label, value, unit, featured = false }: { label: string; value: string; unit?: string; featured?: boolean }) {
  return <div className={`rounded-sm border p-md ${featured ? "border-sport-lime/35 bg-sport-lime/10" : "border-white/10 bg-white/[0.04]"}`}><p className="text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</p><p className={`mt-sm font-display leading-none ${featured ? "text-4xl text-sport-lime" : "text-3xl"}`}>{value}<span className="ml-xs font-sans text-[10px] font-semibold text-white/40">{unit}</span></p></div>;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = { idle: "Siap", locating: "Mencari GPS", active: "Merekam", paused: "Dijeda", finished: "Selesai" };
  return labels[status] ?? status;
}
