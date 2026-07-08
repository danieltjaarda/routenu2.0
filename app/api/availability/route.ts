import { NextRequest, NextResponse } from "next/server";
import { getAvailability, saveAvailability } from "@/lib/data";

export const dynamic = "force-dynamic";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** GET ?future=1 geeft alleen datums vanaf vandaag (voor de publieke boekingspagina) */
export async function GET(req: NextRequest) {
  let items = await getAvailability();
  if (req.nextUrl.searchParams.get("future")) {
    const today = todayStr();
    items = items.filter((a) => a.date >= today);
  }
  items.sort((a, b) => (a.date > b.date ? 1 : -1));
  return NextResponse.json(items);
}

/** body: { date, driverId, available: boolean, provinces?: string[] } — zet beschikbaarheid (met provincies) aan/uit */
export async function POST(req: NextRequest) {
  const { date, driverId, available, provinces } = await req.json();
  if (!date || !driverId) {
    return NextResponse.json({ error: "date en driverId zijn verplicht" }, { status: 400 });
  }
  let items = await getAvailability();
  items = items.filter((a) => !(a.date === date && a.driverId === driverId));
  if (available) {
    items.push({
      date,
      driverId,
      ...(Array.isArray(provinces) && provinces.length > 0 ? { provinces } : {}),
    });
  }
  await saveAvailability(items);
  return NextResponse.json({ ok: true });
}
