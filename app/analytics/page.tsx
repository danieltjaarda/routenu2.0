"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route, Driver } from "@/lib/types";

function routeRevenue(r: Route) {
  return r.stops.reduce((sum, s) => sum + (s.receivedAmount ?? 0), 0);
}
function routeCosts(r: Route) {
  return r.stops.reduce((sum, s) => sum + (s.costs ?? []).reduce((c, x) => c + (x.amount || 0), 0), 0);
}
function routeKm(r: Route) {
  if (r.startOdometer != null && r.endOdometer != null) return r.endOdometer - r.startOdometer;
  return r.distanceKm ?? 0;
}

export default function AnalyticsPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/routes").then((r) => r.json()),
      fetch("/api/drivers").then((r) => r.json()),
    ]).then(([r, d]) => {
      setRoutes(r);
      setDrivers(d);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(
    () =>
      routes
        .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [routes, from, to]
  );

  const totals = useMemo(() => {
    const revenue = filtered.reduce((s, r) => s + routeRevenue(r), 0);
    const costs = filtered.reduce((s, r) => s + routeCosts(r), 0);
    const km = filtered.reduce((s, r) => s + routeKm(r), 0);
    const hours = filtered.reduce((s, r) => s + (r.workedHours ?? 0), 0);
    const stopsDone = filtered.reduce((s, r) => s + r.stops.filter((x) => x.status === "afgerond").length, 0);
    const stopsTotal = filtered.reduce((s, r) => s + r.stops.length, 0);
    return { revenue, costs, km, hours, stopsDone, stopsTotal, profit: revenue - costs };
  }, [filtered]);

  const perDriver = useMemo(() => {
    const map = new Map<string, { revenue: number; costs: number; routes: number; km: number; hours: number }>();
    for (const r of filtered) {
      const key = r.driverId ?? "-";
      const entry = map.get(key) ?? { revenue: 0, costs: 0, routes: 0, km: 0, hours: 0 };
      entry.revenue += routeRevenue(r);
      entry.costs += routeCosts(r);
      entry.km += routeKm(r);
      entry.hours += r.workedHours ?? 0;
      entry.routes += 1;
      map.set(key, entry);
    }
    return map;
  }, [filtered]);

  function driverName(id?: string) {
    return drivers.find((d) => d.id === id)?.name ?? "Onbekend";
  }

  const eur = (n: number) => `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Analytics</h1>
          <p className="subtitle">Omzet, kosten en kilometers per route en per chauffeur.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <span>Van</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span>t/m</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          {(from || to) && (
            <button className="btn ghost small" onClick={() => { setFrom(""); setTo(""); }}>Wis</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="empty">Laden...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Totale omzet</div>
              <div className="value">{eur(totals.revenue)}</div>
              <div className="sub">{filtered.length} routes</div>
            </div>
            <div className="stat-card">
              <div className="label">Totale kosten</div>
              <div className="value">{eur(totals.costs)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Resultaat</div>
              <div className="value" style={{ color: totals.profit >= 0 ? "var(--success)" : "var(--danger)" }}>
                {eur(totals.profit)}
              </div>
              <div className="sub">omzet - kosten</div>
            </div>
            <div className="stat-card">
              <div className="label">Kilometers</div>
              <div className="value">{totals.km.toFixed(0)} km</div>
              <div className="sub">o.b.v. kilometerstanden</div>
            </div>
            <div className="stat-card">
              <div className="label">Gewerkte uren</div>
              <div className="value">{totals.hours.toLocaleString("nl-NL")} uur</div>
              <div className="sub">ingevuld door chauffeurs</div>
            </div>
            <div className="stat-card">
              <div className="label">Stops afgerond</div>
              <div className="value">{totals.stopsDone} / {totals.stopsTotal}</div>
            </div>
          </div>

          <h2 style={{ fontSize: 16, color: "var(--dark)" }}>Per chauffeur</h2>
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 28 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Chauffeur</th>
                  <th>Routes</th>
                  <th>Kilometers</th>
                  <th>Uren</th>
                  <th>Omzet</th>
                  <th>Kosten</th>
                  <th>Resultaat</th>
                </tr>
              </thead>
              <tbody>
                {[...perDriver.entries()].map(([id, v]) => (
                  <tr key={id}>
                    <td style={{ fontWeight: 600, color: "var(--dark)" }}>{driverName(id)}</td>
                    <td>{v.routes}</td>
                    <td>{v.km.toFixed(0)} km</td>
                    <td>{v.hours ? `${v.hours.toLocaleString("nl-NL")} uur` : "-"}</td>
                    <td>{eur(v.revenue)}</td>
                    <td>{eur(v.costs)}</td>
                    <td style={{ fontWeight: 600 }}>{eur(v.revenue - v.costs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 16, color: "var(--dark)" }}>Per route</h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Route</th>
                  <th>Chauffeur</th>
                  <th>Stops</th>
                  <th>Kilometers</th>
                  <th>Uren</th>
                  <th>Omzet</th>
                  <th>Kosten</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="empty">Geen routes in deze periode.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.date + "T00:00:00").toLocaleDateString("nl-NL")}</td>
                    <td style={{ fontWeight: 600, color: "var(--dark)" }}>
                      <Link href={`/planner/${r.id}`}>{r.name}</Link>
                    </td>
                    <td>{driverName(r.driverId)}</td>
                    <td>{r.stops.filter((s) => s.status === "afgerond").length} / {r.stops.length}</td>
                    <td>{routeKm(r) ? `${routeKm(r).toFixed(0)} km` : "-"}</td>
                    <td>{r.workedHours != null ? `${r.workedHours.toLocaleString("nl-NL")} uur` : "-"}</td>
                    <td>{eur(routeRevenue(r))}</td>
                    <td>{eur(routeCosts(r))}</td>
                    <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
