import { NextRequest, NextResponse } from "next/server";
import { getRoutes, upsertRoute } from "@/lib/data";
import type { Route } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  let routes = await getRoutes();
  if (date) routes = routes.filter((r) => r.date === date);
  routes.sort((a, b) => (a.date < b.date ? 1 : -1));
  return NextResponse.json(routes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const route: Route = {
    id: crypto.randomUUID(),
    name: body.name || `Route voor ${body.date}`,
    date: body.date,
    driverId: body.driverId,
    startAddress: body.startAddress ?? "",
    startLng: body.startLng ?? 5.7999,
    startLat: body.startLat ?? 52.9663,
    startTime: body.startTime ?? "08:00",
    stops: [],
    status: "gepland",
    createdAt: new Date().toISOString(),
  };
  await upsertRoute(route);
  return NextResponse.json(route, { status: 201 });
}
