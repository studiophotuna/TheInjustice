import { BALANCE } from "../balance";
import type { CountryId, DistrictId, PathId, Player } from "../types";

export interface SchoolDef {
  id: string;
  name: string;
  path: PathId;
  country: CountryId;
  city: string;
  district: DistrictId;
  tuition: number;
  dean: string;
  description: string;
  /** Minimum average of the career's key stats the dean expects (hidden). */
  entrance: number;
  /** Returns a reason the player can't apply yet, or null. */
  requirements: (p: Player) => string | null;
}

const basics = (p: Player, minRep: number): string | null => {
  if (p.heat >= BALANCE.cleanRecordHeat) return "Applicants need a clean record. Lie low for a while.";
  if (p.housing < 2) return "Applications need a home address. Rent a room first.";
  if (p.reputation < minRep) return `Nobody here knows your name yet. (Reputation ${minRep} needed.)`;
  if (!p.hasBankAccount) return "Tuition is paid by bank transfer. Open a bank account first.";
  return null;
};

export const SCHOOLS: SchoolDef[] = [
  {
    id: "grayhaven_academy",
    name: "Grayhaven Police Academy",
    path: "police",
    country: "varrow",
    city: "Grayhaven",
    district: "precinct_square",
    tuition: 600,
    dean: "Commander Ruth Okafor",
    description: "Twelve weeks of drills, law and humility. Graduates walk out with a badge.",
    entrance: 15,
    requirements: (p) => basics(p, 15),
  },
  {
    id: "halloway_law",
    name: "Halloway School of Law",
    path: "courts",
    country: "varrow",
    city: "Grayhaven",
    district: "courthouse_hill",
    tuition: 900,
    dean: "Dean Theodore Halloway",
    description: "Old marble, older money. The school that trained half the judges in Varrow.",
    entrance: 15,
    requirements: (p) => basics(p, 20),
  },
  {
    id: "st_brigids_med",
    name: "St. Brigid's School of Medicine",
    path: "medicine",
    country: "varrow",
    city: "Grayhaven",
    district: "st_brigids",
    tuition: 1200,
    dean: "Dr. Helena Voss",
    description: "A teaching hospital that never turns anyone away. Its students learn on the city's worst nights.",
    entrance: 16,
    requirements: (p) => basics(p, 15),
  },
  {
    id: "halcyon_med",
    name: "Halcyon University of Medicine",
    path: "medicine",
    country: "meridian",
    city: "Halcyon",
    district: "glass_quarter",
    tuition: 2250,
    dean: "Provost Adrian Kell",
    description: "The best hospitals in the world, and the richest patients. Hard to get into, harder to afford.",
    entrance: 22,
    requirements: (p) => basics(p, 25),
  },
  {
    id: "ironmoor_police",
    name: "Kestrova State Police College",
    path: "police",
    country: "kestrova",
    city: "Ironmoor",
    district: "checkpoint_row",
    tuition: 400,
    dean: "Colonel Marta Dragan",
    description: "Cheap, brutal and strict. Its graduates are the toughest officers on the continent.",
    entrance: 22,
    requirements: (p) => basics(p, 10),
  },
  {
    id: "solace_finance",
    name: "Solace Institute of Finance",
    path: "banking",
    country: "solmarra",
    city: "Port Solace",
    district: "exchange",
    tuition: 1500,
    dean: "Chancellor Rafael Montoya",
    description: "Where the rich send their children to learn how money really moves.",
    entrance: 16,
    requirements: (p) => basics(p, 15),
  },
  {
    id: "ironmoor_military",
    name: "Ironmoor Military Academy",
    path: "military",
    country: "kestrova",
    city: "Ironmoor",
    district: "checkpoint_row",
    tuition: 450,
    dean: "General Piotr Hale",
    description: "Basic training. Twelve weeks of mud, drills and shouting. Graduates are issued a service rifle.",
    entrance: 20,
    requirements: (p) => basics(p, 10),
  },
  {
    id: "meridian_law",
    name: "Meridian Corporate Law School",
    path: "courts",
    country: "meridian",
    city: "Halcyon",
    district: "glass_quarter",
    tuition: 2500,
    dean: "Dean Lucinda Vance",
    description: "Where corporations send the lawyers they'll one day hire. Contracts, mergers, and how to lose a file politely.",
    entrance: 22,
    requirements: (p) => basics(p, 25),
  },
  {
    id: "halcyon_tech",
    name: "Halcyon Tech Institute",
    path: "hacker",
    country: "meridian",
    city: "Halcyon",
    district: "tech_park",
    tuition: 1800,
    dean: "Rector Ines Talvik",
    description: "Officially, network security. Unofficially, how to walk through any door with a keyboard.",
    entrance: 20,
    requirements: (p) => basics(p, 15),
  },
  {
    id: "grayhaven_fire",
    name: "Grayhaven Fire Academy",
    path: "fire",
    country: "varrow",
    city: "Grayhaven",
    district: "precinct_square",
    tuition: 500,
    dean: "Deputy Chief Rosa Imbert",
    description: "Ladders, hoses and heat you can feel through the gear. Graduates learn to read a fire like a crime scene.",
    entrance: 19,
    requirements: (p) => basics(p, 10),
  },
];

export const SCHOOL_BY_ID = Object.fromEntries(SCHOOLS.map((s) => [s.id, s])) as Record<string, SchoolDef>;
/** Schools offering a career; a career's contact vouches only at its home school (PATHS[path].school). */
export function schoolsFor(path: PathId): SchoolDef[] {
  return SCHOOLS.filter((s) => s.path === path);
}
