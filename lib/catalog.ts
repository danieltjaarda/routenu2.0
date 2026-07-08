import DEFAULT_SERVICES_JSON from "./default-services.json";

export interface BikeModel {
  id: string;
  name: string;
  image?: string;
}

export interface BikeBrand {
  id: string;
  name: string;
  logo?: string;
  models: BikeModel[];
  /** true = klant vult zelf het model in */
  freeModel?: boolean;
}

export const BRANDS: BikeBrand[] = [
  {
    id: "qmwheel",
    name: "QMWHEEL",
    logo: "/brands/qmwheel.webp",
    models: [
      { id: "v20-pro", name: "V20", image: "/bikes/qmwheel-v20-pro.jpg" },
      { id: "v20-max-pro", name: "V20 MAX (PRO)", image: "/bikes/qmwheel-v20-max-pro.png" },
      { id: "v20-mini", name: "V20 MINI", image: "/bikes/qmwheel-v20-mini.png" },
      { id: "s20-pro", name: "S20 (PRO)", image: "/bikes/qmwheel-s20-pro.png" },
    ],
  },
  {
    id: "ouxi",
    name: "OUXI",
    logo: "/brands/ouxi.jpg",
    models: [
      { id: "v8-c80", name: "V8 (C80)", image: "/bikes/ouxi-v8-c80.png" },
      { id: "v8-max-c80", name: "V8 MAX (C80)", image: "/bikes/ouxi-v8-max-c80.png" },
      { id: "h9", name: "H9", image: "/bikes/ouxi-h9.png" },
      { id: "c80-pro", name: "C80 PRO", image: "/bikes/ouxi-c80-pro.png" },
      { id: "c80-mini", name: "C80 MINI", image: "/bikes/ouxi-c80-mini.png" },
      { id: "q8", name: "Q8", image: "/bikes/ouxi-q8.png" },
    ],
  },
  {
    id: "engwe",
    name: "Engwe",
    logo: "/brands/engwe.png",
    models: [],
    freeModel: true,
  },
  {
    id: "overig",
    name: "Overig",
    logo: "/brands/overig.jpg",
    models: [],
    freeModel: true,
  },
];

/** Reparatiedienst met prijs; prijzen zijn aanpasbaar via de Tarieven-pagina (opgeslagen in KV) */
export interface RepairService {
  slug: string;
  name: string;
  /** korte subtitel, bijv. "Deli binnenband" */
  sub: string;
  price: number;
  image: string;
  desc?: string;
}

export const DEFAULT_SERVICES: RepairService[] = DEFAULT_SERVICES_JSON as RepairService[];
