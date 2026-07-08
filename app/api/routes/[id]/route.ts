import { NextRequest, NextResponse } from "next/server";
import { getRoute, upsertRoute, deleteRoute } from "@/lib/data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const route = await getRoute(id);
  if (!route) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json(route);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await getRoute(id);
  if (!existing) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const body = await req.json();
  const updated = { ...existing, ...body, id };
  await upsertRoute(updated);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteRoute(id);
  return NextResponse.json({ ok: true });
}
