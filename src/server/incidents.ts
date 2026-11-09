// Runs the city's own incidents (see src/game/incidents.ts). Called by the five-minute timer and
// whenever someone opens the city's case files, so a city never goes quiet for long.
import { randomUUID } from "node:crypto";
import { COUNTRIES } from "@/game/content/world";
import { incidentDue, planIncident, runIncident } from "@/game/incidents";
import type { CountryId } from "@/game/types";
import { withCity } from "./city";
import { cityRegulars } from "./regulars";
import { regularShop, regularWork } from "@/game/reglife";
import { defFor, scheduledOut } from "@/game/regulars";
import { tick } from "@/game/engine";
import type { getStore } from "./store";

type Store = ReturnType<typeof getStore>;

export async function cityIncident(store: Store, country: CountryId, now: number): Promise<string | null> {
  const city = await store.getCity(country);
  if (city && !incidentDue(city, now)) return null;
  const regs = await cityRegulars(store, country, now);
  const plan = planIncident(regs, now, Math.random);
  if (!plan) return null;
  const caseId = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return withCity(store, country, now, async (c, tx) => {
    // Someone else got here first.
    if (!incidentDue(c, now)) return null;
    const ids = [plan.victimId, ...(plan.culpritId ? [plan.culpritId] : [])];
    const got = await tx.getPlayers(ids);
    const victim = got[0];
    const culprit = plan.culpritId ? got[1] : null;
    if (!victim || (plan.culpritId && !culprit)) {
      c.incidentAt = now;
      return null;
    }
    const out = runIncident(plan.kind, culprit, victim, c, now, Math.random, caseId);
    await tx.putPlayer(victim);
    if (culprit) await tx.putPlayer(culprit);
    if (out.caseFile) await tx.putCase(out.caseFile);
    c.log = [{ at: now, text: out.line }, ...c.log].slice(0, 20);
    return out.line;
  });
}

/**
 * The regulars' day: those out on the street do a job when it's time and buy what they need.
 * One city transaction, so shelves and shop tills stay consistent.
 */
export async function cityLife(store: Store, country: CountryId, now: number): Promise<number> {
  const regs = await cityRegulars(store, country, now);
  const due = regs.filter((r) => {
    const def = defFor(r);
    return def && scheduledOut(def, now) && now - (r.regular?.workAt ?? 0) >= 60 * 60_000;
  });
  if (!due.length) return 0;
  return withCity(store, country, now, async (c, tx) => {
    const lines: string[] = [];
    const locked = await tx.getPlayers(due.map((r) => r.id));
    for (const p of locked) {
      if (!p) continue;
      tick(p, now);
      const worked = regularWork(p, now, Math.random);
      const bought = regularShop(p, c, now, Math.random);
      for (const l of [worked, bought]) if (l) lines.push(l);
      await tx.putPlayer(p);
    }
    if (lines.length) c.street = [...lines.map((text, i) => ({ at: now - i * 1000, text })), ...(c.street ?? [])].slice(0, 15);
    return lines.length;
  });
}

/** Every city, for the timer. One city failing never stops the others. */
export async function allCityIncidents(store: Store, now: number) {
  const out: Partial<Record<CountryId, string | null>> = {};
  for (const { id } of COUNTRIES) {
    out[id] = await cityIncident(store, id, now).catch((e) => (console.error(`incident ${id}`, e), null));
    await cityLife(store, id, now).catch((e) => console.error(`city life ${id}`, e));
  }
  return out;
}
