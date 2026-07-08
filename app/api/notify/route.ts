import { NextRequest, NextResponse } from "next/server";
import { getRoute, getDrivers } from "@/lib/data";
import { sendWebhook, normalizePhone, type WebhookPayload } from "@/lib/webhook";
import type { Route, Stop } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatEta(route: Route, stop: Stop): string {
  if (stop.etaMinutes == null) return "";
  const [h, m] = route.startTime.split(":").map(Number);
  const start = h * 60 + m + stop.etaMinutes;
  const windowEnd = start + (stop.serviceMinutes ?? 30);
  const fmt = (mins: number) =>
    `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  return `${fmt(start)} - ${fmt(windowEnd)}`;
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Verstuurt webhooks voor een route.
 * body: { routeId: string, event: "planned" | "started" | "stop_added" | "stop_completed", stopId?: string }
 */
export async function POST(req: NextRequest) {
  const { routeId, event, stopId } = await req.json();
  const route = await getRoute(routeId);
  if (!route) return NextResponse.json({ error: "Route niet gevonden" }, { status: 404 });

  const drivers = await getDrivers();
  const driverName = drivers.find((d) => d.id === route.driverId)?.name ?? "onze chauffeur";
  const dateStr = formatDate(route.date);

  const payloads: WebhookPayload[] = [];

  const stopsToNotify =
    (event === "stop_completed" || event === "stop_added") && stopId
      ? route.stops.filter((s) => s.id === stopId)
      : route.stops;

  for (const stop of stopsToNotify) {
    const eta = formatEta(route, stop);
    const typeLabel =
      stop.type === "bezorgen" ? "bezorging" : stop.type === "ophalen" ? "ophaalafspraak" : "zending";

    let emailBody: string;
    let messageText: string;

    if (event === "started") {
      emailBody = `<p>Beste ${stop.customerName},</p><p>Onze chauffeur ${driverName} is onderweg. Uw ${typeLabel} op ${stop.address} wordt vandaag verwacht${eta ? ` tussen <strong>${eta}</strong>` : ""}.</p><p>Met vriendelijke groet,<br/>RouteNu</p>`;
      messageText = `Beste ${stop.customerName}, uw route is gestart. ${driverName} wordt${eta ? ` tussen ${eta}` : " vandaag"} bij u verwacht voor uw ${typeLabel} (${stop.address}).`;
    } else if (event === "stop_completed") {
      emailBody = `<p>Beste ${stop.customerName},</p><p>Uw ${typeLabel} op ${stop.address} is afgerond. Bedankt!</p><p>Met vriendelijke groet,<br/>RouteNu</p>`;
      messageText = `Beste ${stop.customerName}, uw ${typeLabel} op ${stop.address} is afgerond. Bedankt!`;
    } else if (event === "stop_added") {
      emailBody = `<p>Beste ${stop.customerName},</p><p>Uw ${typeLabel} is ingepland op ${dateStr}.</p><p>Adres: ${stop.address}</p>${stop.notes ? `<p>Opdracht: ${stop.notes}</p>` : ""}<p>U ontvangt nog een bericht met het verwachte tijdvak.</p><p>Met vriendelijke groet,<br/>RouteNu</p>`;
      messageText = `Beste ${stop.customerName}, uw ${typeLabel} is ingepland op ${dateStr}. Adres: ${stop.address}.${stop.notes ? ` Opdracht: ${stop.notes}.` : ""} U ontvangt nog een bericht met het verwachte tijdvak.`;
    } else {
      emailBody = `<p>Beste ${stop.customerName},</p><p>Uw ${typeLabel} staat ingepland op ${dateStr}${eta ? ` tussen <strong>${eta}</strong>` : ""}.</p><p>Adres: ${stop.address}</p><p>Met vriendelijke groet,<br/>RouteNu</p>`;
      messageText = `Beste ${stop.customerName}, uw ${typeLabel} staat ingepland op ${dateStr}${eta ? ` tussen ${eta}` : ""}. Adres: ${stop.address}.`;
    }

    if (stop.email) {
      payloads.push({
        type: "email",
        source: "routenu",
        email_to: stop.email,
        email_subject: "Uw route-informatie",
        email_body: emailBody,
      });
    }
    if (stop.phone) {
      payloads.push({
        type: "message",
        phone: normalizePhone(stop.phone),
        message: messageText,
        profile: "default",
        browser: "chromium",
      });
    }
  }

  const results = await Promise.all(payloads.map((p) => sendWebhook(p)));
  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  return NextResponse.json({ sent, failed, total: payloads.length, results });
}
