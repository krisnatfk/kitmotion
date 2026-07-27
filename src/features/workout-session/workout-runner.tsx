"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { PoseOverlay, checkReadiness, getPoseLandmarker, releasePoseLandmarker, useCamera, usePoseDetection } from "@/features/pose";
import type { ExerciseConfig, NormalizedLandmark, PoseFrame } from "@/features/exercise-engine/core/types";
import { useWorkoutSession } from "./use-workout-session";
import { finalizeSession, type FinalizeResult } from "./actions";

type WorkoutRunnerProps = {
  exerciseSlug: string;
  exerciseName: string;
  cameraPosition: string;
  engineKey: string;
  config: ExerciseConfig;
  scoringVersion: string;
  targetReps: number | null;
  targetSeconds: number | null;
};

export function WorkoutRunner({ exerciseSlug, exerciseName, cameraPosition, engineKey, config, scoringVersion, targetReps, targetSeconds }: WorkoutRunnerProps) {
  const router = useRouter();
  const camera = useCamera();
  const [landmarker, setLandmarker] = useState<unknown>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [readiness, setReadiness] = useState({ status: "no-body", message: "Aktifkan kamera untuk memulai." });
  const [finalizing, setFinalizing] = useState(false);
  const [result, setResult] = useState<FinalizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestReady = useRef(false);

  const session = useWorkoutSession({ engineKey, config, exerciseSlug, targetReps, targetSeconds });

  const handleFrame = useCallback((frame: PoseFrame) => {
    const nextReadiness = checkReadiness(frame.landmarks);
    setReadiness({ status: nextReadiness.status, message: nextReadiness.message });
    latestReady.current = nextReadiness.status === "ready";
    setLandmarks(frame.landmarks.length > 0 ? frame.landmarks : null);
    if (session.live.status === "active") session.processFrame(frame);
  }, [session]);

  usePoseDetection({ video: camera.videoRef.current, landmarker: landmarker as never, active: camera.status === "ready", onFrame: handleFrame });

  const enableCamera = useCallback(async () => {
    setError(null);
    setLoadingModel(true);
    camera.start();
    try {
      setLandmarker(await getPoseLandmarker());
    } catch {
      setError("Gagal memuat model pose. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setLoadingModel(false);
    }
  }, [camera]);

  const startSession = useCallback(async () => {
    setError(null);
    await session.start();
  }, [session]);

  const finishSession = useCallback(async () => {
    if (finalizing) return;
    setFinalizing(true);
    setError(null);
    try {
      const payload = await session.finish();
      if (!payload) {
        setError("Tidak ada data sesi untuk disimpan.");
        return;
      }
      const response = await finalizeSession(payload);
      if ("error" in response) setError(response.error);
      else setResult(response);
    } catch {
      setError("Gagal menyimpan sesi. Coba lagi.");
    } finally {
      setFinalizing(false);
    }
  }, [finalizing, session]);

  useEffect(() => () => releasePoseLandmarker(), []);

  if (result) {
    return <Container className="py-section">
      <section className="rounded-sm bg-sport-black p-xl text-white tablet-narrow:p-section">
        <p className="eyebrow text-sport-lime">Sesi selesai</p>
        <div className="mt-xl flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
          <div><h1 className="font-display text-8xl leading-none text-sport-lime tablet-narrow:text-9xl">{result.finalScore}</h1><p className="mt-sm text-white/60">Skor akhir · {exerciseName}</p></div>
          <div className="rounded-sm border border-white/10 bg-white/[0.04] px-xl py-lg"><p className="text-xs uppercase tracking-widest text-white/45">Grade</p><p className="mt-xs font-display text-5xl">{result.grade}</p></div>
        </div>
      </section>
      <div className="mt-lg grid grid-cols-2 gap-sm tablet-narrow:grid-cols-4"><ResultStat label="XP didapat" value={`+${result.xpAwarded}`} /><ResultStat label="Level" value={String(result.newLevel || "—")} /><ResultStat label="Repetisi valid" value={String(session.live.validReps)} /><ResultStat label="Total repetisi" value={String(session.live.repCount)} /></div>
      {result.newBadges.length > 0 && <ResultList title="Badge baru" items={result.newBadges.map((badge) => ({ key: badge.code, label: `🏅 ${badge.name}` }))} />}
      {result.challengesCompleted.length > 0 && <ResultList title="Challenge selesai" items={result.challengesCompleted.map((challenge) => ({ key: challenge.code, label: `🎯 ${challenge.title}` }))} />}
      <div className="mt-section flex flex-wrap gap-md"><Button onClick={() => router.push("/history")}>Lihat riwayat</Button><Button variant="secondary" onClick={() => router.push("/exercises")}>Latihan lain</Button></div>
    </Container>;
  }

  const phase = session.live.status;
  const phaseLabel: Record<string, string> = { idle: "Persiapan", active: "Sedang latihan", finished: "Selesai" };
  const canStart = camera.status === "ready" && !!landmarker && readiness.status === "ready";

  return <Container className="py-xl tablet-narrow:py-section">
    <header className="flex items-center justify-between gap-lg"><div><Link href={`/exercises/${exerciseSlug}`} className="inline-flex items-center gap-xs text-xs text-mute hover:text-ink"><Icon name="arrow" className="h-3.5 w-3.5 rotate-180" /> Kembali ke panduan</Link><h1 className="mt-sm font-display text-4xl uppercase tablet-narrow:text-5xl">{exerciseName}</h1></div><span className="chip"><span className={`h-2 w-2 rounded-full ${phase === "active" ? "animate-pulse bg-sport-lime-deep" : "bg-stone"}`} />{phaseLabel[phase] ?? phase}</span></header>
    <div className="mt-xl grid gap-lg desktop-small:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-sport-black tablet-narrow:aspect-video">
          <video ref={camera.videoRef} playsInline muted className="h-full w-full object-cover [transform:scaleX(-1)]" />
          <PoseOverlay landmarks={landmarks} />
          <div className="pointer-events-none absolute left-md top-md rounded-full bg-black/65 px-md py-sm text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur"><span className="mr-sm inline-block h-2 w-2 rounded-full bg-sport-lime" />Live pose</div>
          {camera.status !== "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-sport-black/90 p-xl text-center text-white"><span className="grid h-16 w-16 place-items-center rounded-full bg-white/10"><Icon name="camera" className="h-7 w-7 text-sport-lime" /></span><h2 className="mt-lg font-display text-3xl uppercase">Kamera belum aktif</h2><p className="mt-sm max-w-md text-sm leading-relaxed text-white/55">Kamera diperlukan untuk membaca gerakan. Video diproses langsung di perangkat dan tidak pernah disimpan.</p><Button onClick={enableCamera} disabled={loadingModel} className="mt-lg bg-sport-lime text-sport-black hover:bg-white">{loadingModel ? "Memuat model…" : "Aktifkan kamera"}</Button>{camera.status === "denied" && <p className="mt-md text-caption-sm text-sale">{camera.error}</p>}</div>}
        </div>
        <p className="mt-md flex items-start gap-sm text-xs leading-relaxed text-mute"><Icon name="camera" className="mt-0.5 h-4 w-4 shrink-0" />{cameraPosition}</p>
      </div>
      <aside className="h-fit rounded-sm bg-sport-black p-xl text-white desktop-small:sticky desktop-small:top-28">
        {phase !== "active" ? <>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Status kesiapan</p>
          <div className="mt-lg flex items-start gap-md"><span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${readiness.status === "ready" ? "bg-sport-lime" : "bg-white/25"}`} /><p className="text-sm leading-relaxed text-white/70" role="status" aria-live="polite">{readiness.message}</p></div>
          <div className="mt-xl space-y-md border-y border-white/10 py-lg">{["Seluruh tubuh terlihat", "Area latihan aman", "Pencahayaan cukup"].map((item) => <p key={item} className="flex items-center gap-sm text-xs text-white/50"><Icon name="check" className="h-4 w-4 text-sport-lime" />{item}</p>)}</div>
          <Button onClick={startSession} disabled={!canStart} className="mt-xl w-full bg-sport-lime text-sport-black hover:bg-white"><Icon name="play" className="h-5 w-5" /> Mulai sesi</Button>
        </> : <>
          <p className="eyebrow text-sport-lime">Sesi berlangsung</p>
          <div className="mt-lg"><LiveHud repCount={session.live.repCount} validReps={session.live.validReps} elapsedMs={session.live.elapsedMs} trackingValid={session.live.trackingValid} feedback={session.live.feedback} liveMetric={session.live.liveMetric} targetReps={targetReps} /></div>
          <Button onClick={finishSession} disabled={finalizing} className="mt-xl w-full bg-sport-lime text-sport-black hover:bg-white">{finalizing ? "Menyimpan…" : "Selesaikan sesi"}</Button>
        </>}
        {error && <p className="mt-lg rounded-sm bg-danger/15 p-md text-xs text-[#ff9c9c]" role="alert">{error}</p>}
        <p className="mt-lg border-t border-white/10 pt-lg text-[9px] uppercase tracking-wider text-white/25">Engine {engineKey} · scoring {scoringVersion}</p>
      </aside>
    </div>
  </Container>;
}

function LiveHud(props: { repCount: number; validReps: number; elapsedMs: number; trackingValid: boolean; feedback: { code: string; severity: string; message: string }[]; liveMetric?: { label: string; value: number }; targetReps: number | null }) {
  const seconds = Math.floor(props.elapsedMs / 1000);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return <div className="space-y-md"><div className="grid grid-cols-3 gap-sm"><DarkStat label="Valid" value={String(props.validReps)} /><DarkStat label="Total" value={String(props.repCount)} /><DarkStat label="Waktu" value={time} /></div>{props.targetReps && <div><div className="mt-lg flex justify-between text-xs text-white/50"><span>Target</span><span>{props.validReps}/{props.targetReps}</span></div><div className="mt-sm h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sport-lime" style={{ width: `${Math.min(100, (props.validReps / props.targetReps) * 100)}%` }} /></div></div>}{!props.trackingValid && <p className="rounded-sm bg-danger/15 p-sm text-xs text-[#ff9c9c]" role="status">Pelacakan tubuh hilang — skor dijeda sementara.</p>}{props.liveMetric && <p className="text-xs text-white/50">{props.liveMetric.label}: {Math.round(props.liveMetric.value)}°</p>}{props.feedback.length > 0 && <ul className="space-y-xs" aria-live="polite">{props.feedback.slice(0, 3).map((item) => <li key={item.code} className={item.severity === "warning" || item.severity === "critical" ? "text-xs text-[#ffc6a5]" : "text-xs text-sport-lime"}>{item.message}</li>)}</ul>}</div>;
}

function DarkStat({ label, value }: { label: string; value: string }) { return <div className="rounded-sm border border-white/10 bg-white/[0.04] p-md"><p className="text-[9px] uppercase tracking-wider text-white/40">{label}</p><p className="mt-xs font-display text-2xl">{value}</p></div>; }
function ResultStat({ label, value }: { label: string; value: string }) { return <div className="rounded-sm bg-white p-lg"><p className="text-xs text-mute">{label}</p><p className="mt-xs font-display text-3xl">{value}</p></div>; }
function ResultList({ title, items }: { title: string; items: { key: string; label: string }[] }) { return <section className="mt-section"><h2 className="font-display text-3xl uppercase">{title}</h2><ul className="mt-md grid gap-sm tablet-narrow:grid-cols-2">{items.map((item) => <li key={item.key} className="rounded-sm bg-white p-lg text-sm">{item.label}</li>)}</ul></section>; }
