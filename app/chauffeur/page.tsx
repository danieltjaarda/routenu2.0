"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route, Driver } from "@/lib/types";

export default function DriverOverviewPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/routes").then((r) => r.json()),
      fetch("/api/drivers").then((r) => r.json()),
    ]).then(([r, d]) => {
      setRoutes(r);
      setDrivers(d);
      if (d.length > 0) setDriverId(d[0].id);
      setLoading(false);
    });
  }, []);

  const myRoutes = routes
    .filter((r) => r.driverId === driverId && r.status !== "afgerond")
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <div className="page">
      <h1>Chauffeur</h1>
      <p className="subtitle">Kies je naam en open je route om te starten.</p>

      <label className="field" style={{ maxWidth: 320 }}>
        Chauffeur
        <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      {loading ? (
        <div className="empty">Laden...</div>
      ) : myRoutes.length === 0 ? (
        <div className="empty">Geen openstaande routes voor deze chauffeur.</div>
      ) : (
        myRoutes.map((r) => (
          <Link key={r.id} href={`/chauffeur/${r.id}`}>
            <div className="card" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--dark)" }}>{r.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                  {new Date(r.date + "T00:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
                  {" · "}{r.stops.length} stops
                  {r.distanceKm ? ` · ${r.distanceKm.toFixed(1)} km` : ""}
                </div>
              </div>
              <span className={`badge ${r.status}`}>{r.status}</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
