"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";

const LOCAL_TUTORIAL_VIDEOS: Record<string, string> = {
  squat: "/tutorials/squat-3d.mp4",
  "jumping-jack": "/tutorials/jumping-jack-3d.mp4",
  "push-up": "/tutorials/push-up-3d.mp4",
};

export function ExerciseMotionDemo({
  slug,
  exerciseName,
  animationUrl,
}: {
  slug: string;
  exerciseName: string;
  animationUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const source = animationUrl || LOCAL_TUTORIAL_VIDEOS[slug];
  const [playing, setPlaying] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      videoRef.current?.pause();
      setPlaying(false);
    }
  }, []);

  if (!source) return null;

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        setPlaying(false);
      }
      return;
    }

    video.pause();
  };

  const restart = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    try {
      await video.play();
    } catch {
      setPlaying(false);
    }
  };

  return (
    <section className="mt-section" aria-labelledby="motion-demo-title">
      <p className="text-xs font-bold uppercase tracking-widest text-mute">Contoh bergerak</p>
      <h2 id="motion-demo-title" className="mt-xs font-display text-4xl uppercase tablet-narrow:text-5xl">
        Tutorial gerakan
      </h2>

      <figure className="relative mt-lg overflow-hidden bg-sport-black text-white">
        <div className="relative aspect-video w-full">
          <video
            ref={videoRef}
            key={source}
            src={source}
            className="block h-full w-full bg-sport-black object-contain"
            aria-label={`Video tutorial gerakan ${exerciseName}`}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onCanPlay={() => setLoadFailed(false)}
            onError={() => setLoadFailed(true)}
          />

          <span className="absolute left-md top-md rounded-full border border-white/15 bg-black/65 px-md py-sm text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
            Video tutorial
          </span>

          <div className="absolute right-md top-md flex gap-sm">
            <button
              type="button"
              className="tap-target grid place-items-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-ink"
              aria-label={playing ? "Jeda video tutorial" : "Putar video tutorial"}
              title={playing ? "Jeda video tutorial" : "Putar video tutorial"}
              onClick={togglePlayback}
            >
              <Icon name={playing ? "pause" : "play"} className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="tap-target grid place-items-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-ink"
              aria-label="Ulangi video tutorial"
              title="Ulangi video tutorial"
              onClick={restart}
            >
              <Icon name="history" className="h-5 w-5" />
            </button>
          </div>

          {loadFailed && (
            <div className="absolute inset-0 grid place-items-center bg-sport-black px-xl text-center text-sm text-white/65" role="alert">
              Video tutorial tidak dapat dimuat. Periksa kembali koneksi atau file video.
            </div>
          )}
        </div>

        <figcaption className="flex flex-wrap items-center justify-between gap-md border-t border-white/10 px-lg py-md">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/35">Panduan visual</p>
            <p className="mt-xs text-sm font-semibold text-white">Amati satu siklus penuh sebelum mulai</p>
          </div>
          <span className="rounded-full bg-sport-lime px-md py-sm text-[10px] font-bold uppercase tracking-widest text-sport-black">
            Berulang otomatis
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
