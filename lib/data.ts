import { kvGet, kvSet } from "./store";
import type { Route, Driver, Availability } from "./types";

const ROUTES_KEY = "routenu:routes";
const DRIVERS_KEY = "routenu:drivers";
const AVAILABILITY_KEY = "routenu:availability";

export async function getRoutes(): Promise<Route[]> {
  return (await kvGet<Route[]>(ROUTES_KEY)) ?? [];
}

export async function saveRoutes(routes: Route[]): Promise<void> {
  await kvSet(ROUTES_KEY, routes);
}

export async function getRoute(id: string): Promise<Route | null> {
  const routes = await getRoutes();
  return routes.find((r) => r.id === id) ?? null;
}

export async function upsertRoute(route: Route): Promise<void> {
  const routes = await getRoutes();
  const idx = routes.findIndex((r) => r.id === route.id);
  if (idx >= 0) routes[idx] = route;
  else routes.push(route);
  await saveRoutes(routes);
}

export async function deleteRoute(id: string): Promise<void> {
  const routes = await getRoutes();
  await saveRoutes(routes.filter((r) => r.id !== id));
}

const DEFAULT_DRIVERS: Driver[] = [
  { id: "d1", name: "Marc Modderman" },
];

export async function getDrivers(): Promise<Driver[]> {
  const drivers = await kvGet<Driver[]>(DRIVERS_KEY);
  if (!drivers || drivers.length === 0) {
    await kvSet(DRIVERS_KEY, DEFAULT_DRIVERS);
    return DEFAULT_DRIVERS;
  }
  return drivers;
}

export async function saveDrivers(drivers: Driver[]): Promise<void> {
  await kvSet(DRIVERS_KEY, drivers);
}

export async function getAvailability(): Promise<Availability[]> {
  return (await kvGet<Availability[]>(AVAILABILITY_KEY)) ?? [];
}

export async function saveAvailability(items: Availability[]): Promise<void> {
  await kvSet(AVAILABILITY_KEY, items);
}
