"use client";

import { useEffect, useState } from "react";

export type DeviceOrientation = "portrait" | "landscape";

export function useDeviceOrientation(): DeviceOrientation {
  const [orientation, setOrientation] = useState<DeviceOrientation>(() => readOrientation());

  useEffect(() => {
    const media = window.matchMedia("(orientation: landscape)");
    const update = () => setOrientation(media.matches ? "landscape" : "portrait");
    update();
    media.addEventListener?.("change", update);
    window.addEventListener("orientationchange", update);
    return () => {
      media.removeEventListener?.("change", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return orientation;
}

function readOrientation(): DeviceOrientation {
  if (typeof window === "undefined" || !window.matchMedia) return "portrait";
  return window.matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait";
}
