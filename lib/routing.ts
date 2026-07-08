/** Maximale reistijd van een route in minuten (5,5 uur) */
export const MAX_ROUTE_MINUTES = 330;

/**
 * Bereken de rijtijd in minuten voor start + stops in volgorde
 * via de Mapbox Directions API. Geeft null als berekening niet lukt.
 */
export async function calcDrivingMinutes(
  start: { lng: number; lat: number },
  stops: { lng: number; lat: number }[]
): Promise<number | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || stops.length === 0) return null;

  const coords = [start, ...stops].map((c) => `${c.lng},${c.lat}`).join(";");
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?overview=false&access_token=${token}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const dur = data.routes?.[0]?.duration;
    return typeof dur === "number" ? Math.round(dur / 60) : null;
  } catch {
    return null;
  }
}
