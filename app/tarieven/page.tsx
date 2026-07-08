"use client";

import { useEffect, useState } from "react";
import type { RepairService } from "@/lib/catalog";

export default function TarievenPage() {
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((s) => {
        setServices(s);
        setLoading(false);
      });
  }, []);

  function updatePrice(slug: string, price: string) {
    setServices((prev) =>
      prev.map((s) => (s.slug === slug ? { ...s, price: parseFloat(price) || 0 } : s))
    );
  }

  function updateSub(slug: string, sub: string) {
    setServices((prev) => prev.map((s) => (s.slug === slug ? { ...s, sub } : s)));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(services),
      });
      setFlash("Tarieven opgeslagen. De boekingspagina gebruikt direct de nieuwe prijzen.");
      setTimeout(() => setFlash(""), 4000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Tarieven</h1>
          <p className="subtitle">
            Pas hier de prijzen van de reparaties aan. Deze prijzen ziet de klant op de boekingspagina.
          </p>
        </div>
        <button className="btn" onClick={save} disabled={saving || loading}>
          {saving ? "Opslaan..." : "Tarieven opslaan"}
        </button>
      </div>

      {flash && <div className="notice" style={{ background: "#e3f8ef", borderColor: "#b8ebd4", color: "#1c9e6d" }}>{flash}</div>}

      {loading ? (
        <div className="empty">Laden...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 56 }}></th>
                <th>Reparatie</th>
                <th>Omschrijving</th>
                <th style={{ width: 130 }}>Prijs (EUR)</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.slug}>
                  <td>
                    {s.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.image}
                        alt=""
                        style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8, background: "var(--bg)" }}
                      />
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--dark)" }}>{s.name}</td>
                  <td>
                    <input
                      style={{ width: "100%", fontSize: 13 }}
                      value={s.sub}
                      onChange={(e) => updateSub(s.slug, e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={{ width: 110 }}
                      value={s.price}
                      onChange={(e) => updatePrice(s.slug, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={save} disabled={saving || loading}>
          {saving ? "Opslaan..." : "Tarieven opslaan"}
        </button>
      </div>
    </div>
  );
}
