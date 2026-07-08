"use client";

import { useEffect, useMemo, useState } from "react";
import type { Driver, Availability } from "@/lib/types";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AvailabilityPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState(4);

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

  function isAvailable(date: string) {
    return availability.some((a) => a.date === date && a.driverId === driverId);
  }

  async function toggle(date: string) {
    const available = !isAvailable(date);
    setAvailability((prev) =>
      available
        ? [...prev, { date, driverId }]
        : prev.filter((a) => !(a.date === date && a.driverId === driverId))
    );
    await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, driverId, available }),
    });
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
        Vink de dagen aan waarop de chauffeur beschikbaar is. Klanten kunnen zich alleen op deze dagen
        aanmelden via de boekingspagina (<code>/boeken</code>).
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
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

      {loading ? (
        <div className="empty">Laden...</div>
      ) : (
        <div className="avail-grid">
          {days.map((date) => {
            const on = isAvailable(date);
            const weekend = [0, 6].includes(new Date(date + "T00:00:00").getDay());
            return (
              <button
                key={date}
                className={`avail-day ${on ? "on" : ""} ${weekend ? "weekend" : ""}`}
                onClick={() => toggle(date)}
              >
                <span className="d">{fmtDay(date)}</span>
                <span className="s">{on ? "✓ Beschikbaar" : "Niet beschikbaar"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
