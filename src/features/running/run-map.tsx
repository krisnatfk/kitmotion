"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression, Map as LeafletMap } from "leaflet";
import { env } from "@/lib/env";
import { LIVE_FOLLOW_ZOOM, RESULT_MAX_ZOOM, selectViewportPoints } from "./map-viewport";
import type { RunPoint } from "./types";

const INDONESIA_CENTER: LatLngExpression = [-2.5, 118];

export function RunMap({
  points,
  follow = false,
  fitRoute = false,
  mode = "live",
}: {
  points: RunPoint[];
  follow?: boolean;
  fitRoute?: boolean;
  mode?: "live" | "result";
}) {
  const segments = useMemo(() => {
    const grouped = new Map<number, LatLngExpression[]>();
    points.forEach((point) => {
      const segment = grouped.get(point.segment) ?? [];
      segment.push([point.lat, point.lng]);
      grouped.set(point.segment, segment);
    });
    return [...grouped.values()];
  }, [points]);
  const current = points[points.length - 1];

  return (
    <MapContainer
      center={current ? [current.lat, current.lng] : INDONESIA_CENTER}
      zoom={current ? LIVE_FOLLOW_ZOOM : 5}
      zoomSnap={0.25}
      zoomDelta={0.5}
      zoomControl={false}
      attributionControl
      worldCopyJump
      className={`run-map run-map-${mode} h-full w-full`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url={env.mapTileUrl}
        maxNativeZoom={19}
        maxZoom={20}
      />
      {segments.map((segment, index) => segment.length > 1 && (
        <Fragment key={index}>
          <Polyline
            positions={segment}
            pathOptions={{ color: "#ffffff", weight: 11, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
            smoothFactor={1.15}
            className="run-route-casing"
          />
          <Polyline
            positions={segment}
            pathOptions={{ color: "#9fd800", weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" }}
            smoothFactor={1.15}
            className="run-route-line"
          />
        </Fragment>
      ))}
      {points[0] && <CircleMarker center={[points[0].lat, points[0].lng]} radius={7} pathOptions={{ color: "#ffffff", fillColor: "#111310", fillOpacity: 1, weight: 3 }} />}
      {current && <CircleMarker center={[current.lat, current.lng]} radius={9} pathOptions={{ color: "#ffffff", fillColor: "#aee900", fillOpacity: 1, weight: 4 }} className={mode === "live" ? "run-current-marker" : "run-finish-marker"} />}
      <MapViewport points={points} follow={follow} fitRoute={fitRoute} />
    </MapContainer>
  );
}

function MapViewport({ points, follow, fitRoute }: { points: RunPoint[]; follow: boolean; fitRoute: boolean }) {
  const map = useMap();
  const current = points[points.length - 1];
  const fittedRef = useRef(false);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    const resize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        map.invalidateSize({ animate: false });
        if (fitRoute) {
          fittedRef.current = false;
          frame = window.requestAnimationFrame(() => fitResultRoute(map, pointsRef.current, fittedRef));
        }
      }, 80);
    };
    resize();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(resize);
    observer?.observe(map.getContainer());
    return () => {
      observer?.disconnect();
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [fitRoute, map]);

  useEffect(() => {
    if (!current || !follow) return;
    const destination: LatLngExpression = [current.lat, current.lng];
    if (points.length === 1 || map.getZoom() < LIVE_FOLLOW_ZOOM) {
      map.flyTo(destination, LIVE_FOLLOW_ZOOM, { animate: true, duration: 0.55 });
      return;
    }
    map.panTo(destination, { animate: true, duration: 0.3, noMoveStart: true });
  }, [current, follow, map, points.length]);

  useEffect(() => {
    if (!fitRoute || points.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
      fitResultRoute(map, points, fittedRef);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitRoute, map, points]);

  return null;
}

function fitResultRoute(
  map: LeafletMap,
  points: RunPoint[],
  fittedRef: { current: boolean },
) {
  if (fittedRef.current || points.length === 0) return;
  const viewportPoints = selectViewportPoints(points);
  if (viewportPoints.length === 1) {
    const only = viewportPoints[0];
    if (!only) return;
    map.setView([only.lat, only.lng], RESULT_MAX_ZOOM, { animate: false });
  } else {
    const bounds = viewportPoints.map((point) => [point.lat, point.lng]) as LatLngBoundsExpression;
    map.fitBounds(bounds, {
      paddingTopLeft: [30, 52],
      paddingBottomRight: [30, 38],
      maxZoom: RESULT_MAX_ZOOM,
      animate: false,
    });
  }
  fittedRef.current = true;
}
