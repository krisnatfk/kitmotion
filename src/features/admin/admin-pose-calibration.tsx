"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input, Label } from "@/components/ui/field";
import { createEngine } from "@/features/exercise-engine/registry";
import type {
  ExerciseConfig,
  ExerciseFrameResult,
  ExerciseSessionMetrics,
  NormalizedLandmark,
  PoseFrame,
} from "@/features/exercise-engine/core/types";
import {
  checkReadiness,
  getPoseLandmarker,
  PoseOverlay,
  releasePoseLandmarker,
  smoothPoseFrame,
  toPoseFrame,
} from "@/features/pose";

export type CalibrationExercise = {
  slug: string;
  name: string;
  cameraPosition: string;
  engineKey: string;
  scoringVersion: string;
  config: ExerciseConfig;
};

type AnalysisStatus = "empty" | "ready" | "loading" | "analyzing" | "completed" | "error";
type Diagnostics = { frames: number; poseFrames: number; trackingFrames: number; inferenceErrors: number };

const EMPTY_DIAGNOSTICS: Diagnostics = { frames: 0, poseFrames: 0, trackingFrames: 0, inferenceErrors: 0 };
const CALIBRATION_FPS = 15;
const MAX_VIDEO_DURATION_SECONDS = 180;

export function AdminPoseCalibration({ exercises }: { exercises: CalibrationExercise[] }) {
  const [selectedSlug, setSelectedSlug] = useState(exercises[0]?.slug ?? "");
  const selected = useMemo(
    () => exercises.find((exercise) => exercise.slug === selectedSlug) ?? null,
    [exercises, selectedSlug],
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const engineRef = useRef<ReturnType<typeof createEngine>>(null);
  const diagnosticsRef = useRef<Diagnostics>({ ...EMPTY_DIAGNOSTICS });
  const analysisRunRef = useRef(0);
  const lastDetectionTimestampRef = useRef(0);
  const [landmarker, setLandmarker] = useState<PoseLandmarker | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
  const [status, setStatus] = useState<AnalysisStatus>("empty");
  const [error, setError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [readiness, setReadiness] = useState({ status: "no-body", message: "Belum ada frame yang dianalisis." });
  const [live, setLive] = useState<ExerciseFrameResult | null>(null);
  const [metrics, setMetrics] = useState<ExerciseSessionMetrics | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({ ...EMPTY_DIAGNOSTICS });
  const [progress, setProgress] = useState(0);
  const [expectedValid, setExpectedValid] = useState("");
  const [expectedInvalid, setExpectedInvalid] = useState("");

  const handleFrame = useCallback((frame: PoseFrame) => {
    if (!selected) return;
    diagnosticsRef.current.frames += 1;
    if (frame.landmarks.length) diagnosticsRef.current.poseFrames += 1;
    setLandmarks(frame.landmarks.length ? frame.landmarks : null);
    const nextReadiness = checkReadiness(frame.landmarks, selected.slug, frame.worldLandmarks);
    setReadiness({ status: nextReadiness.status, message: nextReadiness.message });
    const engine = engineRef.current;
    if (engine) {
      const result = engine.processFrame(frame);
      if (result.trackingValid) diagnosticsRef.current.trackingFrames += 1;
      setLive(result);
    }
  }, [selected]);

  const resetAnalysis = useCallback((nextStatus: AnalysisStatus = videoUrl ? "ready" : "empty") => {
    analysisRunRef.current += 1;
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.currentTime = 0;
    engineRef.current = null;
    setLive(null);
    setMetrics(null);
    diagnosticsRef.current = { ...EMPTY_DIAGNOSTICS };
    setDiagnostics({ ...EMPTY_DIAGNOSTICS });
    setProgress(0);
    setLandmarks(null);
    setReadiness({ status: "no-body", message: "Belum ada frame yang dianalisis." });
    setError(null);
    setStatus(nextStatus);
  }, [videoUrl]);

  useEffect(() => {
    resetAnalysis(videoUrl ? "ready" : "empty");
  }, [resetAnalysis, selectedSlug, videoUrl]);

  useEffect(() => () => {
    analysisRunRef.current += 1;
    videoRef.current?.pause();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    releasePoseLandmarker();
  }, []);

  function selectVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Pilih file video berformat MP4, WebM, atau MOV.");
      setStatus("error");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setVideoUrl(nextUrl);
    setFileName(file.name);
    setError(null);
    setStatus("ready");
  }

  async function startAnalysis() {
    if (!selected || !videoRef.current || !videoUrl) return;
    setError(null);
    setStatus("loading");
    const runId = analysisRunRef.current + 1;
    analysisRunRef.current = runId;
    try {
      const model = landmarker ?? await getPoseLandmarker();
      if (analysisRunRef.current !== runId) return;
      setLandmarker(model);
      const engine = createEngine(selected.engineKey);
      if (!engine) throw new Error("Engine latihan tidak tersedia.");
      engine.initialize(selected.config);
      engineRef.current = engine;
      diagnosticsRef.current = { ...EMPTY_DIAGNOSTICS };
      setDiagnostics({ ...EMPTY_DIAGNOSTICS });
      setLive(null);
      setMetrics(null);
      setLandmarks(null);
      setProgress(0);
      const video = videoRef.current;
      video.pause();
      await waitForVideoData(video);
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        throw new Error("Durasi video tidak dapat dibaca.");
      }
      if (video.duration > MAX_VIDEO_DURATION_SECONDS) {
        throw new Error(`Durasi video maksimal ${MAX_VIDEO_DURATION_SECONDS} detik untuk satu kalibrasi.`);
      }
      setStatus("analyzing");
      const sampleCount = Math.max(1, Math.ceil(video.duration * CALIBRATION_FPS));
      const detectionBase = Math.max(performance.now(), lastDetectionTimestampRef.current + 1);
      let previousLandmarks: NormalizedLandmark[] | null = null;
      let previousWorldLandmarks: NormalizedLandmark[] | null = null;

      for (let index = 0; index < sampleCount; index += 1) {
        if (analysisRunRef.current !== runId) return;
        const videoTime = Math.min(index / CALIBRATION_FPS, Math.max(0, video.duration - 0.001));
        await seekVideo(video, videoTime);
        if (analysisRunRef.current !== runId) return;
        const detectionTimestamp = detectionBase + videoTime * 1000;
        let frame: PoseFrame;
        try {
          const detection = model.detectForVideo(video, detectionTimestamp);
          const rawFrame = toPoseFrame(
            detection.landmarks?.[0],
            videoTime * 1000,
            false,
            detection.worldLandmarks?.[0],
          );
          frame = rawFrame.landmarks.length
            ? smoothPoseFrame(rawFrame, previousLandmarks, undefined, previousWorldLandmarks)
            : rawFrame;
          previousLandmarks = frame.landmarks.length ? frame.landmarks : null;
          previousWorldLandmarks = frame.worldLandmarks ?? null;
        } catch {
          diagnosticsRef.current.inferenceErrors += 1;
          previousLandmarks = null;
          previousWorldLandmarks = null;
          frame = { landmarks: [], timestampMs: videoTime * 1000 };
        }
        lastDetectionTimestampRef.current = detectionTimestamp;
        handleFrame(frame);
        setProgress(Math.round(((index + 1) / sampleCount) * 100));
        await yieldToBrowser();
      }

      if (analysisRunRef.current === runId) finishAnalysis();
    } catch (cause) {
      if (analysisRunRef.current !== runId) return;
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Model pose gagal dimuat.");
    }
  }

  function cancelAnalysis() {
    resetAnalysis("ready");
  }

  function finishAnalysis() {
    const engine = engineRef.current;
    if (!engine) return;
    setMetrics(engine.finalize());
    setDiagnostics({ ...diagnosticsRef.current });
    setStatus("completed");
  }

  if (exercises.length === 0) {
    return (
      <section className="rounded-sm border border-black/10 bg-white p-xl text-sm text-mute">
        Tidak ada exercise version aktif yang dapat dikalibrasi.
      </section>
    );
  }

  const expectedValidValue = parseExpected(expectedValid);
  const expectedInvalidValue = parseExpected(expectedInvalid);

  return (
    <div className="space-y-xl">
      <section className="grid gap-lg desktop:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)] desktop:items-start">
        <div className="overflow-hidden rounded-sm bg-sport-black text-white">
          <div className="flex flex-wrap items-center justify-between gap-md border-b border-white/10 px-lg py-md">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sport-lime">Video lokal</p>
              <p className="mt-xs max-w-md truncate text-sm font-semibold">{fileName || "Belum ada video dipilih"}</p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div
            className="relative mx-auto w-full bg-black"
            style={{
              aspectRatio: String(videoAspectRatio),
              maxWidth: videoAspectRatio < 1 ? "520px" : "100%",
            }}
          >
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget;
                    if (video.videoWidth && video.videoHeight) {
                      setVideoAspectRatio(video.videoWidth / video.videoHeight);
                    }
                  }}
                />
                <PoseOverlay
                  landmarks={landmarks}
                  videoRef={videoRef}
                  mirror={false}
                  issueCodes={live?.feedback.map((item) => item.code) ?? []}
                />
                {(status === "loading" || status === "analyzing") && (
                  <div className="absolute inset-0 grid place-items-center bg-black/70 text-center">
                    <div className="w-56"><span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-sport-lime" /><p className="mt-md text-xs font-semibold">{status === "loading" ? "Memuat model pose..." : `Menganalisis frame ${progress}%`}</p>{status === "analyzing" && <div className="mt-md h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-sport-lime transition-[width]" style={{ width: `${progress}%` }} /></div>}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center p-xl text-center">
                <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/10"><Icon name="camera" className="h-6 w-6 text-sport-lime" /></span><p className="mt-md text-sm font-semibold">Pilih video pengujian</p></div>
              </div>
            )}
          </div>

          <div className="grid gap-sm border-t border-white/10 p-lg tablet-narrow:grid-cols-3">
            <DarkMetric label="Total" value={live?.repCount ?? metrics?.totalReps ?? 0} />
            <DarkMetric label="Valid" value={live?.validReps ?? metrics?.validReps ?? 0} tone="success" />
            <DarkMetric label="Tidak valid" value={live?.invalidReps ?? metrics?.invalidReps ?? 0} tone="warning" />
          </div>
        </div>

        <aside className="rounded-sm border border-black/[0.08] bg-white p-lg tablet-narrow:p-xl">
          <div>
            <Label htmlFor="calibration-exercise">Latihan</Label>
            <select
              id="calibration-exercise"
              value={selectedSlug}
              disabled={status === "analyzing" || status === "loading"}
              onChange={(event) => setSelectedSlug(event.target.value)}
              className="input-pill"
            >
              {exercises.map((exercise) => <option key={exercise.slug} value={exercise.slug}>{exercise.name}</option>)}
            </select>
          </div>

          <div className="mt-lg">
            <Label htmlFor="calibration-video">File video</Label>
            <Input id="calibration-video" type="file" accept="video/mp4,video/webm,video/quicktime" disabled={status === "analyzing" || status === "loading"} onChange={selectVideo} className="h-auto py-sm file:mr-md file:rounded-full file:border-0 file:bg-sport-black file:px-md file:py-sm file:text-xs file:font-semibold file:text-white" />
          </div>

          <div className="mt-lg grid grid-cols-2 gap-sm">
            <div><Label htmlFor="expected-valid">Label valid</Label><Input id="expected-valid" type="number" min="0" step="1" inputMode="numeric" value={expectedValid} onChange={(event) => setExpectedValid(event.target.value)} placeholder="0" /></div>
            <div><Label htmlFor="expected-invalid">Label tidak valid</Label><Input id="expected-invalid" type="number" min="0" step="1" inputMode="numeric" value={expectedInvalid} onChange={(event) => setExpectedInvalid(event.target.value)} placeholder="0" /></div>
          </div>

          <div className="mt-lg rounded-sm bg-[#f2f5ef] p-md">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-mute">Posisi kamera</p>
            <p className="mt-sm text-xs leading-relaxed text-charcoal">{selected?.cameraPosition}</p>
          </div>

          <div className="mt-md flex items-start gap-sm border-y border-black/[0.08] py-md">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${readiness.status === "ready" ? "bg-success-bright" : "bg-stone"}`} />
            <div><p className="text-xs font-semibold">Kesiapan: {readiness.status}</p><p className="mt-xs text-xs leading-relaxed text-mute">{readiness.message}</p></div>
          </div>

          <div className="mt-lg flex gap-sm">
            {status === "analyzing" ? (
              <Button onClick={cancelAnalysis} className="flex-1"><Icon name="stop" className="h-4 w-4" /> Batalkan</Button>
            ) : (
              <Button onClick={startAnalysis} disabled={!videoUrl || status === "loading"} className="flex-1"><Icon name="play" className="h-4 w-4" /> Analisis</Button>
            )}
            <Button variant="secondary" onClick={() => resetAnalysis()} disabled={!videoUrl || status === "loading"} aria-label="Ulangi analisis"><Icon name="history" className="h-4 w-4" /></Button>
          </div>
          {error && <p className="mt-md rounded-sm bg-red-50 p-md text-xs text-danger" role="alert">{error}</p>}
          <p className="mt-lg text-[9px] font-bold uppercase tracking-[0.14em] text-mute">Engine {selected?.engineKey} · scoring {selected?.scoringVersion}</p>
        </aside>
      </section>

      {metrics && (
        <CalibrationResults
          metrics={metrics}
          diagnostics={diagnostics}
          expectedValid={expectedValidValue}
          expectedInvalid={expectedInvalidValue}
        />
      )}
    </div>
  );
}

function CalibrationResults({ metrics, diagnostics, expectedValid, expectedInvalid }: { metrics: ExerciseSessionMetrics; diagnostics: Diagnostics; expectedValid: number | null; expectedInvalid: number | null }) {
  const poseRate = diagnostics.frames ? (diagnostics.poseFrames / diagnostics.frames) * 100 : 0;
  const trackingRate = diagnostics.frames ? (diagnostics.trackingFrames / diagnostics.frames) * 100 : 0;
  return (
    <section className="border-t border-black/10 pt-xl">
      <div className="flex flex-col gap-md tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
        <div><p className="eyebrow text-sport-lime-deep">Hasil engine</p><h2 className="mt-sm font-display text-4xl uppercase">Ringkasan kalibrasi</h2></div>
        <p className="text-xs text-mute">Durasi terbaca {(metrics.durationMs / 1000).toFixed(1)} detik</p>
      </div>
      <div className="mt-lg grid grid-cols-2 gap-sm desktop:grid-cols-4">
        <ResultMetric label="Terdeteksi valid" value={metrics.validReps} comparison={comparison(metrics.validReps, expectedValid)} />
        <ResultMetric label="Terdeteksi tidak valid" value={metrics.invalidReps} comparison={comparison(metrics.invalidReps, expectedInvalid)} />
        <ResultMetric label="Skor form" value={Math.round(metrics.formScore)} suffix="/100" />
        <ResultMetric label="Skor stabilitas" value={Math.round(metrics.stabilityScore)} suffix="/100" />
      </div>
      <div className="mt-sm grid grid-cols-2 gap-sm desktop:grid-cols-4">
        <ResultMetric label="Frame dianalisis" value={diagnostics.frames} />
        <ResultMetric label="Pose terdeteksi" value={Math.round(poseRate)} suffix="%" />
        <ResultMetric label="Tracking engine" value={Math.round(trackingRate)} suffix="%" />
        <ResultMetric label="Error inferensi" value={diagnostics.inferenceErrors} />
      </div>
      <div className="mt-lg overflow-hidden rounded-sm border border-black/[0.08] bg-white">
        <div className="border-b border-black/[0.08] px-lg py-md"><p className="font-semibold">Temuan perbaikan</p></div>
        {metrics.feedbackSummary.length ? (
          <div className="divide-y divide-black/[0.08]">
            {metrics.feedbackSummary.map((feedback) => (
              <div key={feedback.code} className="grid gap-sm px-lg py-md tablet-narrow:grid-cols-[minmax(0,1fr)_120px] tablet-narrow:items-center">
                <div><p className="text-sm font-semibold">{feedback.message}</p><p className="mt-xs text-[10px] uppercase tracking-wider text-mute">{feedback.code}</p></div>
                <p className="text-xs font-semibold tablet-narrow:text-right">{feedback.occurrenceCount} repetisi</p>
              </div>
            ))}
          </div>
        ) : <p className="p-lg text-sm text-mute">Tidak ada feedback kesalahan yang tersimpan.</p>}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: AnalysisStatus }) {
  const labels: Record<AnalysisStatus, string> = { empty: "Menunggu video", ready: "Siap", loading: "Memuat model", analyzing: "Menganalisis", completed: "Selesai", error: "Error" };
  return <span className={`rounded-full px-md py-sm text-[9px] font-bold uppercase tracking-wider ${status === "analyzing" ? "bg-sport-lime text-black" : "bg-white/10 text-white/60"}`}>{labels[status]}</span>;
}

function DarkMetric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" }) {
  return <div className="rounded-sm border border-white/10 bg-white/[0.04] p-md"><p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{label}</p><output aria-label={label} className={`mt-xs block font-display text-3xl ${tone === "success" ? "text-sport-lime" : tone === "warning" ? "text-[#ff9f66]" : "text-white"}`}>{value}</output></div>;
}

function ResultMetric({ label, value, suffix, comparison: detail }: { label: string; value: number; suffix?: string; comparison?: string | null }) {
  return <div className="rounded-sm border border-black/[0.08] bg-white p-lg"><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-mute">{label}</p><output aria-label={label} className="mt-md block font-display text-4xl leading-none">{value}<span className="ml-xs font-sans text-[10px] text-mute">{suffix}</span></output>{detail && <p className="mt-sm text-xs text-mute">{detail}</p>}</div>;
}

function parseExpected(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function comparison(actual: number, expected: number | null): string | null {
  if (expected == null) return null;
  const delta = actual - expected;
  if (delta === 0) return `Sesuai label (${expected})`;
  return `${Math.abs(delta)} ${delta > 0 ? "lebih banyak" : "lebih sedikit"} dari label ${expected}`;
}

async function waitForVideoData(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("error", handleError);
    };
    const handleLoaded = () => { cleanup(); resolve(); };
    const handleError = () => { cleanup(); reject(new Error("Video gagal dibaca oleh browser.")); };
    video.addEventListener("loadeddata", handleLoaded, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

async function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.0005 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };
    const handleSeeked = () => { cleanup(); resolve(); };
    const handleError = () => { cleanup(); reject(new Error("Frame video gagal dibaca.")); };
    video.addEventListener("seeked", handleSeeked, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.currentTime = time;
  });
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}
