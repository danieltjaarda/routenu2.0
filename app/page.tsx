"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route, Driver } from "@/lib/types";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OverviewPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filterDate, setFilterDate] = useState("");

  // nieuw-route formulier
  const [date, setDate] = useState(todayStr());
  const [name, setName] = useState("");
  const [driverId, setDriverId] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [creating, setCreating] = useState(false);

  async function load() {
    const [r, d] = await Promise.all([
      fetch("/api/routes").then((x) => x.json()),
      fetch("/api/drivers").then((x) => x.json()),
    ]);
    setRoutes(r);
    setDrivers(d);
    if (d.length > 0) setDriverId((prev) => prev || d[0].id);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createRoute(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, name: name || undefined, driverId, startTime }),
    });
    const route = await res.json();
    router.push(`/planner/${route.id}`);
  }

  async function removeRoute(id: string) {
    if (!confirm("Route verwijderen?")) return;
    await fetch(`/api/routes/${id}`, { method: "DELETE" });
    setRoutes((rs) => rs.filter((r) => r.id !== id));
  }

  const visible = filterDate ? routes.filter((r) => r.date === filterDate) : routes;
  const grouped = visible.reduce<Record<string, Route[]>>((acc, r) => {
    (acc[r.date] ??= []).push(r);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort().reverse();

  function driverName(id?: string) {
    return drivers.find((d) => d.id === id)?.name ?? "-";
  }

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Route-overzicht</h1>
          <p className="subtitle">Maak routes aan per datum en open de planner om stops toe te voegen.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          {filterDate && (
            <button className="btn ghost small" onClick={() => setFilterDate("")}>Wis filter</button>
          )}
          <button className="btn" onClick={() => setShowNew(true)}>+ Nieuwe route</button>
        </div>
      </div>

      {loading ? (
        <div className="empty">Laden...</div>
      ) : dates.length === 0 ? (
        <div className="empty">Nog geen routes. Maak je eerste route aan.</div>
      ) : (
        dates.map((d) => (
          <div key={d} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, color: "var(--dark)", margin: "0 0 10px" }}>{fmtDate(d)}</h2>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Chauffeur</th>
                    <th>Stops</th>
                    <th>Afstand</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[d].map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: "var(--dark)" }}>
                        <Link href={`/planner/${r.id}`}>{r.name}</Link>
                      </td>
                      <td>{driverName(r.driverId)}</td>
                      <td>{r.stops.length}</td>
                      <td>{r.distanceKm ? `${r.distanceKm.toFixed(1)} km` : "-"}</td>
                      <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <Link href={`/planner/${r.id}`} className="btn ghost small" style={{ marginRight: 8 }}>
                          Plannen
                        </Link>
                        <button className="icon-btn" title="Verwijderen" onClick={() => removeRoute(r.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {showNew && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={createRoute}>
            <button type="button" className="close" onClick={() => setShowNew(false)}>✕</button>
            <h2>Nieuwe route</h2>
            <label className="field">
              Datum <span className="req">*</span>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              Naam
              <input placeholder={`Route voor ${date}`} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              Chauffeur
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Starttijd
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <button className="btn block" disabled={creating}>
              {creating ? "Aanmaken..." : "Route aanmaken en plannen"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
