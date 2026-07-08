"use client";

import { useState } from "react";

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
  const [searching, setSearching] = useState(false);

  async function search() {
    if (!value.trim() || !TOKEN) return;
    setSearching(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${TOKEN}&country=nl,be,de&language=nl&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(
        (data.features ?? []).map((f: { place_name: string; center: [number, number] }) => ({
          address: f.place_name,
          lng: f.center[0],
          lat: f.center[1],
        }))
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1 }}
          placeholder={placeholder ?? "Bijv. Dam 1, Amsterdam"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
        />
        <button type="button" className="btn small" onClick={search} disabled={searching}>
          {searching ? "..." : "Zoek"}
        </button>
      </div>
      {results.length > 0 && (
        <div className="geo-results">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(r);
                setResults([]);
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
