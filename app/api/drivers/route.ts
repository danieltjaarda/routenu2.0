import { NextRequest, NextResponse } from "next/server";
import { getDrivers, saveDrivers } from "@/lib/data";
import type { Driver } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDrivers());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const drivers = await getDrivers();
  const driver: Driver = {
    id: crypto.randomUUID(),
    name: body.name,
    phone: body.phone,
    email: body.email,
  };
  drivers.push(driver);
  await saveDrivers(drivers);
  return NextResponse.json(driver, { status: 201 });
}
