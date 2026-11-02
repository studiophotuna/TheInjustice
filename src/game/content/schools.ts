import { BALANCE } from "../balance";
import type { DistrictId, PathId, Player } from "../types";

export interface SchoolDef {
  id: string;
  name: string;
  path: PathId;
  country: string;
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
    country: "Varrow",
    city: "Grayhaven",
    district: "precinct_square",
    tuition: 400,
    dean: "Commander Ruth Okafor",
    description: "Twelve weeks of drills, law and humility. Graduates walk out with a badge.",
    entrance: 15,
    requirements: (p) => basics(p, 15),
  },
  {
    id: "halloway_law",
    name: "Halloway School of Law",
    path: "courts",
    country: "Varrow",
    city: "Grayhaven",
    district: "courthouse_hill",
    tuition: 600,
    dean: "Dean Theodore Halloway",
    description: "Old marble, older money. The school that trained half the judges in Varrow.",
    entrance: 15,
    requirements: (p) => basics(p, 20),
  },
];

export const SCHOOL_BY_ID = Object.fromEntries(SCHOOLS.map((s) => [s.id, s])) as Record<string, SchoolDef>;
export const SCHOOL_FOR_PATH = Object.fromEntries(SCHOOLS.map((s) => [s.path, s])) as Partial<Record<PathId, SchoolDef>>;
