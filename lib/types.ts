export type StopType = "bezorgen" | "ophalen" | "zending";

export interface CostItem {
  label: string;
  amount: number;
}

export interface Stop {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
  address: string;
  lng: number;
  lat: number;
  type: StopType;
  notes?: string;
  /** Verwacht te ontvangen bedrag (EUR) */
  amountDue?: number;
  /** Ingevuld door chauffeur */
  receivedAmount?: number;
  costs?: CostItem[];
  status: "open" | "afgerond" | "overgeslagen";
  /** ETA in minuten vanaf starttijd, gezet na routeberekening */
  etaMinutes?: number;
  /** Duur op locatie in minuten */
  serviceMinutes?: number;
  completedAt?: string;
}

export type RouteStatus = "gepland" | "onderweg" | "afgerond";

export interface Route {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  driverId?: string;
  startAddress: string;
  startLng: number;
  startLat: number;
  startTime: string; // HH:mm
  stops: Stop[];
  distanceKm?: number;
  durationMinutes?: number;
  /** GeoJSON LineString coordinates van de berekende route */
  geometry?: [number, number][];
  status: RouteStatus;
  startedAt?: string;
  completedAt?: string;
  startOdometer?: number;
  endOdometer?: number;
  /** Door de chauffeur ingevulde gewerkte uren */
  workedHours?: number;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export const PROVINCES = [
  "Groningen",
  "Friesland",
  "Drenthe (noord)",
  "Drenthe (zuid)",
  "Overijssel (noord-west)",
  "Overijssel (zuid-west)",
  "Overijssel (oost)",
  "Flevoland",
  "Gelderland (noord)",
  "Gelderland (west)",
  "Gelderland (oost)",
  "Utrecht",
  "Noord-Holland",
  "Zuid-Holland (noord)",
  "Zuid-Holland (zuid)",
  "Zeeland",
  "Noord-Brabant",
  "Limburg",
] as const;
export type Province = (typeof PROVINCES)[number];

/** Gesplitste provincies: scheidslijn in graden (lat = noord/zuid, lon = west/oost) */
const PROVINCE_SPLITS: Record<string, { axis: "lat" | "lon"; value: number }> = {
  Drenthe: { axis: "lat", value: 52.908 },
  "Zuid-Holland": { axis: "lat", value: 51.9915 },
};

/** Bepaal de regio (evt. provinciedeel) op basis van provincienaam en coördinaten */
export function regionForLocation(province: string, lng: number, lat: number): string {
  if (province === "Gelderland") {
    // noord boven de lat-scheidslijn; zuidelijk deel gesplitst in west/oost
    if (lat >= 52.127) return "Gelderland (noord)";
    return `Gelderland (${lng >= 5.9145 ? "oost" : "west"})`;
  }
  if (province === "Overijssel") {
    // oost rechts van de lon-scheidslijn; westelijk deel gesplitst in noord-west/zuid-west
    if (lng >= 6.4335) return "Overijssel (oost)";
    return `Overijssel (${lat >= 52.5367 ? "noord-west" : "zuid-west"})`;
  }
  const split = PROVINCE_SPLITS[province];
  if (!split) return province;
  if (split.axis === "lat") return `${province} (${lat >= split.value ? "noord" : "zuid"})`;
  return `${province} (${lng >= split.value ? "oost" : "west"})`;
}

/** Datum waarop een chauffeur beschikbaar is voor klant-boekingen */
export interface Availability {
  date: string; // YYYY-MM-DD
  driverId: string;
  /** Provincies waarvoor deze dag boekbaar is; ontbreekt = alle provincies */
  provinces?: string[];
}
