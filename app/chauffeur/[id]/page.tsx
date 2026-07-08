"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  const [startOdometer, setStartOdometer] = useState("");
  const [endOdometer, setEndOdometer] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    fetch(`/api/routes/${id}`)
      .then((r) => r.json())
      .then((r: Route) => {
        setRoute(r);
        if (r.startOdometer != null) setStartOdometer(String(r.startOdometer));
        if (r.endOdometer != null) setEndOdometer(String(r.endOdometer));
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
    updateStop(stop.id, { status: "afgerond", completedAt: new Date().toISOString() });
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeId: id, event: "stop_completed", stopId: stop.id }),
    });
  }

  async function finishRoute() {
    if (!route) return;
    if (!endOdometer) {
      showFlash("Vul eerst de kilometerstand in.");
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

      {route.stops.map((s, i) => (
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
              {s.phone && (
                <a href={`tel:${s.phone}`} style={{ fontSize: 13, color: "var(--primary-dark)", fontWeight: 600 }}>
                  ✆ {s.phone}
                </a>
              )}
            </div>
          </div>

          {route.status === "onderweg" && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <label className="field" style={{ maxWidth: 240 }}>
                Ontvangen bedrag (EUR)
                <input
                  type="number"
                  step="0.01"
                  min="0"
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
                    style={{ flex: 1 }}
                    placeholder="Bijv. binnenband, materiaal..."
                    value={c.label}
                    onChange={(e) => updateCost(s, ci, { label: e.target.value })}
                  />
                  <input
                    className="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={c.amount || ""}
                    onChange={(e) => updateCost(s, ci, { amount: parseFloat(e.target.value) || 0 })}
                  />
                  <button className="icon-btn" onClick={() => removeCost(s, ci)}>✕</button>
                </div>
              ))}
              <button className="btn ghost small" onClick={() => addCost(s)}>+ Kostenpost</button>

              {s.status !== "afgerond" && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn small" onClick={() => completeStop(s)}>✓ Stop afronden</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

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
        </div>
      )}
    </div>
  );
}
