"use client";

import { useEffect, useMemo, useState } from "react";
import type { Driver, Availability } from "@/lib/types";
import { PROVINCES } from "@/lib/types";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PROV_SHORT: Record<string, string> = {
  Groningen: "GR",
  Friesland: "FR",
  Drenthe: "DR",
  Overijssel: "OV",
  Flevoland: "FL",
  Gelderland: "GD",
  Utrecht: "UT",
  "Noord-Holland": "NH",
  "Zuid-Holland": "ZH",
  Zeeland: "ZL",
  "Noord-Brabant": "NB",
  Limburg: "LB",
};

export default function AvailabilityPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState(4);
  // provincies die gebruikt worden bij het aanzetten van een nieuwe dag
  const [defaultProvinces, setDefaultProvinces] = useState<string[]>([...PROVINCES]);

  useEffect(() => {
    Promise.all([
      fetch("/api/drivers").then((r) => r.json()),
      fetch("/api/availability").then((r) => r.json()),
    ]).then(([d, a]) => {
      setDrivers(d);
      setAvailability(a);
      if (d.length > 0) setDriverId(d[0].id);
      setLoading(false);
    });
  }, []);

  const days = useMemo(() => {
    const out: string[] = [];
    const start = new Date();
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(toDateStr(d));
    }
    return out;
  }, [weeks]);

  function entryFor(date: string): Availability | undefined {
    return availability.find((a) => a.date === date && a.driverId === driverId);
  }

  function provincesFor(date: string): string[] {
    const entry = entryFor(date);
    if (!entry) return [];
    return entry.provinces && entry.provinces.length > 0 ? entry.provinces : [...PROVINCES];
  }

  async function save(date: string, available: boolean, provinces: string[]) {
    const allSelected = provinces.length === PROVINCES.length;
    setAvailability((prev) => {
      const rest = prev.filter((a) => !(a.date === date && a.driverId === driverId));
      if (!available) return rest;
      return [...rest, { date, driverId, ...(allSelected ? {} : { provinces }) }];
    });
    await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, driverId, available, provinces: allSelected ? undefined : provinces }),
    });
  }

  function toggleDay(date: string) {
    const on = Boolean(entryFor(date));
    if (on) {
      save(date, false, []);
    } else {
      save(date, true, defaultProvinces.length > 0 ? defaultProvinces : [...PROVINCES]);
    }
  }

  function toggleProvince(date: string, prov: string) {
    const current = provincesFor(date);
    const next = current.includes(prov) ? current.filter((p) => p !== prov) : [...current, prov];
    // laatste provincie uitgezet: dag gaat helemaal uit
    save(date, next.length > 0, next);
  }

  function toggleDefaultProvince(prov: string) {
    setDefaultProvinces((prev) =>
      prev.includes(prov) ? prev.filter((p) => p !== prov) : [...prev, prov]
    );
  }

  function fmtDay(date: string) {
    return new Date(date + "T00:00:00").toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="page">
      <h1>Beschikbaarheid</h1>
      <p className="subtitle">
        Vink de dagen aan waarop de chauffeur beschikbaar is en kies per dag de provincies. Klanten zien
        alleen dagen die voor hun provincie beschikbaar zijn (<code>/boeken</code>).
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <label className="field" style={{ margin: 0, minWidth: 220 }}>
          Chauffeur
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="field" style={{ margin: 0 }}>
          Periode
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            <option value={2}>2 weken</option>
            <option value={4}>4 weken</option>
            <option value={8}>8 weken</option>
          </select>
        </label>
      </div>

      <div className="default-provs">
        <div className="dp-label">
          Standaard provincies voor nieuwe dagen
          <span className="dp-actions">
            <button type="button" onClick={() => setDefaultProvinces([...PROVINCES])}>alles</button>
            <button type="button" onClick={() => setDefaultProvinces([])}>niets</button>
          </span>
        </div>
        <div className="pchips">
          {PROVINCES.map((p) => (
            <button
              key={p}
              type="button"
              className={`pchip ${defaultProvinces.includes(p) ? "on" : ""}`}
              onClick={() => toggleDefaultProvince(p)}
              title={p}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty">Laden...</div>
      ) : (
        <div className="avail-grid">
          {days.map((date) => {
            const on = Boolean(entryFor(date));
            const provs = provincesFor(date);
            const weekend = [0, 6].includes(new Date(date + "T00:00:00").getDay());
            return (
              <div key={date} className={`avail-day ${on ? "on" : ""} ${weekend ? "weekend" : ""}`}>
                <button type="button" className="avail-head" onClick={() => toggleDay(date)}>
                  <span className="d">{fmtDay(date)}</span>
                  <span className="s">
                    {on
                      ? provs.length === PROVINCES.length
                        ? "✓ Heel Nederland"
                        : `✓ ${provs.length} provincie${provs.length > 1 ? "s" : ""}`
                      : "Niet beschikbaar"}
                  </span>
                </button>
                {on && (
                  <div className="pchips small">
                    {PROVINCES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`pchip ${provs.includes(p) ? "on" : ""}`}
                        onClick={() => toggleProvince(date, p)}
                        title={p}
                      >
                        {PROV_SHORT[p]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
