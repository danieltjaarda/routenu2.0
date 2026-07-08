# RouteNu Planner

Routeplanner-app (Next.js + React) met Mapbox, Vercel KV-opslag en webhook-notificaties naar klanten (e-mail + WhatsApp).

## Functies

- **Route-overzicht** (`/`) — routes aanmaken per datum, chauffeur en starttijd toewijzen.
- **Routeplanner** (`/planner/[id]`) — stops toevoegen (klantinfo, adres via Mapbox geocoding, soort opdracht), route berekenen via de Mapbox Directions API (afstand, rijtijd en ETA per stop), volgorde aanpassen/omdraaien, en **Klanten informeren** via de webhook.
- **Chauffeur** (`/chauffeur`) — chauffeur opent zijn route, start hem (klanten krijgen automatisch een webhook-notificatie), vult per stop het ontvangen bedrag en kostenposten in, en sluit de route af met de kilometerstand.
- **Analytics** (`/analytics`) — totale omzet, kosten, resultaat en kilometers; uitgesplitst per chauffeur en per route, filterbaar op periode.

## Webhooks

Bij "Klanten informeren", het starten van een route en het afronden van een stop stuurt de app per klant een POST naar `WEBHOOK_URL` met `Content-Type: application/json`:

```json
{
  "type": "email",
  "source": "routenu",
  "email_to": "klant@email.nl",
  "email_subject": "Uw route-informatie",
  "email_body": "<p>Beste klant, hier is uw route info...</p>"
}
```

```json
{
  "type": "message",
  "phone": "31612345678",
  "message": "Uw route is gestart...",
  "profile": "default",
  "browser": "chromium"
}
```

Een e-mail wordt verstuurd als de stop een e-mailadres heeft, een WhatsApp-bericht als er een telefoonnummer is (nummers worden genormaliseerd naar `316...`-formaat).

## Lokaal draaien

```bash
cp .env.example .env.local   # vul NEXT_PUBLIC_MAPBOX_TOKEN in
npm install
npm run dev
```

Zonder Vercel KV wordt lokaal automatisch opgeslagen in `.data/db.json`.

## Deployen op Vercel

1. Push dit project naar een Git-repository en importeer het in [Vercel](https://vercel.com/new).
2. Voeg in het Vercel-dashboard een **KV store** toe (Storage → Create → KV / Upstash for Redis) en koppel deze aan het project. De variabelen `KV_REST_API_URL` en `KV_REST_API_TOKEN` worden dan automatisch gezet.
3. Zet de environment variables:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` — je publieke Mapbox-token (pk.…)
   - `WEBHOOK_URL` — bijv. `https://apihier.com/api/webhook`
4. Deploy. Klaar.

## Environment variables

| Variabele | Verplicht | Omschrijving |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ja | Mapbox public token voor kaart, geocoding en directions |
| `WEBHOOK_URL` | nee | Webhook-endpoint (default: `https://apihier.com/api/webhook`) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | op Vercel | Vercel KV-credentials (lokaal optioneel) |
