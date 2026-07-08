import { NextRequest, NextResponse } from "next/server";
import { getRoutes, upsertRoute, getDrivers, getAvailability } from "@/lib/data";
import { sendStopNotifications } from "@/lib/notifications";
import type { Route, Stop } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Publieke boeking: maakt een stop aan in de route van de gekozen datum.
 * body: { date, customerName, email?, phone?, address, lng, lat, brand, model, repair, description? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, customerName, email, phone, address, lng, lat, brand, model, repair, description } = body;

  if (!date || !customerName || !address || lng == null || lat == null || !brand || !repair) {
    return NextResponse.json({ error: "Verplichte velden ontbreken" }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ error: "Vul een e-mailadres of telefoonnummer in" }, { status: 400 });
  }

  // datum moet door de planner als beschikbaar zijn gemarkeerd
  const availability = await getAvailability();
  const slot = availability.find((a) => a.date === date);
  if (!slot) {
    return NextResponse.json({ error: "Deze datum is niet beschikbaar" }, { status: 409 });
  }

  const notes = [`${brand}${model ? ` ${model}` : ""}`, repair, description]
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
    serviceMinutes: 30,
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
  route.stops.push(stop);
  // route-berekening is niet meer actueel
  route.geometry = undefined;
  route.distanceKm = undefined;
  route.durationMinutes = undefined;
  await upsertRoute(route);

  const drivers = await getDrivers();
  const driverName = drivers.find((d) => d.id === route.driverId)?.name ?? "onze chauffeur";
  const notify = await sendStopNotifications(route, [stop], "stop_added", driverName);

  return NextResponse.json({ ok: true, routeId: route.id, stopId: stop.id, notify }, { status: 201 });
}
