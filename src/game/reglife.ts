// The regulars live in the city like players do. When they're out on the street they work their
// career's jobs (paid, a little experience, slow promotions up to a cap), and they spend what
// they earn: food when they're worn out, a medkit when they're hurt, a weapon or armor from
// their own city's shop when they lack one.
//
// They play by the shop rules: limited stock, the owner's price, and they never take the last
// piece off a shelf, so a player is never shut out by a regular.

import { ITEM_BY_ID, ITEMS } from "./content/items";
import { JOBS, type JobDef } from "./content/jobs";
import { applyAction, countryOf, inHospital, inJail } from "./engine";
import { equippedId, usesLeft } from "./gear";
import { creditSale, shopMarkups } from "./shops";
import { taxOn } from "./city";
import { jobAudience } from "./feed";
import { carried } from "./stock";
import { defFor, regularStats } from "./regulars";
import { playerMaxHp } from "./wounds";
import { STAT_KEYS, type City, type Player, type Rng } from "./types";

export const LIFE = {
  /** A regular out on the street does a job about this often. */
  jobEveryMs: 60 * 60_000,
  /** Experience from a job, as a share of what a player gets. */
  xpShare: 0.3,
  /** Jobs a regular needs per rank before a promotion (slow on purpose). */
  jobsPerRank: 30,
  /** How far above their starting rank a regular can climb. Heavies don't climb. */
  climb: 2,
  /** Money a regular keeps back after shopping. */
  reserve: 40,
  /** Never take a shelf below this. */
  shelfFloor: 1,
  /** A regular eats a bought meal about this often. */
  mealEveryMs: 6 * 60 * 60_000,
  /** A meal costing up to this share of their cash is small change (they'll pick the best such). */
  mealShare: 0.12,
  /** They move up a home when they hold this many times its price, and never past this level. */
  homeCushion: 1.5,
  maxHousing: 3,
};

const pick = <T,>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];

/** The highest rank this regular can reach. */
export function rankCap(p: Player): number {
  const def = defFor(p);
  if (!def || !def.path) return 0;
  return def.heavy ? def.rank : Math.min(8, def.rank + LIFE.climb);
}

/** The jobs a regular can do: their career's, up to their rank (no hidden or risky ones). */
export function regularJobs(p: Player): JobDef[] {
  return JOBS.filter((j) => !j.reveal && !j.requires && !j.heat && (j.path ?? null) === (p.path ?? null) && (j.minRank ?? 1) <= Math.max(1, p.rank));
}

const busy = (p: Player, now: number) => p.dead || inJail(p, now) || inHospital(p, now);

/** A line for the street feed (null: the work isn't announced). */
export type WorkLine = { text: string; to?: "officials" };

/** One job, if it's time. Returns a line for the street feed. */
export function regularWork(p: Player, now: number, rng: Rng, city?: City | null): WorkLine | null {
  if (!p.regular || busy(p, now)) return null;
  if (now - (p.regular.workAt ?? 0) < LIFE.jobEveryMs) return null;
  const jobs = regularJobs(p).filter((j) => j.energy <= p.energy);
  if (!jobs.length) return null;
  // Mostly the best work they can do, sometimes something simpler.
  const best = jobs.filter((j) => (j.minRank ?? 1) === Math.max(...jobs.map((x) => x.minRank ?? 1)));
  const job = rng() < 0.7 ? pick(best, rng) : pick(jobs, rng);
  p.regular.workAt = now;
  p.energy -= job.energy;
  // Paid like anyone else: city tax comes out of the pay and goes to the treasury.
  const gross = Math.round(job.pay[0] + rng() * (job.pay[1] - job.pay[0]));
  const tax = city && city.country === countryOf(p) ? taxOn(gross, city.taxRate) : 0;
  if (city && tax > 0) city.treasury += tax;
  p.cash += gross - tax;
  for (const k of STAT_KEYS) p.stats[k] += (job.xp[k] ?? 0) * LIFE.xpShare;
  p.regular.jobs = (p.regular.jobs ?? 0) + 1;
  const seen = jobAudience(job.tag);
  const line: WorkLine | null = seen === "secret" ? null : { text: `${p.name} · ${job.name}`, ...(seen === "officials" ? { to: "officials" as const } : {}) };
  // Promotions come slowly, and stop at the cap.
  if (p.path && p.rank < rankCap(p) && p.regular.jobs >= LIFE.jobsPerRank * Math.max(1, p.rank)) {
    p.rank += 1;
    p.regular.jobs = 0;
    const def = defFor(p);
    if (def) {
      const lift = regularStats(def, p.rank);
      for (const k of STAT_KEYS) p.stats[k] = Math.max(p.stats[k], lift[k]);
    }
    return { text: `${p.name} got a promotion.` };
  }
  return line;
}

const sellable = (id: string) => {
  const d = ITEM_BY_ID[id];
  return !!d && !d.issued && !d.contraband;
};

/**
 * What the regular would buy right now, if anything, in the order a person would:
 *  - a medkit when they're laid up in hospital (once per stay) or badly hurt;
 *  - a meal every few hours;
 *  - a weapon or armor when they have none that works (only if the shelf keeps one for players);
 *  - a better place to live when they can comfortably afford the next step up.
 */
export function regularWant(p: Player, c: City | null, now: number): string | null {
  if (!p.regular || p.dead || inJail(p, now)) return null;
  const spend = p.cash - LIFE.reserve;
  const affordable = (kind: string) => ITEMS.filter((i) => i.kind === kind && i.price <= spend).sort((a, b) => a.price - b.price);
  const laidUp = inHospital(p, now);
  if ((laidUp ? p.regular.medStay !== p.hospitalUntil : p.hp < playerMaxHp(p) * 0.5) && !p.inventory.medkit) {
    const med = affordable("medical")[0];
    if (med) return med.id;
  }
  if (laidUp) return null;
  if (now - (p.regular.ateAt ?? 0) >= LIFE.mealEveryMs && p.fullUntil <= now) {
    // The best meal that's still small change to them; the cheapest if money is tight.
    const meals = affordable("food").filter((m) => !m.boost);
    const treat = meals.filter((m) => m.price <= p.cash * LIFE.mealShare).pop();
    const meal = treat ?? meals[0];
    if (meal) return meal.id;
  }
  if (!c) return null;
  for (const slot of ["weapon", "armor"] as const) {
    const cur = equippedId(p, slot);
    if (cur && usesLeft(p, cur) > 0) continue;
    const shop = slot === "weapon" ? "guns" : "armor";
    // The best piece they can afford that the shop can spare.
    const options = carried(c.country, shop)
      .filter((id) => sellable(id) && (c.stock?.[id] ?? 0) > LIFE.shelfFloor && ITEM_BY_ID[id].price <= spend)
      .sort((a, b) => ITEM_BY_ID[b].price - ITEM_BY_ID[a].price);
    if (options[0]) return options[0];
  }
  const home = ITEMS.filter((i) => i.kind === "housing" && (i.housing ?? 0) === p.housing + 1)[0];
  if (home && p.housing < LIFE.maxHousing && p.cash >= home.price * LIFE.homeCushion) return home.id;
  return null;
}

/**
 * The regular buys it (and eats or uses it right away if it's food or a medkit). Gear comes off
 * the city's shelf, and the shop's owner gets the sale. Returns a line, or null if nothing was bought.
 */
export function regularShop(p: Player, c: City | null, now: number, rng: Rng): string | null {
  const id = regularWant(p, c, now);
  if (!id) return null;
  const item = ITEM_BY_ID[id];
  const gear = item.kind === "weapon" || item.kind === "armor";
  try {
    applyAction(p, { type: "buy", itemId: id }, now, rng, { shopMarkups: c ? shopMarkups(c) : undefined });
  } catch {
    return null;
  }
  if (gear && c) {
    c.stock = { ...(c.stock ?? {}), [id]: Math.max(0, (c.stock?.[id] ?? 0) - 1) };
    const slot = item.kind as "weapon" | "armor";
    p.equipped = { ...(p.equipped ?? { weapon: null, armor: null }), [slot]: id };
  }
  if (p.shopSale) {
    if (c) creditSale(c, p.shopSale.kind, p.shopSale.amount, now);
    p.shopSale = null;
  }
  if (p.taxOwed) {
    if (c && c.country === p.taxOwed.country) c.treasury += p.taxOwed.amount;
    p.taxOwed = null;
  }
  if (item.kind === "food" || item.kind === "medical") {
    try {
      applyAction(p, { type: "use", itemId: id }, now, rng);
    } catch {
      /* keeps it for later */
    }
    if (item.kind === "food") p.regular!.ateAt = now;
    else if (inHospital(p, now)) p.regular!.medStay = p.hospitalUntil;
    return null;
  }
  if (item.kind === "housing") return `${p.name} moved into a ${item.name.toLowerCase()}.`;
  return `${p.name} bought a ${item.name.toLowerCase()}.`;
}
