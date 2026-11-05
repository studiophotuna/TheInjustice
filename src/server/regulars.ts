import { BALANCE } from "@/game/balance";
import { createPlayer, inHospital, inJail, tick } from "@/game/engine";
import { regularId, regularStats, regularsOut, regularUpkeep, REGULARS, ROSTER } from "@/game/regulars";
import type { CountryId, Player } from "@/game/types";
import type { getStore } from "./store";

type Store = ReturnType<typeof getStore>;

/** Builds a regular's character. They've "lived here" for a while, so they're not protected. */
export function makeRegular(country: CountryId, key: string, now: number): Player {
  const def = ROSTER[country].find((d) => d.key === key)!;
  const p = createPlayer(regularId(country, key), def.name, now - 60 * 24 * 60 * 60_000, country);
  p.tickAt = now;
  p.path = def.path;
  p.rank = def.path ? def.rank : 0;
  p.stats = { ...p.stats, ...regularStats(def) };
  p.reputation = def.heavy?.rep ?? 5 + def.rank * 8;
  p.profile = { bio: def.bio, photo: null, updatedAt: now };
  p.regular = { country, key, slot: -1 };
  regularUpkeep(p, now);
  return p;
}

/** The city's regulars, creating any that don't exist yet. Ticked to `now`. */
export async function cityRegulars(store: Store, country: CountryId, now: number): Promise<Player[]> {
  let list = await store.listRegulars(country);
  const have = new Set(list.map((p) => p.regular?.key));
  const missing = ROSTER[country].filter((d) => !have.has(d.key));
  if (missing.length) {
    for (const d of missing) {
      // One bad entry must never take the city's pages down with it.
      try {
        await store.update(regularId(country, d.key), (p) => ({ player: p ?? makeRegular(country, d.key, now), result: null }));
      } catch (e) {
        console.error(`Could not create regular ${country}/${d.key}`, e);
      }
    }
    list = await store.listRegulars(country);
  }
  list.forEach((p) => tick(p, now));
  return list;
}

/** Regulars out on the street right now, marked as just seen. */
export async function regularsOnStreet(store: Store, country: CountryId, realOnline: number, now: number): Promise<{ all: Player[]; out: Player[] }> {
  const all = await cityRegulars(store, country, now);
  const out = regularsOut(all, realOnline, now, (p) => inHospital(p, now) || inJail(p, now));
  for (const p of out) p.seenAt = now;
  return { all, out };
}

export const realOnlineCount = (people: Player[], now: number) => people.filter((o) => !o.dead && now - (o.seenAt ?? 0) < BALANCE.onlineMs).length;

export { REGULARS };
