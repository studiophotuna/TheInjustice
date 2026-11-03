// Drugs: bought and sold on the street with dirty money (or cash), cooked from lab supplies by
// people who know some science (doctors, or anyone sharp enough). Street prices differ by
// city and change every hour, so smuggling between countries pays, if customs doesn't catch you.

import { BALANCE } from "./balance";
import { COUNTRY_BY_ID } from "./content/world";
import { countryOf, shiftIntegrity } from "./engine";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { sv } from "./stats";
import { GameError, type CountryId, type GameEvent, type Player, type Rng, type TravelMode } from "./types";

export type DrugId = "herb" | "pills" | "powder";

export interface DrugDef {
  id: DrugId;
  name: string;
  /** Base street price per unit. */
  base: number;
  /** Lab supplies used per batch. */
  supplies: number;
  energy: number;
  /** Science needed to cook it. */
  science: number;
}

export const DRUGS: Record<DrugId, DrugDef> = {
  herb: { id: "herb", name: "Green", base: 20, supplies: 1, energy: 5, science: 10 },
  pills: { id: "pills", name: "Pills", base: 60, supplies: 2, energy: 10, science: 25 },
  powder: { id: "powder", name: "Powder", base: 150, supplies: 4, energy: 15, science: 40 },
};
export const DRUG_IDS = Object.keys(DRUGS) as DrugId[];
export const isDrug = (v: unknown): v is DrugId => typeof v === "string" && v in DRUGS;

const D = BALANCE.drugs;
/** Strict countries pay more for the risk; lax ones are flooded. */
const COUNTRY_MULT: Record<CountryId, number> = { varrow: 1, solmarra: 0.85, kestrova: 1.5, meridian: 1.3 };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** Street price this hour in this country (what dealers sell for). */
export function streetPrice(drug: DrugId, country: CountryId, now: number): number {
  const hour = Math.floor(now / 3_600_000);
  const swing = 0.75 + (hash(`${drug}:${country}:${hour}`) % 1000) / 2000; // 0.75–1.25
  return Math.max(1, Math.round(DRUGS[drug].base * COUNTRY_MULT[country] * swing));
}

/** What a dealer pays you (they take a cut). */
export const sellPrice = (drug: DrugId, country: CountryId, now: number) => Math.floor(streetPrice(drug, country, now) * D.sellShare);

const carried = (p: Player) => DRUG_IDS.reduce((s, d) => s + (p.drugs?.[d] ?? 0), 0);

/** How much someone knows about chemistry: doctors most, sharp minds a little. */
export function science(p: Player): number {
  const career = p.path === "medicine" ? 15 + p.rank * 5 : 0;
  return career + Math.max(0, sv(p, "wits") - 10);
}

export function buyDrugs(p: Player, drug: DrugId, qty: number, now: number): GameEvent[] {
  const n = Math.floor(qty);
  if (!Number.isFinite(n) || n < 1) throw new GameError("How many?");
  if (carried(p) + n > D.maxCarry) throw new GameError(`You can't hide more than ${D.maxCarry} units on you.`);
  const cost = streetPrice(drug, countryOf(p), now) * n;
  if (!canPayIllegal(p, cost)) throw new GameError(`That's $${cost}. Dealers take dirty money or cash.`);
  payIllegal(p, cost);
  p.drugs = { ...(p.drugs ?? {}), [drug]: (p.drugs?.[drug] ?? 0) + n };
  p.heat += D.heat * n * 0.5 * COUNTRY_BY_ID[countryOf(p)].heatMult;
  shiftIntegrity(p, -1);
  return [{ tone: "info", text: `${n} × ${DRUGS[drug].name} for $${cost}. Keep it out of sight.` }];
}

export function sellDrugs(p: Player, drug: DrugId, qty: number, now: number): GameEvent[] {
  const n = Math.floor(qty);
  if (!Number.isFinite(n) || n < 1) throw new GameError("How many?");
  if ((p.drugs?.[drug] ?? 0) < n) throw new GameError("You don't have that many.");
  const pay = sellPrice(drug, countryOf(p), now) * n;
  p.drugs = { ...p.drugs, [drug]: (p.drugs?.[drug] ?? 0) - n };
  earnDirty(p, pay);
  p.heat += D.heat * n * COUNTRY_BY_ID[countryOf(p)].heatMult;
  shiftIntegrity(p, -1);
  return [{ tone: "good", text: `Sold ${n} × ${DRUGS[drug].name}. +$${pay} dirty.` }];
}

/** Lab supplies are legal: bought with clean cash. */
export function buySupplies(p: Player, qty: number): GameEvent[] {
  const n = Math.floor(qty);
  if (!Number.isFinite(n) || n < 1) throw new GameError("How many?");
  const cost = D.supplyPrice * n;
  if (p.cash < cost) throw new GameError(`Lab supplies cost $${D.supplyPrice} each, clean cash.`);
  p.cash -= cost;
  p.supplies = (p.supplies ?? 0) + n;
  return [{ tone: "good", text: `${n} box${n > 1 ? "es" : ""} of lab supplies. Nobody asks what they're for.` }];
}

export function cookBlock(p: Player, drug: DrugId): string | null {
  const d = DRUGS[drug];
  if (science(p) < d.science) return "You don't know enough chemistry for that.";
  if ((p.supplies ?? 0) < d.supplies) return `You need ${d.supplies} box${d.supplies > 1 ? "es" : ""} of lab supplies.`;
  if (p.energy < d.energy) return "You're too tired.";
  if (carried(p) >= D.maxCarry) return "You're carrying too much already.";
  return null;
}

/** Cook a batch. Better chemists make more and blow up the lab less often. */
export function cook(p: Player, drug: DrugId, rng: Rng): GameEvent[] {
  const block = cookBlock(p, drug);
  if (block) throw new GameError(block);
  const d = DRUGS[drug];
  const sci = science(p);
  p.supplies = (p.supplies ?? 0) - d.supplies;
  p.energy -= d.energy;
  shiftIntegrity(p, -2);
  p.stats.wits += 0.3;
  const failChance = Math.min(0.3, Math.max(0.05, 0.3 - (sci - d.science) / 100));
  if (rng() < failChance) {
    p.hp = Math.max(5, p.hp - 15);
    p.heat += 3;
    return [{ tone: "bad", text: "The batch goes wrong. Smoke, a small fire, and a burned hand. The supplies are gone." }];
  }
  const units = Math.min(D.maxCarry - carried(p), 1 + Math.floor(sci / 30));
  p.drugs = { ...(p.drugs ?? {}), [drug]: (p.drugs?.[drug] ?? 0) + units };
  return [{ tone: "good", text: `You cook ${units} × ${d.name}. Clean work.` }];
}

/** Customs and checkpoints: the faster the trip, the closer they look. Returns a message if seized. */
export function smugglingCheck(p: Player, mode: TravelMode, rng: Rng): string | null {
  const n = carried(p);
  if (!n) return null;
  if (rng() >= D.seizeChance[mode]) return null;
  p.drugs = {};
  p.heat += 10;
  return `${mode === "plane" ? "Customs" : mode === "train" ? "A sniffer dog at the station" : "A checkpoint on the highway"} found your stash. ${n} units seized.`;
}

/** The street market as the player sees it. */
export function marketView(p: Player, now: number) {
  const c = countryOf(p);
  return {
    science: science(p),
    supplies: p.supplies ?? 0,
    supplyPrice: D.supplyPrice,
    carried: carried(p),
    maxCarry: D.maxCarry,
    drugs: DRUG_IDS.map((id) => ({
      id,
      name: DRUGS[id].name,
      buy: streetPrice(id, c, now),
      sell: sellPrice(id, c, now),
      have: p.drugs?.[id] ?? 0,
      canCook: cookBlock(p, id),
      knowHow: science(p) >= DRUGS[id].science,
      supplies: DRUGS[id].supplies,
    })),
  };
}
