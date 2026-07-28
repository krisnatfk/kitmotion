"use client";

import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { env } from "@/lib/env";
import type { RunPoint } from "./types";

const INDONESIA_CENTER: LatLngExpression = [-2.5, 118];

export function RunMap({
  points,
  follow = false,
  fitRoute = false,
}: {
  points: RunPoint[];
  follow?: boolean;
  fitRoute?: boolean;
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
      zoom={current ? 16 : 5}
      zoomControl={false}
      attributionControl
      className="run-map h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url={env.mapTileUrl}
        maxZoom={19}
      />
      {segments.map((segment, index) => segment.length > 1 && (
        <Polyline
          key={index}
          positions={segment}
          pathOptions={{ color: "#c8ff2e", weight: 6, opacity: 0.96, lineCap: "round", lineJoin: "round" }}
          className="run-route-line"
        />
      ))}
      {points[0] && <CircleMarker center={[points[0].lat, points[0].lng]} radius={7} pathOptions={{ color: "#ffffff", fillColor: "#111111", fillOpacity: 1, weight: 3 }} />}
      {current && <CircleMarker center={[current.lat, current.lng]} radius={9} pathOptions={{ color: "#ffffff", fillColor: "#c8ff2e", fillOpacity: 1, weight: 4 }} className="run-current-marker" />}
      <MapViewport points={points} follow={follow} fitRoute={fitRoute} />
    </MapContainer>
  );
}

function MapViewport({ points, follow, fitRoute }: { points: RunPoint[]; follow: boolean; fitRoute: boolean }) {
  const map = useMap();
  const current = points[points.length - 1];

  useEffect(() => {
    window.setTimeout(() => map.invalidateSize(), 50);
  }, [map]);

  useEffect(() => {
    if (!current || !follow) return;
    map.flyTo([current.lat, current.lng], Math.max(map.getZoom(), 16), { duration: 0.7 });
  }, [current, follow, map]);

  useEffect(() => {
    if (!fitRoute || points.length < 2) return;
    const bounds = points.map((point) => [point.lat, point.lng]) as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 17, animate: true, duration: 0.8 });
  }, [fitRoute, map, points]);

  return null;
}
