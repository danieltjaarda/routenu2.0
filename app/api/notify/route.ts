import { NextRequest, NextResponse } from "next/server";
import { getRoute, getDrivers } from "@/lib/data";
import { sendStopNotifications, type NotifyEvent } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Verstuurt webhooks voor een route.
 * body: { routeId: string, event: "planned" | "started" | "stop_added" | "stop_completed", stopId?: string }
 */
export async function POST(req: NextRequest) {
  const { routeId, event, stopId } = (await req.json()) as {
    routeId: string;
    event: NotifyEvent;
    stopId?: string;
  };
  const route = await getRoute(routeId);
  if (!route) return NextResponse.json({ error: "Route niet gevonden" }, { status: 404 });

  const drivers = await getDrivers();
  const driverName = drivers.find((d) => d.id === route.driverId)?.name ?? "onze chauffeur";

  const stopsToNotify =
    (event === "stop_completed" || event === "stop_added") && stopId
      ? route.stops.filter((s) => s.id === stopId)
      : route.stops;

  const result = await sendStopNotifications(route, stopsToNotify, event, driverName);
  return NextResponse.json(result);
}
