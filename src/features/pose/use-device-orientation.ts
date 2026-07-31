"use client";

import { useEffect, useState } from "react";

export type DeviceOrientation = "portrait" | "landscape";

export function useDeviceOrientation(): DeviceOrientation {
  const [orientation, setOrientation] = useState<DeviceOrientation>(() => readOrientation());

  useEffect(() => {
    const media = window.matchMedia("(orientation: landscape)");
    let timer: number | null = null;
    const update = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        setOrientation(readOrientation());
      }, 250);
    };
    setOrientation(readOrientation());
    media.addEventListener?.("change", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      media.removeEventListener?.("change", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  return orientation;
}

function readOrientation(): DeviceOrientation {
  if (typeof window === "undefined") return "portrait";
  const width = window.visualViewport?.width || window.innerWidth;
  const height = window.visualViewport?.height || window.innerHeight;
  if (width > 0 && height > 0 && width !== height) {
    return width > height ? "landscape" : "portrait";
  }
  return window.matchMedia?.("(orientation: landscape)").matches ? "landscape" : "portrait";
}
