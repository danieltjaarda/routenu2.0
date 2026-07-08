import { NextRequest, NextResponse } from "next/server";
import { getServices, saveServices } from "@/lib/data";
import type { RepairService } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getServices());
}

/** body: volledige lijst services (met aangepaste prijzen) */
export async function PUT(req: NextRequest) {
  const services = (await req.json()) as RepairService[];
  if (!Array.isArray(services)) {
    return NextResponse.json({ error: "Verwacht een lijst met diensten" }, { status: 400 });
  }
  await saveServices(services);
  return NextResponse.json({ ok: true });
}
