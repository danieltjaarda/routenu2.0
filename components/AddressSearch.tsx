"use client";

import { useEffect, useRef, useState } from "react";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export interface GeoResult {
  address: string;
  lng: number;
  lat: number;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect: (r: GeoResult) => void;
  placeholder?: string;
}

export default function AddressSearch({ value, onChange, onSelect, placeholder }: Props) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSearchRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = value.trim();
    if (query.length < 3 || !TOKEN) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${TOKEN}&country=nl,be,de&language=nl&limit=5&autocomplete=true`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        const found = (data.features ?? []).map(
          (f: { place_name: string; center: [number, number] }) => ({
            address: f.place_name,
            lng: f.center[0],
            lat: f.center[1],
          })
        );
        setResults(found);
        setOpen(found.length > 0);
      } catch {
        // afgebroken of netwerkfout: niets doen
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <div style={{ position: "relative" }}>
      <input
        style={{ width: "100%" }}
        placeholder={placeholder ?? "Bijv. Dam 1, Amsterdam"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (results.length > 0) {
              skipNextSearchRef.current = true;
              onSelect(results[0]);
              setOpen(false);
            }
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && results.length > 0 && (
        <div
          className="geo-results"
          style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, background: "#fff", boxShadow: "0 8px 24px rgba(15,37,50,0.12)" }}
        >
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                skipNextSearchRef.current = true;
                onSelect(r);
                setResults([]);
                setOpen(false);
              }}
            >
              {r.address}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
