import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, authToken } from "@/lib/auth";

// Publiek: klantpagina + chauffeurspagina + de endpoints die zij gebruiken
const PUBLIC_PREFIXES = ["/boeken", "/chauffeur", "/login", "/api/login", "/api/bookings", "/api/ai-select"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // de wizard leest beschikbaarheid en tarieven; alleen GET is publiek
  if (
    req.method === "GET" &&
    (pathname === "/api/services" || pathname === "/api/availability" || pathname === "/api/drivers")
  ) {
    return NextResponse.next();
  }

  // chauffeur: routes lezen en bijwerken (aanmaken/verwijderen blijft admin)
  if ((req.method === "GET" || req.method === "PUT") && pathname.startsWith("/api/routes")) {
    return NextResponse.next();
  }

  // chauffeur verstuurt notificaties bij starten/afronden van stops
  if (req.method === "POST" && pathname === "/api/notify") {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && cookie === (await authToken())) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // alles behalve Next-internals en statische bestanden (met extensie)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
