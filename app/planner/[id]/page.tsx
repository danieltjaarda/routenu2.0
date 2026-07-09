"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import MapView from "@/components/MapView";
import StopModal from "@/components/StopModal";
import AddressSearch from "@/components/AddressSearch";
import type { Route, Stop, Driver } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function fmtTime(startTime: string, offsetMin: number) {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + offsetMin;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function PlannerPage() {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [modalStop, setModalStop] = useState<Stop | "new" | null>(null);
  const [showStartEdit, setShowStartEdit] = useState(false);
  const [startQuery, setStartQuery] = useState("");
  const [search, setSearch] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [informing, setInforming] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/routes/${id}`).then((r) => r.json()),
      fetch("/api/drivers").then((r) => r.json()),
    ]).then(([r, d]) => {
      setRoute(r);
      setDrivers(d);
      setStartQuery(r.startAddress ?? "");
    });
  }, [id]);

  async function persist(updated: Route) {
    setRoute(updated);
    await fetch(`/api/routes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(""), 4000);
  }

  async function saveStop(stop: Stop) {
    if (!route) return;
    const exists = route.stops.some((s) => s.id === stop.id);
    const stops = exists ? route.stops.map((s) => (s.id === stop.id ? stop : s)) : [...route.stops, stop];
    // route is niet meer actueel na wijziging stops
    await persist({ ...route, stops, geometry: undefined, distanceKm: undefined, durationMinutes: undefined });
    setModalStop(null);

    // nieuwe stop: klant direct informeren via webhook
    if (!exists && (stop.email || stop.phone)) {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id, event: "stop_added", stopId: stop.id }),
      });
      const data = await res.json();
      showFlash(
        data.sent > 0
          ? `Stop toegevoegd. Klant geïnformeerd (${data.sent} webhook${data.sent > 1 ? "s" : ""} verzonden).`
          : "Stop toegevoegd, maar webhook versturen mislukt."
      );
    }
  }

  function removeStop(stopId: string) {
    if (!route) return;
    persist({ ...route, stops: route.stops.filter((s) => s.id !== stopId), geometry: undefined });
  }

  function moveStop(idx: number, dir: -1 | 1) {
    if (!route) return;
    const stops = [...route.stops];
    const target = idx + dir;
    if (target < 0 || target >= stops.length) return;
    [stops[idx], stops[target]] = [stops[target], stops[idx]];
    persist({ ...route, stops, geometry: undefined });
  }

  function reverseStops() {
    if (!route) return;
    persist({ ...route, stops: [...route.stops].reverse(), geometry: undefined });
  }

  async function calculate() {
    if (!route || route.stops.length === 0 || !TOKEN) return;
    setCalculating(true);
    try {
      // startadres is automatisch ook het eindadres (terugreis telt mee)
      const coords = [
        `${route.startLng},${route.startLat}`,
        ...route.stops.map((s) => `${s.lng},${s.lat}`),
        `${route.startLng},${route.startLat}`,
      ].join(";");
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes?.length) {
        showFlash("Geen route gevonden tussen de opgegeven punten.");
        return;
      }
      const r = data.routes[0];
      // Cumulatieve ETA per stop: rijtijd + tijd op locatie van voorgaande stops
      let cumulative = 0;
      const stops = route.stops.map((s, i) => {
        cumulative += r.legs[i].duration / 60;
        const eta = Math.round(cumulative);
        cumulative += s.serviceMinutes ?? 30;
        return { ...s, etaMinutes: eta };
      });
      // terugreis naar het startadres meetellen in de totale tijd
      cumulative += r.legs[r.legs.length - 1].duration / 60;
      await persist({
        ...route,
        stops,
        geometry: r.geometry.coordinates,
        distanceKm: r.distance / 1000,
        durationMinutes: Math.round(cumulative),
      });
      showFlash(`Route berekend: ${(r.distance / 1000).toFixed(1)} km`);
    } finally {
      setCalculating(false);
    }
  }

  async function informCustomers() {
    if (!route) return;
    setInforming(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id, event: "planned" }),
      });
      const data = await res.json();
      showFlash(`Webhooks verzonden: ${data.sent} gelukt, ${data.failed} mislukt.`);
    } finally {
      setInforming(false);
    }
  }

  const totalHours = useMemo(() => {
    if (!route?.durationMinutes) return null;
    const h = Math.floor(route.durationMinutes / 60);
    const m = route.durationMinutes % 60;
    return `${h}:${String(m).padStart(2, "0")} uur`;
  }, [route?.durationMinutes]);

  if (!route) return <div className="empty">Laden...</div>;

  const filteredStops = search
    ? route.stops.filter(
        (s) =>
          s.customerName.toLowerCase().includes(search.toLowerCase()) ||
          s.address.toLowerCase().includes(search.toLowerCase())
      )
    : route.stops;

  return (
    <div className="planner">
      {/* linker paneel */}
      <div className="sidebar">
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Route voor{" "}
          {new Date(route.date + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h2 style={{ marginTop: 6 }}>{route.name}</h2>

        <label className="field" style={{ marginTop: 14 }}>
          Chauffeur <span className="req">*</span>
          <select
            value={route.driverId ?? ""}
            onChange={(e) => persist({ ...route, driverId: e.target.value })}
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          Starttijd
          <input type="time" value={route.startTime} onChange={(e) => persist({ ...route, startTime: e.target.value })} />
        </label>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Startadres</div>
          {showStartEdit ? (
            <AddressSearch
              value={startQuery}
              onChange={setStartQuery}
              onSelect={(r) => {
                persist({ ...route, startAddress: r.address, startLng: r.lng, startLat: r.lat, geometry: undefined });
                setShowStartEdit(false);
              }}
            />
          ) : (
            <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ flex: 1 }}>{route.startAddress || "Nog geen startadres"}</span>
              <button className="icon-btn" title="Wijzig" onClick={() => setShowStartEdit(true)}>✎</button>
            </div>
          )}
        </div>

        <button className="btn block" onClick={() => setModalStop("new")}>+ Stop toevoegen</button>

        <h2>Stops in huidige route ({route.stops.length})</h2>
        <input
          placeholder="Zoek in stops..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        {filteredStops.map((s) => {
          const idx = route.stops.indexOf(s);
          return (
            <div className="stop-card" key={s.id}>
              <div className="num">{idx + 1}</div>
              <div className="info">
                <div className="name">{s.notes || s.customerName}</div>
                <div className="addr">{s.address}</div>
                <span className={`badge ${s.type}`}>{s.type}</span>
                {(s.email || s.phone) && (
                  <div className="contact">
                    {s.email && <div>✉ {s.email}</div>}
                    {s.phone && <div>✆ {s.phone}</div>}
                  </div>
                )}
              </div>
              <div className="btns">
                <button className="icon-btn" title="Omhoog" onClick={() => moveStop(idx, -1)}>↑</button>
                <button className="icon-btn" title="Omlaag" onClick={() => moveStop(idx, 1)}>↓</button>
                <button className="icon-btn" title="Bewerken" onClick={() => setModalStop(s)}>✎</button>
                <button className="icon-btn" title="Verwijderen" onClick={() => removeStop(s.id)}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* kaart */}
      <div className="map-area">
        <MapView startLng={route.startLng} startLat={route.startLat} stops={route.stops} geometry={route.geometry} />
        {flash && (
          <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", background: "var(--dark)", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13, zIndex: 20 }}>
            {flash}
          </div>
        )}
      </div>

      {/* rechter paneel */}
      <div className="rightbar">
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontWeight: 700, color: "var(--dark)" }}>Voertuigen</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            {route.distanceKm ? `${route.distanceKm.toFixed(1)} km` : "- km"}
            {totalHours ? `, ${totalHours}` : ""}
            {" · "}
            <span className={`badge ${route.status}`}>{route.status}</span>
          </div>
        </div>
        <div className="timeline">
          <div className="tl-item">
            <div className="time">{route.startTime}</div>
            <div className="dot start">S</div>
            <div className="body">
              <div className="title">Start adres</div>
              <div className="sub">{route.startAddress || "Nog niet ingesteld"}</div>
            </div>
          </div>
          {route.stops.map((s, i) => (
            <div className="tl-item" key={s.id}>
              <div className="time">
                {s.etaMinutes != null
                  ? `${fmtTime(route.startTime, s.etaMinutes)} - ${fmtTime(route.startTime, s.etaMinutes + (s.serviceMinutes ?? 30))}`
                  : "--:--"}
              </div>
              <div className={`dot ${s.status === "afgerond" ? "filled" : ""}`}>{s.status === "afgerond" ? "✓" : i + 1}</div>
              <div className="body">
                <div className="title">{s.notes || s.customerName}</div>
                <div className="sub">{s.address}</div>
                {s.amountDue != null && <div className="sub">Te ontvangen: € {s.amountDue.toFixed(2)}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="actions">
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" style={{ flex: 1 }} onClick={calculate} disabled={calculating || route.stops.length === 0}>
              {calculating ? "Berekenen..." : "Route berekenen"}
            </button>
            <button className="btn ghost small" onClick={reverseStops} title="Volgorde omdraaien">⇅ Omdraaien</button>
          </div>
          <button className="btn secondary block" onClick={informCustomers} disabled={informing || route.stops.length === 0}>
            {informing ? "Verzenden..." : "Klanten informeren"}
          </button>
        </div>
      </div>

      {modalStop && (
        <StopModal
          initial={modalStop === "new" ? undefined : modalStop}
          onSave={saveStop}
          onClose={() => setModalStop(null)}
        />
      )}
    </div>
  );
}
