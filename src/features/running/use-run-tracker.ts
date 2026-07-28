"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClientSessionId } from "@/features/workout-session/payload";
import { haversineDistanceMeters, paceSecondsPerKilometer } from "./metrics";
import type { RunPoint, RunSummary, RunTrackerStatus } from "./types";

const MAX_ACCEPTED_ACCURACY_METERS = 65;
const MAX_RUNNING_SPEED_METERS_PER_SECOND = 12.5;

export function useRunTracker() {
  const [status, setStatus] = useState<RunTrackerStatus>("idle");
  const [points, setPoints] = useState<RunPoint[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentPace, setCurrentPace] = useState<number | null>(null);
  const [bestPace, setBestPace] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef<RunTrackerStatus>("idle");
  const pointsRef = useRef<RunPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const activeStartedAtRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const distanceRef = useRef(0);
  const segmentRef = useRef(0);
  const lastPointRef = useRef<RunPoint | null>(null);

  const changeStatus = useCallback((next: RunTrackerStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const activeElapsedSeconds = useCallback(() => {
    const activeMs = statusRef.current === "active"
      ? Date.now() - activeStartedAtRef.current
      : 0;
    return Math.max(0, Math.round((accumulatedMsRef.current + activeMs) / 1000));
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const measuredAccuracy = Math.max(0, position.coords.accuracy || 0);
    setAccuracy(measuredAccuracy);

    if (measuredAccuracy > MAX_ACCEPTED_ACCURACY_METERS) {
      setError(`Sinyal GPS belum stabil (±${Math.round(measuredAccuracy)} m). Pindah ke area terbuka.`);
      return;
    }

    if (statusRef.current === "locating") {
      startedAtRef.current = new Date().toISOString();
      activeStartedAtRef.current = Date.now();
      changeStatus("active");
    }
    if (statusRef.current !== "active") return;

    const elapsed = activeElapsedSeconds();
    const candidate: RunPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: Math.max(0, Math.round(position.timestamp)),
      elapsedSeconds: elapsed,
      accuracy: Math.round(measuredAccuracy * 10) / 10,
      altitude: position.coords.altitude == null
        ? null
        : Math.round(position.coords.altitude * 10) / 10,
      segment: segmentRef.current,
    };

    const previous = lastPointRef.current;
    if (previous && previous.segment === candidate.segment) {
      const timeDeltaSeconds = (candidate.timestamp - previous.timestamp) / 1000;
      if (timeDeltaSeconds < 0.5) return;
      const segmentDistance = haversineDistanceMeters(previous, candidate);
      const jitterThreshold = Math.max(2.5, Math.min(6, measuredAccuracy * 0.12));
      if (segmentDistance < jitterThreshold) return;
      const speed = segmentDistance / timeDeltaSeconds;
      if (speed > MAX_RUNNING_SPEED_METERS_PER_SECOND) {
        setError("Loncatan GPS terdeteksi dan diabaikan agar jarak tetap akurat.");
        return;
      }
      distanceRef.current += segmentDistance;
      setDistanceMeters(distanceRef.current);

      const speedFromDevice = position.coords.speed;
      const trustedSpeed = speedFromDevice != null && speedFromDevice >= 0.5 && speedFromDevice <= MAX_RUNNING_SPEED_METERS_PER_SECOND
        ? speedFromDevice
        : speed;
      const measuredPace = trustedSpeed >= 0.5 ? Math.round(1000 / trustedSpeed) : null;
      if (measuredPace != null && measuredPace >= 120 && measuredPace <= 3600) {
        setCurrentPace((current) => current == null ? measuredPace : Math.round(current * 0.68 + measuredPace * 0.32));
        if (segmentDistance >= 15) setBestPace((current) => current == null ? measuredPace : Math.min(current, measuredPace));
      }
    }

    lastPointRef.current = candidate;
    pointsRef.current = [...pointsRef.current, candidate];
    setPoints(pointsRef.current);
    setError(null);
  }, [activeElapsedSeconds, changeStatus]);

  const handlePositionError = useCallback((positionError: GeolocationPositionError) => {
    const message = positionError.code === positionError.PERMISSION_DENIED
      ? "Izin lokasi ditolak. Aktifkan Location untuk KITMOTION di pengaturan browser."
      : positionError.code === positionError.TIMEOUT
        ? "GPS belum mendapat posisi. Coba lagi di area terbuka."
        : "Lokasi tidak dapat dibaca. Periksa GPS dan koneksi perangkat.";
    setError(message);
    if (statusRef.current === "locating") changeStatus("idle");
  }, [changeStatus]);

  const beginWatching = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Perangkat atau browser ini tidak mendukung pelacakan GPS.");
      changeStatus("idle");
      return;
    }
    stopWatching();
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handlePositionError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  }, [changeStatus, handlePosition, handlePositionError, stopWatching]);

  const start = useCallback(() => {
    setError(null);
    setPoints([]);
    setElapsedSeconds(0);
    setDistanceMeters(0);
    setCurrentPace(null);
    setBestPace(null);
    setAccuracy(null);
    pointsRef.current = [];
    distanceRef.current = 0;
    accumulatedMsRef.current = 0;
    segmentRef.current = 0;
    lastPointRef.current = null;
    startedAtRef.current = null;
    changeStatus("locating");
    beginWatching();
  }, [beginWatching, changeStatus]);

  const pause = useCallback(() => {
    if (statusRef.current !== "active") return;
    accumulatedMsRef.current += Date.now() - activeStartedAtRef.current;
    setElapsedSeconds(Math.max(0, Math.round(accumulatedMsRef.current / 1000)));
    setCurrentPace(null);
    lastPointRef.current = null;
    stopWatching();
    changeStatus("paused");
  }, [changeStatus, stopWatching]);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return;
    segmentRef.current += 1;
    activeStartedAtRef.current = Date.now();
    changeStatus("active");
    beginWatching();
  }, [beginWatching, changeStatus]);

  const finish = useCallback((): RunSummary | null => {
    if (statusRef.current !== "active" && statusRef.current !== "paused") return null;
    if (statusRef.current === "active") {
      accumulatedMsRef.current += Date.now() - activeStartedAtRef.current;
    }
    stopWatching();
    const durationSeconds = Math.max(1, Math.round(accumulatedMsRef.current / 1000));
    setElapsedSeconds(durationSeconds);
    changeStatus("finished");
    if (!startedAtRef.current || pointsRef.current.length === 0) return null;
    return {
      clientSessionId: createClientSessionId(),
      startedAt: startedAtRef.current,
      durationSeconds,
      route: pointsRef.current,
    };
  }, [changeStatus, stopWatching]);

  const reset = useCallback(() => {
    stopWatching();
    changeStatus("idle");
    setPoints([]);
    setElapsedSeconds(0);
    setDistanceMeters(0);
    setCurrentPace(null);
    setBestPace(null);
    setAccuracy(null);
    setError(null);
  }, [changeStatus, stopWatching]);

  useEffect(() => {
    if (status !== "active") return;
    const timer = window.setInterval(() => setElapsedSeconds(activeElapsedSeconds()), 250);
    return () => window.clearInterval(timer);
  }, [activeElapsedSeconds, status]);

  useEffect(() => stopWatching, [stopWatching]);

  return {
    status,
    points,
    elapsedSeconds,
    distanceMeters,
    averagePace: paceSecondsPerKilometer(elapsedSeconds, distanceMeters),
    currentPace,
    bestPace,
    accuracy,
    error,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}
