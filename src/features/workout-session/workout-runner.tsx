"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import {
  PoseOverlay,
  checkReadiness,
  getPoseLandmarker,
  releasePoseLandmarker,
  useCamera,
  useDeviceOrientation,
  usePoseDetection,
  type CameraFacingMode,
} from "@/features/pose";
import type { ExerciseConfig, NormalizedLandmark, PoseFrame } from "@/features/exercise-engine/core/types";
import { useWorkoutSession } from "./use-workout-session";
import { finalizeSession, type FinalizeResult } from "./actions";
import type { FinalizeSessionInput } from "./schema";
import { SessionCoachPanel } from "@/features/ai-coach/components";

type WorkoutRunnerProps = {
  exerciseSlug: string;
  exerciseName: string;
  cameraPosition: string;
  engineKey: string;
  config: ExerciseConfig;
  scoringVersion: string;
  targetReps: number | null;
  targetSeconds: number | null;
  milestoneLevel: number | null;
};

type StartCountdown = {
  mode: "auto" | "timer";
  seconds: number;
};

const AUTO_READY_HOLD_MS = 1_500;
const AUTO_TRACKING_GRACE_MS = 800;
const MANUAL_TIMER_SECONDS = 10;

export function WorkoutRunner({ exerciseSlug, exerciseName, cameraPosition, engineKey, config, scoringVersion, targetReps, targetSeconds, milestoneLevel }: WorkoutRunnerProps) {
  const router = useRouter();
  const camera = useCamera();
  const orientation = useDeviceOrientation();
  const [landmarker, setLandmarker] = useState<unknown>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [readiness, setReadiness] = useState({ status: "no-body", message: "Aktifkan kamera untuk memulai." });
  const [finalizing, setFinalizing] = useState(false);
  const [result, setResult] = useState<FinalizeResult | null>(null);
  const [pendingPayload, setPendingPayload] = useState<FinalizeSessionInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startCountdown, setStartCountdown] = useState<StartCountdown | null>(null);
  const finalizingRef = useRef(false);
  const latestReady = useRef(false);
  const startSessionRef = useRef<() => Promise<void>>(async () => {});
  const previousOrientationRef = useRef(orientation);

  const session = useWorkoutSession({ engineKey, config, exerciseSlug, targetReps, targetSeconds, milestoneLevel });

  const handleFrame = useCallback((frame: PoseFrame) => {
    const nextReadiness = checkReadiness(frame.landmarks, exerciseSlug, frame.worldLandmarks);
    setReadiness({ status: nextReadiness.status, message: nextReadiness.message });
    latestReady.current = nextReadiness.status === "ready";
    setLandmarks(frame.landmarks.length > 0 ? frame.landmarks : null);
    if (session.live.status === "active") session.processFrame(frame);
  }, [exerciseSlug, session]);

  usePoseDetection({ video: camera.videoRef.current, landmarker: landmarker as never, active: camera.status === "ready", onFrame: handleFrame });

  const enableCamera = useCallback(async () => {
    setError(null);
    setLoadingModel(true);
    try {
      const [model, cameraStarted] = await Promise.all([
        getPoseLandmarker(),
        camera.start(),
      ]);
      setLandmarker(model);
      if (!cameraStarted) latestReady.current = false;
    } catch {
      setError("Gagal memuat model pose. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setLoadingModel(false);
    }
  }, [camera]);

  const selectCamera = useCallback(async (mode: CameraFacingMode) => {
    if (session.live.status !== "idle" || camera.status === "requesting") return;
    cancelStartCue();
    setStartCountdown(null);
    latestReady.current = false;
    setLandmarks(null);
    setReadiness({
      status: "no-body",
      message: "Kamera berubah. Ambil kembali posisi awal latihan.",
    });
    setError(null);
    await camera.selectFacingMode(mode);
  }, [camera, session.live.status]);

  const startSession = useCallback(async () => {
    setError(null);
    setPendingPayload(null);
    setResult(null);
    setStartCountdown(null);
    announceStartCue("Mulai");
    await session.start();
  }, [session]);

  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);

  const phase = session.live.status;
  const startAvailable = camera.status === "ready" && !!landmarker && phase === "idle";

  useEffect(() => {
    if (previousOrientationRef.current === orientation) return;
    previousOrientationRef.current = orientation;
    if (phase !== "idle") return;
    cancelStartCue();
    setStartCountdown(null);
    latestReady.current = false;
    setLandmarks(null);
    setReadiness({
      status: "no-body",
      message: "Orientasi berubah. Tahan posisi sampai tubuh terbaca kembali.",
    });
  }, [orientation, phase]);

  // Start hands-free only after the ready pose remains stable.
  useEffect(() => {
    if (!startAvailable || readiness.status !== "ready" || startCountdown) return;

    const timer = window.setTimeout(() => {
      setStartCountdown({ mode: "auto", seconds: 3 });
    }, AUTO_READY_HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [readiness.status, startAvailable, startCountdown]);

  // Ignore a brief detection flicker, but cancel auto-start on sustained loss.
  useEffect(() => {
    if (startCountdown?.mode !== "auto" || readiness.status === "ready") return;

    const timer = window.setTimeout(() => {
      setStartCountdown(null);
      cancelStartCue();
    }, AUTO_TRACKING_GRACE_MS);

    return () => window.clearTimeout(timer);
  }, [readiness.status, startCountdown?.mode]);

  useEffect(() => {
    if (!startCountdown || startCountdown.seconds <= 0 || phase !== "idle") return;

    if (startCountdown.seconds <= 3) {
      announceStartCue(indonesianCountdown(startCountdown.seconds));
    }

    const timer = window.setTimeout(() => {
      setStartCountdown((current) =>
        current ? { ...current, seconds: Math.max(0, current.seconds - 1) } : null,
      );
    }, 1_000);

    return () => window.clearTimeout(timer);
  }, [phase, startCountdown]);

  // When the ten-second fallback ends, wait for a stable pose instead of
  // recording a session with incomplete tracking.
  useEffect(() => {
    if (
      startCountdown?.seconds !== 0 ||
      phase !== "idle" ||
      readiness.status !== "ready"
    ) {
      return;
    }

    const delay = startCountdown.mode === "timer" ? AUTO_READY_HOLD_MS : 0;
    const timer = window.setTimeout(() => {
      if (latestReady.current) void startSessionRef.current();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [phase, readiness.status, startCountdown]);

  const startDelayedSession = useCallback(() => {
    setError(null);
    announceStartCue("Timer sepuluh detik dimulai");
    setStartCountdown({ mode: "timer", seconds: MANUAL_TIMER_SECONDS });
  }, []);

  const cancelCountdown = useCallback(() => {
    setStartCountdown(null);
    cancelStartCue();
  }, []);

  const finishSession = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setFinalizing(true);
    setError(null);
    try {
      const payload = pendingPayload ?? await session.finish();
      if (!payload) {
        setError("Tidak ada data sesi untuk disimpan.");
        return;
      }
      if (!pendingPayload) {
        setPendingPayload(payload);
        camera.stop();
      }
      const response = await finalizeSession(payload);
      if ("error" in response) setError(response.error);
      else {
        setPendingPayload(null);
        setResult(response);
      }
    } catch {
      setError("Gagal menyimpan sesi. Coba lagi.");
    } finally {
      finalizingRef.current = false;
      setFinalizing(false);
    }
  }, [camera, pendingPayload, session]);

  useEffect(
    () => () => {
      cancelStartCue();
      releasePoseLandmarker();
    },
    [],
  );

  if (result) {
    return <Container className="py-section">
      <section className="rounded-sm bg-sport-black p-xl text-white tablet-narrow:p-section">
        <p className="eyebrow text-sport-lime">{milestoneLevel ? `Challenge level ${milestoneLevel}` : "Sesi selesai"}</p>
        <div className="mt-xl flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
          <div><h1 className="font-display text-8xl leading-none text-sport-lime tablet-narrow:text-9xl">{result.finalScore}</h1><p className="mt-sm text-white/60">Skor akhir · {exerciseName}</p></div>
          <div className="rounded-sm border border-white/10 bg-white/[0.04] px-xl py-lg"><p className="text-xs uppercase tracking-widest text-white/45">Grade</p><p className="mt-xs font-display text-5xl">{result.grade}</p></div>
        </div>
      </section>
      <div className="mt-lg grid grid-cols-2 gap-sm tablet-narrow:grid-cols-4"><ResultStat label="XP didapat" value={`+${result.xpAwarded}`} /><ResultStat label="Level" value={String(result.newLevel || "—")} /><ResultStat label="Repetisi valid" value={String(session.live.validReps)} /><ResultStat label="Total repetisi" value={String(session.live.repCount)} /></div>
      {result.newBadges.length > 0 && <ResultList title="Badge baru" items={result.newBadges.map((badge) => ({ key: badge.code, label: `🏅 ${badge.name}` }))} />}
      {result.challengesCompleted.length > 0 && <ResultList title="Challenge selesai" items={result.challengesCompleted.map((challenge) => ({ key: challenge.code, label: `🎯 ${challenge.title}` }))} />}
      {result.milestone && <div className={`mt-lg rounded-sm p-lg text-sm ${result.milestone.success ? "bg-[#eaf7ee] text-success" : "bg-[#fff7df] text-charcoal"}`}><strong>{result.milestone.success ? "Milestone berhasil" : "Milestone belum berhasil"}</strong><p className="mt-xs">{result.milestone.message}</p></div>}
      {result.aiCoach && <SessionCoachPanel insight={result.aiCoach} />}
      <div className="mt-section flex flex-wrap gap-md"><Button onClick={() => router.push("/history")}>Lihat riwayat</Button><Button variant="secondary" onClick={() => router.push("/exercises")}>Latihan lain</Button></div>
    </Container>;
  }

  const phaseLabel: Record<string, string> = { idle: "Persiapan", active: "Sedang latihan", finished: "Selesai" };
  const preparationMessage = getPreparationMessage(startCountdown, readiness.message);
  const cameraGuidance = getCameraGuidance(exerciseSlug, camera.facingMode, orientation);

  return <Container className="py-xl tablet-narrow:py-section">
    <header className="flex items-center justify-between gap-lg"><div><Link href={`/exercises/${exerciseSlug}`} className="inline-flex items-center gap-xs text-xs text-mute hover:text-ink"><Icon name="arrow" className="h-3.5 w-3.5 rotate-180" /> Kembali ke panduan</Link><h1 className="mt-sm font-display text-4xl uppercase tablet-narrow:text-5xl">{exerciseName}</h1></div><span className="chip"><span className={`h-2 w-2 rounded-full ${phase === "active" ? "animate-pulse bg-sport-lime-deep" : "bg-stone"}`} />{phaseLabel[phase] ?? phase}</span></header>
    <div className="mt-xl grid gap-lg desktop-small:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        {phase === "idle" && (
          <CameraSetupToolbar
            facingMode={camera.facingMode}
            orientation={orientation}
            busy={camera.status === "requesting"}
            onSelect={selectCamera}
          />
        )}
        <div className={`relative w-full overflow-hidden rounded-sm bg-sport-black ${
          orientation === "landscape"
            ? "aspect-video"
            : "aspect-[3/4] tablet-narrow:aspect-video"
        }`}>
          <video
            ref={camera.videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${
              camera.isMirrored ? "[transform:scaleX(-1)]" : ""
            }`}
          />
          <PoseOverlay
            landmarks={landmarks}
            videoRef={camera.videoRef}
            mirror={camera.isMirrored}
            issueCodes={session.live.status === "active" ? session.live.feedback.map((item) => item.code) : []}
          />
          <div className="pointer-events-none absolute left-md top-md rounded-full bg-black/65 px-md py-sm text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur"><span className="mr-sm inline-block h-2 w-2 rounded-full bg-sport-lime" />Live pose</div>
          {camera.status !== "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-sport-black/90 p-xl text-center text-white"><span className="grid h-16 w-16 place-items-center rounded-full bg-white/10"><Icon name="camera" className="h-7 w-7 text-sport-lime" /></span><h2 className="mt-lg font-display text-3xl uppercase">Kamera belum aktif</h2><p className="mt-sm max-w-md text-sm leading-relaxed text-white/55">Kamera diperlukan untuk membaca gerakan. Video diproses langsung di perangkat dan tidak pernah disimpan.</p><Button onClick={enableCamera} disabled={loadingModel || camera.status === "requesting"} className="mt-lg bg-sport-lime text-sport-black hover:bg-white">{loadingModel || camera.status === "requesting" ? "Memuat kamera…" : `Aktifkan kamera ${camera.facingMode === "user" ? "depan" : "belakang"}`}</Button>{camera.error && <p className="mt-md max-w-sm text-caption-sm text-[#ff9c9c]">{camera.error}</p>}</div>}
          {startCountdown && phase === "idle" && camera.status === "ready" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-sport-black/35 text-center text-white backdrop-blur-[2px]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sport-lime">
                  {startCountdown.mode === "timer" ? "Ambil posisi" : "Posisi terkunci"}
                </p>
                <p className="mt-sm font-display text-8xl leading-none">
                  {startCountdown.seconds > 0 ? startCountdown.seconds : "SIAP"}
                </p>
                <p className="mt-sm text-sm text-white/75">
                  {startCountdown.seconds > 0
                    ? "Sesi akan dimulai otomatis"
                    : "Tahan posisi sampai tubuh terbaca"}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-md flex items-start gap-sm text-xs leading-relaxed text-mute">
          <Icon name="camera" className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold text-ink">{cameraGuidance}</p>
            <p className="mt-xs">{cameraPosition}</p>
          </div>
        </div>
      </div>
      <aside className="h-fit rounded-sm bg-sport-black p-xl text-white desktop-small:sticky desktop-small:top-28">
        {phase === "finished" && pendingPayload ? <>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Penyimpanan sesi</p>
          <div className="mt-lg rounded-sm border border-white/10 bg-white/[0.04] p-lg">
            <p className="font-display text-2xl uppercase">Latihan sudah selesai</p>
            <p className="mt-sm text-xs leading-relaxed text-white/55">Data latihan tetap tersedia di perangkat ini. Coba simpan kembali tanpa perlu mengulang sesi.</p>
          </div>
          <Button onClick={finishSession} disabled={finalizing} className="mt-xl w-full bg-sport-lime text-sport-black hover:bg-white">{finalizing ? "Menyimpan…" : "Coba simpan lagi"}</Button>
        </> : phase !== "active" ? <>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Status kesiapan</p>
          <div className="mt-lg flex items-start gap-md"><span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${readiness.status === "ready" ? "bg-sport-lime" : "bg-white/25"}`} /><p className="text-sm leading-relaxed text-white/70" role="status" aria-live="polite">{preparationMessage}</p></div>
          <div className="mt-xl space-y-md border-y border-white/10 py-lg">
            <p className="flex items-center gap-sm text-xs text-white/60"><Icon name={readiness.status === "ready" ? "check" : "target"} className={`h-4 w-4 ${readiness.status === "ready" ? "text-sport-lime" : "text-white/35"}`} />{exerciseSlug === "push-up" && camera.facingMode === "user" ? "Kedua lengan dan pinggul terbaca" : "Tubuh dan kaki terbaca kamera"}</p>
            <p className="flex items-center gap-sm text-xs text-white/50"><Icon name="check" className="h-4 w-4 text-sport-lime" />Mulai otomatis setelah posisi stabil</p>
            <p className="flex items-center gap-sm text-xs text-white/50"><Icon name="check" className="h-4 w-4 text-sport-lime" />Pastikan area gerak aman</p>
          </div>
          {startCountdown ? (
            <Button variant="secondary" onClick={cancelCountdown} className="mt-xl w-full border-white/20 bg-white/10 text-white hover:bg-white/20">Batalkan timer</Button>
          ) : (
            <Button onClick={startDelayedSession} disabled={!startAvailable} className="mt-xl w-full bg-sport-lime text-sport-black hover:bg-white"><Icon name="history" className="h-5 w-5" /> Timer 10 detik</Button>
          )}
          <p className="mt-md text-center text-[10px] leading-relaxed text-white/35">Tidak perlu menyentuh layar saat posisi sudah tepat.</p>
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

function getPreparationMessage(
  countdown: StartCountdown | null,
  readinessMessage: string,
): string {
  if (!countdown) {
    return readinessMessage === "Posisi sudah baik. Mulai latihan."
      ? "Posisi sudah baik. Tahan sebentar untuk mulai otomatis."
      : readinessMessage;
  }
  if (countdown.seconds === 0) {
    return countdown.mode === "timer"
      ? "Timer selesai. Tahan posisi yang benar untuk memulai."
      : "Tahan posisi. Sesi segera dimulai.";
  }
  return countdown.mode === "timer"
    ? `Ambil posisi. Sesi dimulai dalam ${countdown.seconds} detik.`
    : `Posisi terkunci. Mulai dalam ${countdown.seconds} detik.`;
}

function indonesianCountdown(seconds: number): string {
  return ({ 3: "Tiga", 2: "Dua", 1: "Satu" } as Record<number, string>)[seconds] ?? String(seconds);
}

function announceStartCue(message: string): void {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !("SpeechSynthesisUtterance" in window)
  ) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "id-ID";
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

function cancelStartCue(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function CameraSetupToolbar({
  facingMode,
  orientation,
  busy,
  onSelect,
}: {
  facingMode: CameraFacingMode;
  orientation: "portrait" | "landscape";
  busy: boolean;
  onSelect: (mode: CameraFacingMode) => void;
}) {
  return (
    <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
      <div className="flex items-center gap-sm">
        <Icon name="camera" className="h-4 w-4 text-mute" />
        <div
          className="inline-flex rounded-full bg-soft-cloud p-1"
          role="group"
          aria-label="Pilih kamera"
        >
          {([
            ["user", "Depan"],
            ["environment", "Belakang"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={facingMode === mode}
              disabled={busy}
              onClick={() => onSelect(mode)}
              className={`min-h-9 min-w-[86px] rounded-full px-md text-xs font-semibold transition-colors disabled:opacity-50 ${
                facingMode === mode
                  ? "bg-sport-black text-white"
                  : "text-mute hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <span className="inline-flex min-h-9 items-center rounded-full border border-hairline-soft px-md text-[10px] font-bold uppercase tracking-wider text-mute">
        {orientation === "landscape" ? "Landscape" : "Portrait"}
      </span>
    </div>
  );
}

function getCameraGuidance(
  exerciseSlug: string,
  facingMode: CameraFacingMode,
  orientation: "portrait" | "landscape",
): string {
  if (exerciseSlug === "push-up") {
    if (facingMode === "environment" && orientation === "portrait") {
      return "Putar HP ke landscape agar kamera belakang menangkap tubuh dari samping secara utuh.";
    }
    if (facingMode === "environment") {
      return "Kamera belakang landscape aktif. Ikuti countdown suara dan pastikan seluruh tubuh masuk frame.";
    }
    if (orientation === "landscape") {
      return "Kamera depan landscape aktif. Cocok untuk ruang gerak lebih lebar.";
    }
    return "Kamera depan portrait aktif. Pastikan kedua tangan, bahu, dan pinggul terlihat.";
  }
  if (orientation === "landscape") {
    return "Untuk gerakan berdiri, pastikan kepala sampai kaki tetap masuk meskipun layar landscape.";
  }
  return facingMode === "environment"
    ? "Kamera belakang aktif. Gunakan countdown suara dan pastikan seluruh tubuh terlihat."
    : "Kamera depan portrait aktif agar seluruh tinggi tubuh mudah dipantau.";
}

function LiveHud(props: { repCount: number; validReps: number; elapsedMs: number; trackingValid: boolean; feedback: { code: string; severity: string; message: string }[]; liveMetric?: { label: string; value: number }; targetReps: number | null }) {
  const [coachMessage, setCoachMessage] = useState<{ code: string; severity: string; message: string } | null>(null);
  const actionable = props.feedback.find((item) => item.code !== "good");
  const actionableCode = actionable?.code;
  const actionableMessage = actionable?.message;
  const actionableSeverity = actionable?.severity;
  useEffect(() => {
    if (actionableCode && actionableMessage && actionableSeverity) {
      setCoachMessage({ code: actionableCode, message: actionableMessage, severity: actionableSeverity });
      return;
    }
    const timeout = window.setTimeout(() => {
      setCoachMessage(null);
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [actionableCode, actionableMessage, actionableSeverity]);
  const seconds = Math.floor(props.elapsedMs / 1000);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const invalidReps = Math.max(0, props.repCount - props.validReps);
  return <div className="space-y-md">
    <div className="grid grid-cols-2 gap-sm"><DarkStat label="Valid" value={String(props.validReps)} /><DarkStat label="Perlu diperbaiki" value={String(invalidReps)} /><DarkStat label="Total" value={String(props.repCount)} /><DarkStat label="Waktu" value={time} /></div>
    {props.targetReps && <div><div className="mt-lg flex justify-between text-xs text-white/50"><span>Target repetisi valid</span><span>{props.validReps}/{props.targetReps}</span></div><div className="mt-sm h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sport-lime transition-[width] duration-300" style={{ width: `${Math.min(100, (props.validReps / props.targetReps) * 100)}%` }} /></div></div>}
    {!props.trackingValid ? <div className="rounded-sm border border-danger/40 bg-danger/15 p-md" role="alert"><p className="text-[10px] font-bold uppercase tracking-widest text-[#ff9c9c]">Pelacakan dijeda</p><p className="mt-xs text-xs leading-relaxed text-white/75">Tubuh tidak terbaca utuh. Kembali ke tengah frame agar penilaian dilanjutkan.</p></div> : coachMessage ? <div className="animate-coach-alert rounded-sm border border-[#ff7657]/45 bg-[#ff7657]/15 p-md" role="alert" aria-live="assertive"><p className="text-[10px] font-bold uppercase tracking-widest text-[#ff9c82]">Koreksi sekarang</p><p className="mt-xs text-sm font-semibold leading-relaxed text-white">{coachMessage.message}</p></div> : <div className="rounded-sm border border-sport-lime/20 bg-sport-lime/10 p-md" aria-live="polite"><p className="text-[10px] font-bold uppercase tracking-widest text-sport-lime">Gerakan terbaca</p><p className="mt-xs text-xs text-white/65">Pertahankan posisi dan selesaikan rentang gerak.</p></div>}
    {props.liveMetric && <p className="text-xs text-white/50">{props.liveMetric.label}: <strong className="text-white">{Math.round(props.liveMetric.value)}°</strong></p>}
  </div>;
}

function DarkStat({ label, value }: { label: string; value: string }) { return <div className="rounded-sm border border-white/10 bg-white/[0.04] p-md"><p className="text-[9px] uppercase tracking-wider text-white/40">{label}</p><p className="mt-xs font-display text-2xl">{value}</p></div>; }
function ResultStat({ label, value }: { label: string; value: string }) { return <div className="rounded-sm bg-white p-lg"><p className="text-xs text-mute">{label}</p><p className="mt-xs font-display text-3xl">{value}</p></div>; }
function ResultList({ title, items }: { title: string; items: { key: string; label: string }[] }) { return <section className="mt-section"><h2 className="font-display text-3xl uppercase">{title}</h2><ul className="mt-md grid gap-sm tablet-narrow:grid-cols-2">{items.map((item) => <li key={item.key} className="rounded-sm bg-white p-lg text-sm">{item.label}</li>)}</ul></section>; }
