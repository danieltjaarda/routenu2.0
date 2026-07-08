"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Stop } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface Props {
  startLng: number;
  startLat: number;
  stops: Stop[];
  geometry?: [number, number][];
}

export default function MapView({ startLng, startLat, stops, geometry }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [startLng, startLat],
      zoom: 8,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2bc0e4", "line-width": 5, "line-opacity": 0.85 },
      });
      loadedRef.current = true;
      updateRoute();
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function makeMarkerEl(label: string, color: string) {
    const el = document.createElement("div");
    el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.3);font-family:sans-serif;`;
    el.textContent = label;
    return el;
  }

  function updateRoute() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const src = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: geometry ?? [] },
      });
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const start = new mapboxgl.Marker({ element: makeMarkerEl("S", "#35c48d") })
      .setLngLat([startLng, startLat])
      .addTo(map);
    markersRef.current.push(start);

    stops.forEach((s, i) => {
      const m = new mapboxgl.Marker({ element: makeMarkerEl(String(i + 1), "#2bc0e4") })
        .setLngLat([s.lng, s.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML(`<strong>${s.customerName}</strong><br/>${s.address}`))
        .addTo(map);
      markersRef.current.push(m);
    });

    if (loadedRef.current) updateRoute();
    else map.on("load", updateRoute);

    const points: [number, number][] = [[startLng, startLat], ...stops.map((s) => [s.lng, s.lat] as [number, number])];
    if (points.length > 1) {
      const bounds = points.reduce(
        (b, p) => b.extend(p),
        new mapboxgl.LngLatBounds(points[0], points[0])
      );
      map.fitBounds(bounds, { padding: 70, maxZoom: 13 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startLng, startLat, stops, geometry]);

  if (!TOKEN) {
    return (
      <div className="map" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#e9eff3" }}>
        <div className="notice" style={{ maxWidth: 420 }}>
          Geen Mapbox token gevonden. Zet <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in je <code>.env.local</code> (zie <code>.env.example</code>).
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="map" />;
}
