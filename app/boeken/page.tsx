"use client";

import { useEffect, useMemo, useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import { BRANDS, REPAIRS, type BikeBrand } from "@/lib/catalog";
import type { Availability } from "@/lib/types";

const STEPS = ["Merk", "Model", "Reparatie", "Datum", "Gegevens"] as const;

export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [availability, setAvailability] = useState<Availability[]>([]);

  const [brand, setBrand] = useState<BikeBrand | null>(null);
  const [model, setModel] = useState("");
  const [repair, setRepair] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/availability?future=1")
      .then((r) => r.json())
      .then(setAvailability);
  }, []);

  const availableDates = useMemo(() => {
    const unique = [...new Set(availability.map((a) => a.date))];
    return unique.sort();
  }, [availability]);

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function next() {
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  function chooseBrand(b: BikeBrand) {
    setBrand(b);
    setModel("");
    next();
  }

  async function submit() {
    setError("");
    if (!customerName.trim()) return setError("Vul uw naam in.");
    if (!email.trim() && !phone.trim()) return setError("Vul een e-mailadres of telefoonnummer in.");
    if (!coords) return setError("Kies uw adres uit de suggesties.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          customerName: customerName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address,
          lng: coords.lng,
          lat: coords.lat,
          brand: brand?.name,
          model: model || undefined,
          repair: REPAIRS.find((r) => r.id === repair)?.name ?? repair,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Er ging iets mis. Probeer het opnieuw.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <h1 style={{ marginTop: 12 }}>Aanmelding gelukt!</h1>
          <p style={{ color: "var(--muted)" }}>
            Uw reparatie is ingepland op <strong>{fmtDate(date)}</strong>.<br />
            U ontvangt een bevestiging{email && phone ? " per e-mail en WhatsApp" : email ? " per e-mail" : " per WhatsApp"} met later ook het verwachte tijdvak.
          </p>
          <button
            className="btn"
            onClick={() => {
              setDone(false);
              setStep(0);
              setBrand(null);
              setModel("");
              setRepair("");
              setDescription("");
              setDate("");
              setCustomerName("");
              setEmail("");
              setPhone("");
              setAddress("");
              setCoords(null);
            }}
          >
            Nog een aanmelding doen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h1>Reparatie aanmelden</h1>
      <p className="subtitle">Meld uw fatbike aan voor reparatie aan huis, in een paar stappen.</p>

      {/* stappenbalk */}
      <div className="steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
            <span className="n">{i < step ? "✓" : i + 1}</span>
            <span className="l">{label}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        {step === 0 && (
          <>
            <h3 style={{ marginTop: 0 }}>Welk merk fatbike heeft u?</h3>
            <div className="brand-grid">
              {BRANDS.map((b) => (
                <button key={b.id} className="brand-card" onClick={() => chooseBrand(b)}>
                  {b.name}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && brand && (
          <>
            <h3 style={{ marginTop: 0 }}>
              {brand.freeModel ? `Welk model ${brand.name === "Overig" ? "en merk" : brand.name} heeft u?` : `Welk model ${brand.name} heeft u?`}
            </h3>
            {brand.freeModel ? (
              <>
                <label className="field">
                  Model
                  <input
                    placeholder={brand.name === "Engwe" ? "Bijv. Engine Pro, EP-2 Pro..." : "Bijv. merk + model"}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </label>
                <div className="wizard-nav">
                  <button className="btn ghost" onClick={back}>← Terug</button>
                  <button className="btn" onClick={next} disabled={!model.trim()}>Volgende →</button>
                </div>
              </>
            ) : (
              <>
                <div className="model-grid">
                  {brand.models.map((m) => (
                    <button
                      key={m.id}
                      className={`model-card ${model === m.name ? "selected" : ""}`}
                      onClick={() => {
                        setModel(m.name);
                        next();
                      }}
                    >
                      <span className="img">
                        {m.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.image}
                            alt={m.name}
                            onError={(e) => {
                              (e.currentTarget.style.display = "none");
                              e.currentTarget.parentElement!.classList.add("placeholder");
                            }}
                          />
                        ) : null}
                        <span className="fallback">🚲</span>
                      </span>
                      <span className="name">{m.name}</span>
                    </button>
                  ))}
                </div>
                <div className="wizard-nav">
                  <button className="btn ghost" onClick={back}>← Terug</button>
                </div>
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ marginTop: 0 }}>Wat voor reparatie heeft u nodig?</h3>
            {REPAIRS.map((r) => (
              <label key={r.id} className={`type-option ${repair === r.id ? "selected" : ""}`}>
                <input type="radio" name="repair" checked={repair === r.id} onChange={() => setRepair(r.id)} />
                {r.name}
              </label>
            ))}
            <label className="field" style={{ marginTop: 12 }}>
              Toelichting {repair === "anders" ? <span className="req">*</span> : "(optioneel)"}
              <textarea
                rows={2}
                placeholder="Omschrijf het probleem..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="wizard-nav">
              <button className="btn ghost" onClick={back}>← Terug</button>
              <button
                className="btn"
                onClick={next}
                disabled={!repair || (repair === "anders" && !description.trim())}
              >
                Volgende →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 style={{ marginTop: 0 }}>Kies een dag</h3>
            {availableDates.length === 0 ? (
              <div className="notice">
                Er zijn op dit moment geen dagen beschikbaar. Probeer het later opnieuw.
              </div>
            ) : (
              <div className="date-grid">
                {availableDates.map((d) => (
                  <button
                    key={d}
                    className={`date-card ${date === d ? "selected" : ""}`}
                    onClick={() => {
                      setDate(d);
                      next();
                    }}
                  >
                    {fmtDate(d)}
                  </button>
                ))}
              </div>
            )}
            <div className="wizard-nav">
              <button className="btn ghost" onClick={back}>← Terug</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3 style={{ marginTop: 0 }}>Uw gegevens</h3>
            <div className="notice" style={{ background: "#eef9fc", borderColor: "#c8ecf5", color: "#1a7a94" }}>
              {brand?.name} {model} · {REPAIRS.find((r) => r.id === repair)?.name} · {fmtDate(date)}
            </div>
            <label className="field">
              Volledige naam <span className="req">*</span>
              <input placeholder="Bijv. Jan Jansen" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </label>
            <label className="field">
              E-mailadres
              <input type="email" placeholder="bijv. jan@voorbeeld.nl" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              Telefoonnummer (WhatsApp)
              <input placeholder="Bijv. 0612345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="field">Adres <span className="req">*</span></label>
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

            {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</div>}
            <div className="wizard-nav">
              <button className="btn ghost" onClick={back}>← Terug</button>
              <button className="btn" onClick={submit} disabled={submitting}>
                {submitting ? "Versturen..." : "Aanmelding versturen"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
