import { NextRequest, NextResponse } from "next/server";
import { getRoutes, upsertRoute, getDrivers, getAvailability } from "@/lib/data";
import { sendStopNotifications, formatDateNl } from "@/lib/notifications";
import { calcDrivingMinutes, MAX_ROUTE_MINUTES } from "@/lib/routing";
import { sendWebhook } from "@/lib/webhook";
import type { Route, Stop } from "@/lib/types";

const ADMIN_EMAIL = "daniel@deskna.nl";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const dynamic = "force-dynamic";

/**
 * Publieke boeking: maakt een stop aan in de route van de gekozen datum.
 * body: { date, customerName, email?, phone?, address, lng, lat, brand, model,
 *         repairs: { name, price }[], description? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, customerName, email, phone, address, lng, lat, brand, model, description } = body;
  const repairs = (body.repairs ?? []) as { name: string; price: number }[];

  if (!date || !customerName || !address || lng == null || lat == null || !brand || repairs.length === 0) {
    return NextResponse.json({ error: "Verplichte velden ontbreken" }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ error: "Vul een e-mailadres of telefoonnummer in" }, { status: 400 });
  }

  // vandaag of eerder kan nooit geboekt worden
  if (date <= todayStr()) {
    return NextResponse.json({ error: "Deze datum is niet meer beschikbaar" }, { status: 409 });
  }

  // datum moet door de planner als beschikbaar zijn gemarkeerd
  const availability = await getAvailability();
  const slot = availability.find((a) => a.date === date);
  if (!slot) {
    return NextResponse.json({ error: "Deze datum is niet beschikbaar" }, { status: 409 });
  }

  // reparaties + vaste voorrijkosten
  const VOORRIJKOSTEN = 60;
  const total = repairs.reduce((sum, r) => sum + (r.price || 0), 0) + VOORRIJKOSTEN;
  const repairNames = repairs.map((r) => r.name).join(", ");
  const notes = [`${brand}${model ? ` ${model}` : ""}`, repairNames, description]
    .filter(Boolean)
    .join(" - ");

  const stop: Stop = {
    id: crypto.randomUUID(),
    customerName,
    email: email || undefined,
    phone: phone || undefined,
    address,
    lng,
    lat,
    type: "bezorgen",
    notes,
    amountDue: total,
    serviceMinutes: Math.max(30, repairs.length * 20),
    status: "open",
  };

  // bestaande route voor deze datum gebruiken, anders aanmaken
  const routes = await getRoutes();
  let route = routes.find((r) => r.date === date && r.status !== "afgerond");
  if (!route) {
    route = {
      id: crypto.randomUUID(),
      name: `Route voor ${date}`,
      date,
      driverId: slot.driverId,
      startAddress: "",
      startLng: 5.7999,
      startLat: 52.9663,
      startTime: "08:00",
      stops: [],
      status: "gepland",
      createdAt: new Date().toISOString(),
    } satisfies Route;
  }
  // capaciteitscheck: route mag maximaal 5,5 uur reistijd hebben
  const drivingMinutes = await calcDrivingMinutes(
    { lng: route.startLng, lat: route.startLat },
    [...route.stops, stop].map((s) => ({ lng: s.lng, lat: s.lat }))
  );
  if (drivingMinutes != null && drivingMinutes > MAX_ROUTE_MINUTES) {
    return NextResponse.json(
      {
        error: "Deze dag zit helaas vol voor jouw regio. Kies een andere beschikbare dag.",
        code: "route_full",
      },
      { status: 409 }
    );
  }

  route.stops.push(stop);
  // geometrie is niet meer actueel; reistijd wel net berekend
  route.geometry = undefined;
  route.distanceKm = undefined;
  route.durationMinutes = drivingMinutes ?? undefined;
  await upsertRoute(route);

  const drivers = await getDrivers();
  const driverName = drivers.find((d) => d.id === route.driverId)?.name ?? "onze chauffeur";
  const notify = await sendStopNotifications(route, [stop], "stop_added", driverName);

  // beheerdersmelding: nieuwe aanmelding binnengekomen
  await sendWebhook({
    type: "email",
    source: "routenu",
    email_to: ADMIN_EMAIL,
    email_subject: "Reparatie aangemeld — kijk nu op RouteNu",
    email_body:
      `<p>Er is zojuist een nieuwe reparatie aangemeld via de boekingspagina.</p>` +
      `<p><strong>Klant:</strong> ${customerName}<br/>` +
      `<strong>Adres:</strong> ${address}<br/>` +
      `<strong>Datum:</strong> ${formatDateNl(date)} tussen 17:00 - 18:00<br/>` +
      `<strong>Fiets:</strong> ${brand}${model ? ` ${model}` : ""}<br/>` +
      `<strong>Reparaties:</strong> ${repairNames}<br/>` +
      `<strong>Totaal:</strong> € ${total.toFixed(2).replace(".", ",")} (incl. voorrijkosten)</p>` +
      `<p>Kijk nu op RouteNu voor de route van die dag.</p>`,
  });

  return NextResponse.json({ ok: true, routeId: route.id, stopId: stop.id, notify }, { status: 201 });
}
