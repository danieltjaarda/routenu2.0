"use client";

import { useEffect, useMemo, useState } from "react";
import AddressSearch from "@/components/AddressSearch";
import { BRANDS, type BikeBrand, type RepairService } from "@/lib/catalog";
import type { Availability } from "@/lib/types";
import { PROVINCES, regionForLocation } from "@/lib/types";

const STEPS = ["Merk", "Model", "Reparatie", "Datum", "Gegevens"] as const;

/** Vaste voorrijkosten per boeking (EUR) */
const VOORRIJKOSTEN = 60;

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

  const [postcode, setPostcode] = useState("");
  const [huisnummer, setHuisnummer] = useState("");
  const [province, setProvince] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lng: number; lat: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiUitleg, setAiUitleg] = useState("");
  const [aiPicked, setAiPicked] = useState<string[]>([]);
  const [aiTyped, setAiTyped] = useState("");

  // Typemachine-effect voor het AI-antwoord
  useEffect(() => {
    if (!aiUitleg) {
      setAiTyped("");
      return;
    }
    setAiTyped("");
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setAiTyped(aiUitleg.slice(0, i));
      if (i >= aiUitleg.length) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [aiUitleg]);

  // AI-gekozen reparaties bovenaan tonen, rest in oorspronkelijke volgorde
  const sortedServices = useMemo(() => {
    if (aiPicked.length === 0) return services;
    const picked = aiPicked
      .map((slug) => services.find((s) => s.slug === slug))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    const rest = services.filter((s) => !aiPicked.includes(s.slug));
    return [...picked, ...rest];
  }, [services, aiPicked]);

  useEffect(() => {
    fetch("/api/availability?future=1").then((r) => r.json()).then(setAvailability);
    fetch("/api/services").then((r) => r.json()).then(setServices);
  }, []);

  // alleen dagen tonen die voor de provincie van de klant beschikbaar zijn
  const availableDates = useMemo(() => {
    if (!province) return [];
    const matching = availability.filter(
      (a) => !a.provinces || a.provinces.length === 0 || a.provinces.includes(province)
    );
    return [...new Set(matching.map((a) => a.date))].sort();
  }, [availability, province]);

  function normalizeProvince(name: string): string {
    const n = name.toLowerCase();
    if (n.includes("frysl")) return "Friesland";
    return PROVINCES.find((p) => p.toLowerCase() === n) ?? name;
  }

  async function lookupPostcode() {
    const pc = postcode.replace(/\s+/g, "").toUpperCase();
    if (!/^\d{4}[A-Z]{2}$/.test(pc) || !huisnummer.trim()) {
      setLookupError("Vul een geldige postcode (bijv. 1234AB) en huisnummer in.");
      return;
    }
    setLookupBusy(true);
    setLookupError("");
    try {
      // PDOK Locatieserver: officiële BAG-adressen incl. provincie
      const q = `${pc} ${huisnummer.trim()}`;
      const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=1&fl=weergavenaam,provincienaam,centroide_ll,postcode`;
      const res = await fetch(url);
      const data = await res.json();
      const doc = data.response?.docs?.[0];
      if (!doc || doc.postcode !== pc) {
        setLookupError("Adres niet gevonden. Controleer postcode en huisnummer.");
        return;
      }
      const m = /POINT\((\S+) (\S+)\)/.exec(doc.centroide_ll ?? "");
      const lng = m ? Number(m[1]) : 0;
      const lat = m ? Number(m[2]) : 0;
      // provincie evt. omzetten naar regiohelft (bijv. "Zuid-Holland (noord)")
      setProvince(regionForLocation(normalizeProvince(doc.provincienaam ?? ""), lng, lat));
      // adres alvast invullen voor de laatste stap
      setAddress(doc.weergavenaam);
      if (m) setCoords({ lng, lat });
    } catch {
      setLookupError("Zoeken mislukt. Probeer het opnieuw.");
    } finally {
      setLookupBusy(false);
    }
  }

  const chosenServices = useMemo(
    () => services.filter((s) => selectedRepairs.includes(s.slug)),
    [services, selectedRepairs]
  );
  const total = useMemo(
    () => chosenServices.reduce((sum, s) => sum + (s.price || 0), 0),
    [chosenServices]
  );
  const totalWithFee = total + VOORRIJKOSTEN;
  const hasOverige = selectedRepairs.includes("overige");

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  const [slideDir, setSlideDir] = useState<"fwd" | "back">("fwd");

  function next() {
    setError("");
    setSlideDir("fwd");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError("");
    setSlideDir("back");
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

  async function aiSelect() {
    if (!aiText.trim() || aiBusy) return;
    setAiBusy(true);
    setAiUitleg("");
    setError("");
    try {
      const res = await fetch("/api/ai-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI kon geen keuze maken. Selecteer handmatig.");
        return;
      }
      if (data.repairs.length === 0) {
        setAiUitleg("Geen passende reparatie gevonden — selecteer hieronder handmatig of kies 'Overige'.");
        return;
      }
      setSelectedRepairs(data.repairs);
      setAiPicked(data.repairs);
      setDescription(aiText.trim());
      setAiUitleg(data.uitleg || "Reparaties geselecteerd op basis van je omschrijving.");
    } finally {
      setAiBusy(false);
    }
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
        if (data.code === "route_full") {
          // dag zit vol: lijst verversen en terug naar de datumstap
          const fresh = await fetch("/api/availability?future=1").then((r) => r.json());
          setAvailability(fresh);
          setDate("");
          setSlideDir("back");
          setStep(3);
          setError(data.error);
          return;
        }
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
        <div className="card success-pop" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <h1 style={{ marginTop: 12 }}>Aanmelding gelukt!</h1>
          <p style={{ color: "var(--muted)" }}>
            Uw reparatie is ingepland op <strong>{fmtDate(date)} tussen 17:00 - 18:00</strong>.
            {total > 0 && <> Verwachte kosten: <strong>{fmtPrice(totalWithFee)}</strong> incl. onderdelen, arbeid en voorrijkosten{hasOverige ? " (excl. overige reparatie)" : ""}.</>}
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
              setPostcode("");
              setHuisnummer("");
              setProvince("");
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
      <h1>Reparatie aan huis</h1>

      <div className={step === 2 ? "step-bare" : "card"} style={{ marginTop: 18, overflow: "hidden" }}>
        <div key={step} className={`step-pane ${slideDir}`}>
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
                  <span className="bm">
                    {b.models.length > 0 ? b.models.map((m) => m.name).join(" · ") : "Alle modellen"}
                  </span>
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

            <div className="ai-bar">
              <div className="ai-head">✨ Omschrijf je probleem, dan selecteren wij de juiste reparaties</div>
              <div className="ai-row">
                <input
                  placeholder="Bijv. mijn achterband is lek en mijn display doet het niet meer..."
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      aiSelect();
                    }
                  }}
                />
                <button type="button" className="btn small" onClick={aiSelect} disabled={aiBusy || !aiText.trim()}>
                  {aiBusy ? (
                    <span className="ai-btn-busy">
                      <span className="ai-spinner" />
                      Denken
                    </span>
                  ) : (
                    "Selecteer"
                  )}
                </button>
              </div>
              {aiBusy && (
                <div className="ai-thinking">
                  <span className="ai-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="ai-thinking-text">AI analyseert je omschrijving...</span>
                </div>
              )}
              {!aiBusy && aiUitleg && (
                <div className="ai-answer">
                  <span className="ai-avatar">✨</span>
                  <span className="ai-answer-body">
                    <span className="ai-answer-label">AI-advies</span>
                    <span className="ai-answer-text">
                      {aiTyped}
                      {aiTyped.length < aiUitleg.length && <span className="ai-cursor" />}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="repair-grid">
              {sortedServices.map((s) => {
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
                <strong>Totaal: {fmtPrice(totalWithFee)}{hasOverige ? " + op aanvraag" : ""} <span style={{ fontWeight: 500, fontSize: 12, opacity: 0.8 }}>incl. onderdelen, arbeid en voorrijkosten</span></strong>
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

            {!province ? (
              <>
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -4 }}>
                  Vul eerst uw postcode en huisnummer in, dan tonen we de dagen waarop we bij u in de buurt zijn.
                </p>
                <div className="pc-row">
                  <label className="field" style={{ margin: 0, flex: 1 }}>
                    Postcode
                    <input
                      placeholder="1234AB"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && lookupPostcode()}
                    />
                  </label>
                  <label className="field" style={{ margin: 0, flex: 1 }}>
                    Huisnummer
                    <input
                      placeholder="12"
                      value={huisnummer}
                      onChange={(e) => setHuisnummer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && lookupPostcode()}
                    />
                  </label>
                  <button
                    className="btn"
                    style={{ alignSelf: "flex-end" }}
                    onClick={lookupPostcode}
                    disabled={lookupBusy || !postcode.trim() || !huisnummer.trim()}
                  >
                    {lookupBusy ? (
                      <span className="ai-btn-busy"><span className="ai-spinner" />Zoeken</span>
                    ) : (
                      "Toon dagen"
                    )}
                  </button>
                </div>
                {lookupError && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>{lookupError}</div>}
              </>
            ) : (
              <>
                <div className="pc-found">
                  <span>✓ {address} — regio <strong>{province}</strong></span>
                  <button
                    type="button"
                    className="pc-change"
                    onClick={() => {
                      setProvince("");
                      setDate("");
                    }}
                  >
                    wijzig
                  </button>
                </div>
                {availableDates.length === 0 ? (
                  <div className="notice">
                    Er zijn op dit moment geen beschikbare dagen in {province}. Probeer het later opnieuw.
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
                        <span className="dc-time">tussen 17:00 - 18:00</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {error && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</div>}
            <div className="wizard-nav">
              <button className="btn ghost" onClick={back}>← Terug</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3 style={{ marginTop: 0 }}>Uw gegevens</h3>
            <div className="summary-box">
              <div><strong>{brand?.name} {model}</strong> · {fmtDate(date)} tussen 17:00 - 18:00</div>
              {chosenServices.map((s) => (
                <div key={s.slug} className="line">
                  <span>{s.name}</span>
                  <span>{s.price > 0 ? fmtPrice(s.price) : "op aanvraag"}</span>
                </div>
              ))}
              <div className="line">
                <span>Voorrijkosten</span>
                <span>{fmtPrice(VOORRIJKOSTEN)}</span>
              </div>
              <div className="line total">
                <span>Totaal <span style={{ fontWeight: 500, fontSize: 11, color: "var(--muted)" }}>incl. onderdelen, arbeid en voorrijkosten</span></span>
                <span>{fmtPrice(totalWithFee)}{hasOverige ? " + op aanvraag" : ""}</span>
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
    </div>
  );
}
