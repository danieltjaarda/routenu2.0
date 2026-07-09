"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MapView from "@/components/MapView";
import type { Route, Stop, CostItem } from "@/lib/types";

function fmtTime(startTime: string, offsetMin: number) {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + offsetMin;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function DriverRoutePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [route, setRoute] = useState<Route | null>(null);
  const [current, setCurrent] = useState(0);
  const [startOdometer, setStartOdometer] = useState("");
  const [endOdometer, setEndOdometer] = useState("");
  const [workedHours, setWorkedHours] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    fetch(`/api/routes/${id}`)
      .then((r) => r.json())
      .then((r: Route) => {
        setRoute(r);
        const firstOpen = r.stops.findIndex((s) => s.status === "open");
        setCurrent(firstOpen === -1 ? Math.max(0, r.stops.length - 1) : firstOpen);
        if (r.startOdometer != null) setStartOdometer(String(r.startOdometer));
        if (r.endOdometer != null) setEndOdometer(String(r.endOdometer));
        if (r.workedHours != null) setWorkedHours(String(r.workedHours));
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

  async function startRoute() {
    if (!route) return;
    setBusy(true);
    try {
      await persist({
        ...route,
        status: "onderweg",
        startedAt: new Date().toISOString(),
        startOdometer: startOdometer ? parseFloat(startOdometer) : undefined,
      });
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id, event: "started" }),
      });
      const data = await res.json();
      showFlash(`Route gestart. Klanten geïnformeerd (${data.sent} webhooks verzonden).`);
    } finally {
      setBusy(false);
    }
  }

  function updateStop(stopId: string, patch: Partial<Stop>) {
    if (!route) return;
    const stops = route.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s));
    persist({ ...route, stops });
  }

  function addCost(stop: Stop) {
    updateStop(stop.id, { costs: [...(stop.costs ?? []), { label: "", amount: 0 }] });
  }

  function updateCost(stop: Stop, idx: number, patch: Partial<CostItem>) {
    const costs = (stop.costs ?? []).map((c, i) => (i === idx ? { ...c, ...patch } : c));
    updateStop(stop.id, { costs });
  }

  function removeCost(stop: Stop, idx: number) {
    updateStop(stop.id, { costs: (stop.costs ?? []).filter((_, i) => i !== idx) });
  }

  async function completeStop(stop: Stop) {
    if (!route) return;
    const stops = route.stops.map((s) =>
      s.id === stop.id ? { ...s, status: "afgerond" as const, completedAt: new Date().toISOString() } : s
    );
    persist({ ...route, stops });
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeId: id, event: "stop_completed", stopId: stop.id }),
    });
    // automatisch door naar de volgende open stop
    const next = stops.findIndex((s, i) => i > current && s.status === "open");
    const anyOpen = stops.findIndex((s) => s.status === "open");
    if (next !== -1) setCurrent(next);
    else if (anyOpen !== -1) setCurrent(anyOpen);
  }

  /** Opent Apple Kaarten (iPhone) of Google Maps (Android) met het adres als bestemming */
  function mapsUrl(address: string) {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;
  }

  async function finishRoute() {
    if (!route) return;
    if (!endOdometer) {
      showFlash("Vul eerst de kilometerstand in.");
      return;
    }
    if (!workedHours) {
      showFlash("Vul eerst je gewerkte uren in.");
      return;
    }
    setBusy(true);
    try {
      await persist({
        ...route,
        status: "afgerond",
        completedAt: new Date().toISOString(),
        endOdometer: parseFloat(endOdometer),
        startOdometer: startOdometer ? parseFloat(startOdometer) : route.startOdometer,
        workedHours: parseFloat(workedHours.replace(",", ".")),
      });
      router.push("/analytics");
    } finally {
      setBusy(false);
    }
  }

  if (!route) return <div className="empty">Laden...</div>;

  const openStops = route.stops.filter((s) => s.status === "open").length;
  const totalReceived = route.stops.reduce((sum, s) => sum + (s.receivedAmount ?? 0), 0);
  const totalCosts = route.stops.reduce(
    (sum, s) => sum + (s.costs ?? []).reduce((c, x) => c + (x.amount || 0), 0),
    0
  );

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <h1>{route.name}</h1>
      <p className="subtitle">
        {new Date(route.date + "T00:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        {" · "}{route.stops.length} stops
        {route.distanceKm ? ` · ${route.distanceKm.toFixed(1)} km gepland` : ""}
      </p>

      {flash && <div className="notice">{flash}</div>}

      {route.stops.length > 0 && (
        <button className="btn ghost block" style={{ marginBottom: 16 }} onClick={() => setShowMap(true)}>
          🗺 Bekijk kaart met alle stops
        </button>
      )}

      {showMap && (
        <div className="map-overlay">
          <div className="map-overlay-head">
            <strong>{route.name} · {route.stops.length} stops</strong>
            <button className="icon-btn big" onClick={() => setShowMap(false)}>✕</button>
          </div>
          <div className="map-overlay-body">
            <MapView startLng={route.startLng} startLat={route.startLat} stops={route.stops} geometry={route.geometry} />
          </div>
        </div>
      )}

      {route.status === "gepland" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Route starten</h3>
          <label className="field" style={{ maxWidth: 260 }}>
            Kilometerstand bij start (optioneel)
            <input type="number" min="0" placeholder="Bijv. 123456" value={startOdometer} onChange={(e) => setStartOdometer(e.target.value)} />
          </label>
          <button className="btn" onClick={startRoute} disabled={busy}>
            {busy ? "Starten..." : "▶ Route starten"}
          </button>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            Bij het starten worden alle klanten automatisch geïnformeerd via de webhook.
          </div>
        </div>
      )}

      {route.status !== "gepland" && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Ontvangen</div>
            <div className="value">€ {totalReceived.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Kosten</div>
            <div className="value">€ {totalCosts.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Open stops</div>
            <div className="value">{openStops}</div>
          </div>
        </div>
      )}

      {route.status !== "onderweg" &&
        route.stops.map((s, i) => (
          <div key={s.id} className={`driver-stop ${s.status === "afgerond" ? "done" : ""}`}>
            <div className="head">
              <div className="num" style={{ width: 28, height: 28, borderRadius: "50%", background: s.status === "afgerond" ? "var(--success)" : "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flex: "none" }}>
                {s.status === "afgerond" ? "✓" : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--dark)" }}>{s.notes || s.customerName}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                  {s.customerName} · {s.address}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {s.etaMinutes != null && <>Gepland: {fmtTime(route.startTime, s.etaMinutes)}{" · "}</>}
                  <span className={`badge ${s.type}`}>{s.type}</span>
                  {s.amountDue != null && <> · Te ontvangen: € {s.amountDue.toFixed(2)}</>}
                </div>
              </div>
            </div>
          </div>
        ))}

      {route.status === "onderweg" && route.stops.length > 0 && (() => {
        const s = route.stops[Math.min(current, route.stops.length - 1)];
        const i = route.stops.indexOf(s);
        const doneCount = route.stops.filter((x) => x.status === "afgerond").length;
        return (
          <div className="driver-step">
            <div className="step-progress">
              <div className="step-progress-text">
                Stop {i + 1} van {route.stops.length} · {doneCount} afgerond
              </div>
              <div className="step-progress-bar">
                <div style={{ width: `${(doneCount / route.stops.length) * 100}%` }} />
              </div>
            </div>

            <div className="step-nav">
              <button className="icon-btn big" disabled={i === 0} onClick={() => setCurrent(i - 1)}>←</button>
              <div className="step-dots">
                {route.stops.map((x, xi) => (
                  <button
                    key={x.id}
                    className={`step-dot ${xi === i ? "active" : ""} ${x.status === "afgerond" ? "done" : ""}`}
                    onClick={() => setCurrent(xi)}
                  >
                    {x.status === "afgerond" ? "✓" : xi + 1}
                  </button>
                ))}
              </div>
              <button className="icon-btn big" disabled={i === route.stops.length - 1} onClick={() => setCurrent(i + 1)}>→</button>
            </div>

            <div className={`card stop-focus ${s.status === "afgerond" ? "done" : ""}`}>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>
                {s.status === "afgerond" ? "✓ Afgerond" : `Stop ${i + 1}`}
                {s.etaMinutes != null && <> · gepland {fmtTime(route.startTime, s.etaMinutes)}</>}
              </div>
              <h2 style={{ margin: "6px 0 2px" }}>{s.notes || s.customerName}</h2>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>{s.customerName}</div>
              <div style={{ fontSize: 15, color: "var(--dark)", marginTop: 8 }}>{s.address}</div>
              {s.amountDue != null && (
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dark)", marginTop: 8 }}>
                  Te ontvangen: € {s.amountDue.toFixed(2)}
                </div>
              )}

              <div className="stop-actions">
                <a className="btn block" href={mapsUrl(s.address)} target="_blank" rel="noopener noreferrer">
                  🗺 Navigeer (Kaarten)
                </a>
                {s.phone && (
                  <a className="btn ghost block" href={`tel:${s.phone}`}>✆ Bel klant</a>
                )}
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <label className="field">
                  Ontvangen bedrag (EUR)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={s.receivedAmount ?? ""}
                    onChange={(e) =>
                      updateStop(s.id, { receivedAmount: e.target.value === "" ? undefined : parseFloat(e.target.value) })
                    }
                  />
                </label>

                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Kosten onderdelen</div>
                {(s.costs ?? []).map((c, ci) => (
                  <div className="cost-row" key={ci}>
                    <input
                      style={{ flex: 1, minWidth: 0 }}
                      placeholder="Bijv. binnenband..."
                      value={c.label}
                      onChange={(e) => updateCost(s, ci, { label: e.target.value })}
                    />
                    <input
                      className="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={c.amount || ""}
                      onChange={(e) => updateCost(s, ci, { amount: parseFloat(e.target.value) || 0 })}
                    />
                    <button className="icon-btn" onClick={() => removeCost(s, ci)}>✕</button>
                  </div>
                ))}
                <button className="btn ghost small" onClick={() => addCost(s)}>+ Kostenpost</button>

                {s.status !== "afgerond" && (
                  <button className="btn block" style={{ marginTop: 14 }} onClick={() => completeStop(s)}>
                    ✓ Stop afronden
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {route.status === "onderweg" && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Route afronden</h3>
          {openStops > 0 && (
            <div className="notice">Er zijn nog {openStops} open stops. Je kunt de route toch afronden.</div>
          )}
          <label className="field" style={{ maxWidth: 260 }}>
            Kilometerstand einde rit <span className="req">*</span>
            <input type="number" min="0" placeholder="Bijv. 123789" value={endOdometer} onChange={(e) => setEndOdometer(e.target.value)} />
          </label>
          <label className="field" style={{ maxWidth: 260 }}>
            Gewerkte uren <span className="req">*</span>
            <input type="number" min="0" step="0.5" placeholder="Bijv. 7,5" value={workedHours} onChange={(e) => setWorkedHours(e.target.value)} />
          </label>
          <button className="btn secondary" onClick={finishRoute} disabled={busy}>
            {busy ? "Afronden..." : "Route afronden"}
          </button>
        </div>
      )}

      {route.status === "afgerond" && (
        <div className="card" style={{ marginTop: 24, borderColor: "var(--success)" }}>
          <strong style={{ color: "var(--success)" }}>✓ Route afgerond</strong>
          {route.startOdometer != null && route.endOdometer != null && (
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
              Gereden: {(route.endOdometer - route.startOdometer).toFixed(0)} km
              ({route.startOdometer} → {route.endOdometer})
            </div>
          )}
          {route.workedHours != null && (
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
              Gewerkte uren: {String(route.workedHours).replace(".", ",")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
