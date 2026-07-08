export interface BikeModel {
  id: string;
  name: string;
  image?: string; // pad onder /public, bijv. /bikes/qmwheel-v20-pro.jpg
}

export interface BikeBrand {
  id: string;
  name: string;
  models: BikeModel[];
  /** true = klant vult zelf het model in */
  freeModel?: boolean;
}

export const BRANDS: BikeBrand[] = [
  {
    id: "qmwheel",
    name: "QMWHEEL",
    models: [
      { id: "v20-pro", name: "V20 (PRO)", image: "/bikes/qmwheel-v20-pro.jpg" },
      { id: "v20-max-pro", name: "V20 MAX (PRO)", image: "/bikes/qmwheel-v20-max-pro.jpg" },
      { id: "v20-mini", name: "V20 MINI", image: "/bikes/qmwheel-v20-mini.jpg" },
      { id: "s20-pro", name: "S20 (PRO)", image: "/bikes/qmwheel-s20-pro.jpg" },
    ],
  },
  {
    id: "ouxi",
    name: "OUXI",
    models: [
      { id: "v8-c80", name: "V8 (C80)", image: "/bikes/ouxi-v8-c80.jpg" },
      { id: "v8-max-c80", name: "V8 MAX (C80)", image: "/bikes/ouxi-v8-max-c80.jpg" },
      { id: "h9", name: "H9", image: "/bikes/ouxi-h9.jpg" },
      { id: "c80-pro", name: "C80 PRO", image: "/bikes/ouxi-c80-pro.jpg" },
      { id: "c80-mini", name: "C80 MINI", image: "/bikes/ouxi-c80-mini.jpg" },
      { id: "q8", name: "Q8", image: "/bikes/ouxi-q8.jpg" },
    ],
  },
  {
    id: "engwe",
    name: "Engwe",
    models: [],
    freeModel: true,
  },
  {
    id: "overig",
    name: "Overig",
    models: [],
    freeModel: true,
  },
];

export const REPAIRS: { id: string; name: string }[] = [
  { id: "lekke-band-voor", name: "Lekke band (voorwiel)" },
  { id: "lekke-band-achter", name: "Lekke band (achterwiel)" },
  { id: "remmen", name: "Remmen afstellen / vervangen" },
  { id: "ketting", name: "Ketting / aandrijving" },
  { id: "accu-motor", name: "Accu of motor probleem" },
  { id: "display-elektra", name: "Display / elektra" },
  { id: "verlichting", name: "Verlichting" },
  { id: "anders", name: "Anders (omschrijf hieronder)" },
];
