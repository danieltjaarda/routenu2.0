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
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}
