"use client";

import dynamic from "next/dynamic";
import type { RunPoint } from "./types";

const Map = dynamic(() => import("./run-map").then((module) => module.RunMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#171916]" aria-label="Memuat peta" />,
});

export function RunMapClient(props: { points: RunPoint[]; follow?: boolean; fitRoute?: boolean }) {
  return <Map {...props} />;
}
