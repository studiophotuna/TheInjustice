// The four countries and what each one is known for. Only Varrow is playable today; the
// others are shown as previews so players know what's coming. See docs/WORLD.md.

export interface CountryDef {
  id: string;
  name: string;
  capital: string;
  mood: string;
  laws: string;
  /** Schools/careers each country specialises in (planned ones are previews). */
  schools: { name: string; career: string; open: boolean }[];
  open: boolean;
  color: string;
}

export const COUNTRIES: CountryDef[] = [
  {
    id: "varrow",
    name: "Varrow",
    capital: "Grayhaven",
    mood: "Rain-soaked port city, crooked courts.",
    laws: "Average sentences, judges easily bought.",
    schools: [
      { name: "Grayhaven Police Academy", career: "Police", open: true },
      { name: "Halloway School of Law", career: "Courts", open: true },
    ],
    open: true,
    color: "#38e1ff",
  },
  {
    id: "solmarra",
    name: "Solmarra",
    capital: "Port Solace",
    mood: "Casinos, beaches and dirty money.",
    laws: "Lax and cheap to bribe.",
    schools: [
      { name: "Solace Institute of Finance", career: "Banking", open: false },
      { name: "Bayview Medical College", career: "Medicine", open: false },
    ],
    open: false,
    color: "#ffc24b",
  },
  {
    id: "kestrova",
    name: "Kestrova",
    capital: "Ironmoor",
    mood: "Cold, strict and watched.",
    laws: "Harsh sentences, almost impossible to bribe.",
    schools: [
      { name: "Ironmoor Military Academy", career: "Military", open: false },
      { name: "State Police College", career: "Police (elite)", open: false },
    ],
    open: false,
    color: "#a8c6ff",
  },
  {
    id: "meridian",
    name: "Meridian",
    capital: "Halcyon",
    mood: "Glass towers and the richest people alive.",
    laws: "The rich are above the law.",
    schools: [
      { name: "Halcyon University of Medicine", career: "Medicine", open: false },
      { name: "Meridian Corporate Law School", career: "Courts (corporate)", open: false },
      { name: "Halcyon Tech Institute", career: "Hacking & security", open: false },
    ],
    open: false,
    color: "#9b7bff",
  },
];
