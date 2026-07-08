"use client";

import { useEffect, useMemo, useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import { BRANDS, type BikeBrand, type RepairService } from "@/lib/catalog";
import type { Availability } from "@/lib/types";

const STEPS = ["Merk", "Model", "Reparatie", "Datum", "Gegevens"] as const;

function fmtPrice(n: number) {
  return n % 1 === 0 ? `€ ${n.toFixed(0)},-` : `€ ${n.toFixed(2).replace(".", ",")}`;
}

export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);

  const [brand, setBrand] = useState<BikeBrand | null>(null);
  const [model, setModel] = useState("");
  const [selectedRepairs, setSelectedRepairs] = useState<string[]>([]);
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
    fetch("/api/availability?future=1").then((r) => r.json()).then(setAvailability);
    fetch("/api/services").then((r) => r.json()).then(setServices);
  }, []);

  const availableDates = useMemo(() => {
    const unique = [...new Set(availability.map((a) => a.date))];
    return unique.sort();
  }, [availability]);

  const chosenServices = useMemo(
    () => services.filter((s) => selectedRepairs.includes(s.slug)),
    [services, selectedRepairs]
  );
  const total = useMemo(
    () => chosenServices.reduce((sum, s) => sum + (s.price || 0), 0),
    [chosenServices]
  );
  const hasOverige = selectedRepairs.includes("overige");

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

  function toggleRepair(slug: string) {
    setSelectedRepairs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
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
          repairs: chosenServices.map((s) => ({ name: s.name, price: s.price })),
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
            Uw reparatie is ingepland op <strong>{fmtDate(date)}</strong>.
            {total > 0 && <> Verwachte kosten: <strong>{fmtPrice(total)}</strong>{hasOverige ? " (excl. overige reparatie)" : ""}.</>}
            <br />
            U ontvangt een bevestiging{email && phone ? " per e-mail en WhatsApp" : email ? " per e-mail" : " per WhatsApp"} met later ook het verwachte tijdvak.
          </p>
          <button
            className="btn"
            onClick={() => {
              setDone(false);
              setStep(0);
              setBrand(null);
              setModel("");
              setSelectedRepairs([]);
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
    <div className="page" style={{ maxWidth: 720 }}>
      <h1>Reparatie aanmelden</h1>
      <p className="subtitle">Meld uw fatbike aan voor reparatie aan huis, in een paar stappen.</p>

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
                  {b.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo} alt={b.name} />
                  ) : (
                    b.name
                  )}
                  <span className="bn">{b.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && brand && (
          <>
            <h3 style={{ marginTop: 0 }}>
              {brand.freeModel
                ? `Welk model ${brand.name === "Overig" ? "en merk" : brand.name} heeft u?`
                : `Welk model ${brand.name} heeft u?`}
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
                        {m.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.image} alt={m.name} />
                        )}
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
            <h3 style={{ marginTop: 0 }}>Vertel ons wat er kapot is</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -8 }}>
              Selecteer één of meerdere reparaties. Staat jouw reparatie er niet tussen? Kies dan &lsquo;Overige&rsquo;.
            </p>
            <div className="repair-grid">
              {services.map((s) => {
                const on = selectedRepairs.includes(s.slug);
                return (
                  <button key={s.slug} className={`repair-card ${on ? "selected" : ""}`} onClick={() => toggleRepair(s.slug)}>
                    <span className="img">
                      {s.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image} alt="" />
                      )}
                    </span>
                    <span className="body">
                      <span className="name">{s.name}</span>
                      <span className="sub">{s.sub}</span>
                    </span>
                    <span className="price">{s.price > 0 ? fmtPrice(s.price) : "op aanvraag"}</span>
                    <span className={`check ${on ? "on" : ""}`}>{on ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>

            {(hasOverige || selectedRepairs.length > 0) && (
              <label className="field" style={{ marginTop: 16 }}>
                Toelichting {hasOverige ? <span className="req">*</span> : "(optioneel)"}
                <textarea
                  rows={2}
                  placeholder="Omschrijf het probleem..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            )}

            {selectedRepairs.length > 0 && (
              <div className="total-bar">
                <span>{selectedRepairs.length} reparatie{selectedRepairs.length > 1 ? "s" : ""} geselecteerd</span>
                <strong>Totaal: {fmtPrice(total)}{hasOverige ? " + op aanvraag" : ""}</strong>
              </div>
            )}

            <div className="wizard-nav">
              <button className="btn ghost" onClick={back}>← Terug</button>
              <button
                className="btn"
                onClick={next}
                disabled={selectedRepairs.length === 0 || (hasOverige && !description.trim())}
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
              <div className="notice">Er zijn op dit moment geen dagen beschikbaar. Probeer het later opnieuw.</div>
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
            <div className="summary-box">
              <div><strong>{brand?.name} {model}</strong> · {fmtDate(date)}</div>
              {chosenServices.map((s) => (
                <div key={s.slug} className="line">
                  <span>{s.name}</span>
                  <span>{s.price > 0 ? fmtPrice(s.price) : "op aanvraag"}</span>
                </div>
              ))}
              <div className="line total">
                <span>Totaal</span>
                <span>{fmtPrice(total)}{hasOverige ? " + op aanvraag" : ""}</span>
              </div>
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
