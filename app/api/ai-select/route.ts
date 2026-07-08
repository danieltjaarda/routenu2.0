import { NextRequest, NextResponse } from "next/server";
import { getServices } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * AI-selectie: klant omschrijft het probleem in eigen woorden,
 * Claude kiest de passende reparaties uit de dienstenlijst.
 * body: { text: string }
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI is niet geconfigureerd" }, { status: 500 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string" || text.trim().length < 5) {
    return NextResponse.json({ error: "Omschrijf het probleem iets uitgebreider" }, { status: 400 });
  }

  const services = await getServices();
  const serviceList = services
    .map((s) => `- ${s.slug}: ${s.name} (${s.sub})`)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 500,
      system: `Je bent de reparatie-assistent van een mobiele fatbike-reparatieservice. De klant omschrijft in eigen woorden wat er kapot is aan zijn fatbike. Kies uit de onderstaande dienstenlijst de reparaties die daar het beste bij passen.

Dienstenlijst (slug: naam):
${serviceList}

Regels:
- Kies alleen diensten die duidelijk bij de klacht passen. Liever te weinig dan te veel.
- Bij een lekke band zonder vermelding voor/achter: kies de binnenband van het genoemde wiel, of allebei als het onduidelijk is welke.
- Alleen als er echt niets past: kies "overige".
- Antwoord UITSLUITEND met geldige JSON in dit formaat, zonder verdere tekst:
{"repairs": ["slug1", "slug2"], "uitleg": "één korte zin in het Nederlands waarom deze keuze"}`,
      messages: [{ role: "user", content: text.trim() }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Anthropic API fout:", res.status, err);
    return NextResponse.json({ error: "AI-service is tijdelijk niet beschikbaar" }, { status: 502 });
  }

  const data = await res.json();
  const raw: string = data.content?.[0]?.text ?? "";

  // JSON uit het antwoord halen (voor het geval er toch tekst omheen staat)
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json({ error: "AI gaf geen bruikbaar antwoord" }, { status: 502 });
  }

  let parsed: { repairs?: string[]; uitleg?: string };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: "AI gaf geen bruikbaar antwoord" }, { status: 502 });
  }

  const validSlugs = new Set(services.map((s) => s.slug));
  const repairs = (parsed.repairs ?? []).filter((slug) => validSlugs.has(slug));

  return NextResponse.json({ repairs, uitleg: parsed.uitleg ?? "" });
}
