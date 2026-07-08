"use client";

import { useState } from "react";
import AddressSearch from "./AddressSearch";
import type { Stop, StopType } from "@/lib/types";

interface Props {
  initial?: Stop;
  onSave: (stop: Stop) => void;
  onClose: () => void;
}

const TYPES: { value: StopType; label: string }[] = [
  { value: "bezorgen", label: "Bezorgen" },
  { value: "ophalen", label: "Ophalen" },
  { value: "zending", label: "Zending" },
];

export default function StopModal({ initial, onSave, onClose }: Props) {
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(
    initial ? { lng: initial.lng, lat: initial.lat } : null
  );
  const [type, setType] = useState<StopType>(initial?.type ?? "bezorgen");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [amountDue, setAmountDue] = useState(initial?.amountDue?.toString() ?? "");
  const [serviceMinutes, setServiceMinutes] = useState(initial?.serviceMinutes?.toString() ?? "30");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) return setError("Vul een naam in.");
    if (!coords) return setError("Zoek en selecteer een adres via de zoekknop.");
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      customerName: customerName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address,
      lng: coords.lng,
      lat: coords.lat,
      type,
      notes: notes.trim() || undefined,
      amountDue: amountDue ? parseFloat(amountDue) : undefined,
      serviceMinutes: serviceMinutes ? parseInt(serviceMinutes) : 30,
      status: initial?.status ?? "open",
      receivedAmount: initial?.receivedAmount,
      costs: initial?.costs,
      etaMinutes: initial?.etaMinutes,
      completedAt: initial?.completedAt,
    });
  }

  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <button type="button" className="close" onClick={onClose}>✕</button>
        <h2>{initial ? "Stop bewerken" : "Stop toevoegen"}</h2>

        <h3>Klant informatie</h3>
        <label className="field">
          Volledige naam <span className="req">*</span>
          <input placeholder="Bijv. Jan Jansen" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </label>
        <label className="field">
          E-mailadres
          <input type="email" placeholder="bijv. jan@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          Telefoonnummer
          <input placeholder="Bijv. 0612345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>

        <h3>Adres</h3>
        <label className="field">
          Adres <span className="req">*</span>
        </label>
        <AddressSearch
          value={address}
          onChange={(v) => {
            setAddress(v);
            setCoords(null);
          }}
          onSelect={(r) => {
            setAddress(r.address);
            setCoords({ lng: r.lng, lat: r.lat });
          }}
        />
        {coords && <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6 }}>✓ Adres gevonden</div>}

        <h3>Soort opdracht</h3>
        {TYPES.map((t) => (
          <label key={t.value} className={`type-option ${type === t.value ? "selected" : ""}`}>
            <input type="radio" name="type" checked={type === t.value} onChange={() => setType(t.value)} />
            {t.label}
          </label>
        ))}

        <h3>Details</h3>
        <label className="field">
          Omschrijving / opdracht
          <textarea rows={2} placeholder="Bijv. Lekke band reparatie normale fiets" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <label className="field" style={{ flex: 1 }}>
            Te ontvangen bedrag (EUR)
            <input type="number" step="0.01" min="0" placeholder="0.00" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            Tijd op locatie (min)
            <input type="number" min="0" value={serviceMinutes} onChange={(e) => setServiceMinutes(e.target.value)} />
          </label>
        </div>

        {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn block">{initial ? "Opslaan" : "Stop toevoegen"}</button>
      </form>
    </div>
  );
}
