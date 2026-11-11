// Runs the city's own incidents (see src/game/incidents.ts). Called by the five-minute timer and
// whenever someone opens the city's case files, so a city never goes quiet for long.
import { randomUUID } from "node:crypto";
import { COUNTRIES } from "@/game/content/world";
import { incidentDue, planIncident, runIncident } from "@/game/incidents";
import { GameError, type CountryId, type Player } from "@/game/types";
import { withCity } from "./city";
import { cityRegulars } from "./regulars";
import { LIFE, regularShop, regularWork } from "@/game/reglife";
import { pickTask, type CityWork, type Task } from "@/game/regcase";
import { arrest, joinTrial } from "@/game/justice";
import { investigate } from "@/game/crime";
import { examine, reviewDeposit } from "@/game/casework";
import { investigateFire } from "@/game/firehack";
import { npcScrub, repairWalkIn, treat } from "@/game/incidents";
import { standGuard } from "@/game/military";
import { fileRegular, regularCandidate, regularMayorDay, regularsVote } from "@/game/regcivic";
import { BALANCE } from "@/game/balance";
import { buyListing, regularPick } from "@/game/market";
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

/** One piece of a regular's city work, in its own transaction. Returns a street-feed line. */
async function doTask(store: Store, country: CountryId, regId: string, task: Task, w: CityWork, now: number): Promise<string | null> {
  const rng = Math.random;
  const mark = (p: Player) => {
    if (p.regular) p.regular.workAt = now;
  };
  switch (task.kind) {
    case "arrest":
    case "investigate":
    case "prosecute":
    case "examine":
    case "review":
      return store.transaction(async (tx) => {
        const c = await tx.getCase(task.caseId);
        if (!c) return null;
        const otherId =
          task.kind === "arrest" ? task.suspectId : task.kind === "examine" ? c.victimId : task.kind === "review" ? c.culpritId : null;
        const [p, other] = await tx.getPlayers(otherId && otherId !== regId ? [regId, otherId] : [regId]);
        if (!p) return null;
        tick(p, now);
        if (other) tick(other, now);
        let line: string;
        if (task.kind === "arrest") {
          if (!other) return null;
          const pool = w.people.filter((x) => x.id !== p.id).map((player) => ({ player, crewTag: w.tags.get(player.id) ?? null }));
          arrest(p, other, c, pool, w.tags.get(other.id) ?? null, now);
          line = `${p.name} arrested ${other.name} for the ${c.kind === "mug" ? "mugging" : c.kind === "snatch" ? "snatching" : "theft"} in ${c.district}.`;
        } else if (task.kind === "investigate") {
          investigate(p, c, now, rng);
          line = `${p.name} worked the scene in ${c.district} (case #${c.id}).`;
        } else if (task.kind === "prosecute") {
          joinTrial(p, c, "prosecutor", null, now);
          line = `${p.name} is prosecuting ${c.trial!.suspectName}.`;
        } else if (task.kind === "examine") {
          examine(p, c, other, now, rng);
          line = `${p.name} examined ${c.victimName}'s injuries for case #${c.id}.`;
        } else {
          reviewDeposit(p, c, other, "report", now, rng);
          line = `${p.name} flagged a suspicious deposit to the police.`;
        }
        mark(p);
        await tx.putPlayer(p);
        if (other) await tx.putPlayer(other);
        await tx.putCase(c);
        return line;
      });
    case "treat":
    case "scrub":
      return store.transaction(async (tx) => {
        const otherId = task.kind === "treat" ? task.patientId : task.clientId;
        const [p, other] = await tx.getPlayers([regId, otherId]);
        if (!p || !other) return null;
        tick(p, now);
        tick(other, now);
        if (task.kind === "treat") treat(p, other, now);
        else npcScrub(p, other, now);
        mark(p);
        await tx.putPlayer(p);
        await tx.putPlayer(other);
        // Record scrubs stay secret.
        return task.kind === "treat" ? `${p.name} treated ${other.name} in the ward.` : null;
      });
    case "fire":
    case "repair":
    case "guard":
      return withCity(store, country, now, async (c, tx) => {
        const fire = task.kind === "fire" ? (c.fires ?? []).find((f) => f.id === task.fireId) : null;
        const ids = fire && fire.arsonistId !== regId ? [regId, fire.arsonistId] : [regId];
        const [p, other] = await tx.getPlayers(ids);
        if (!p) return null;
        tick(p, now);
        if (other) tick(other, now);
        let line: string;
        if (task.kind === "fire") {
          if (!fire) return null;
          investigateFire(p, c, task.fireId, other ?? null, now, rng);
          line = fire.solved ? `${p.name} traced the ${fire.what} fire to ${fire.solved.arsonistName}.` : `${p.name} walked the burn scene at ${fire.what}.`;
        } else if (task.kind === "repair") {
          const job = (c.walkIns ?? []).find((x) => x.id === task.id);
          repairWalkIn(p, c, task.id, now);
          line = `${p.name} got ${job?.npcName ?? "a"}'s ${job?.what ?? "car"} back on the road.`;
        } else {
          standGuard(c, p, now);
          line = `${p.name} is standing guard at the bank.`;
        }
        mark(p);
        await tx.putPlayer(p);
        if (other) await tx.putPlayer(other);
        return line;
      });
  }
}

/**
 * The regulars' day. Those out on the street do their career's city work when there is some
 * (the same rules as players), otherwise a career job, and then buy what they need.
 */
export async function cityLife(store: Store, country: CountryId, now: number): Promise<number> {
  const regs = await cityRegulars(store, country, now);
  const due = regs.filter((r) => {
    const def = defFor(r);
    return def && scheduledOut(def, now) && now - (r.regular?.workAt ?? 0) >= LIFE.jobEveryMs;
  });
  if (!due.length) return 0;
  const [real, cases, crews, city] = await Promise.all([store.listPlayers(country, 200), store.listCases(country, 100), store.listCrews(200), store.getCity(country)]);
  const crewTag = new Map(crews.map((c) => [c.id, c.tag]));
  const people = [...real, ...regs];
  const w: CityWork = { city, cases, people, tags: new Map(people.map((x) => [x.id, x.crewId ? crewTag.get(x.crewId) ?? null : null])) };
  const lines: string[] = [];
  const worked = new Set<string>();
  for (const r of due) {
    const task = pickTask(r, w, now);
    if (!task) continue;
    const line = await doTask(store, country, r.id, task, w, now).catch((e) => {
      // Someone got there first, or the case moved on: they'll do a job instead.
      if (!(e instanceof GameError)) console.error(`casework ${r.id}`, e);
      return null;
    });
    if (line !== null || task.kind === "scrub") worked.add(r.id);
    // Keep this run's picture of the city current, so two regulars don't take the same post.
    if (line && task.kind === "guard" && w.city) w.city.guards = [...(w.city.guards ?? []), { id: r.id, name: r.name, until: now + 60 * 60_000 }];
    if (line) lines.push(line);
  }
  // Everyone else works a career job; everyone shops.
  await withCity(store, country, now, async (c, tx) => {
    const locked = await tx.getPlayers(due.map((r) => r.id));
    for (const p of locked) {
      if (!p) continue;
      tick(p, now);
      const job = worked.has(p.id) ? null : regularWork(p, now, Math.random);
      const bought = regularShop(p, c, now, Math.random);
      for (const l of [job, bought]) if (l) lines.push(l);
      // The black market: a regular buys a piece a player put up, and the seller gets paid.
      const wanted = regularPick(c, p, now);
      if (wanted) {
        const [seller] = await tx.getPlayers([wanted.sellerId]);
        try {
          if (seller) tick(seller, now);
          buyListing(c, p, seller ?? null, wanted.id, now);
          p.regular!.marketAt = now;
          if (seller) await tx.putPlayer(seller);
        } catch (e) {
          if (!(e instanceof GameError)) throw e;
        }
      }
      await tx.putPlayer(p);
    }
    if (lines.length) c.street = [...lines.map((text, i) => ({ at: now - i * 1000, text })), ...(c.street ?? [])].slice(0, 15);
  });
  return lines.length;
}

/** City hall: a regular may file for mayor, regulars vote, and a regular mayor governs. */
export async function cityCivic(store: Store, country: CountryId, now: number): Promise<void> {
  const regs = await cityRegulars(store, country, now);
  const real = await store.listPlayers(country, 200);
  await withCity(store, country, now, async (c, tx) => {
    const cand = regularCandidate(c, regs, now);
    if (cand) {
      const [r] = await tx.getPlayers([cand.id]);
      if (r && r.cash >= BALANCE.city.runFee) {
        tick(r, now);
        fileRegular(c, r, now, Math.random);
        await tx.putPlayer(r);
      }
    }
    regularsVote(c, regs, [...real, ...regs], now, Math.random);
    if (c.mayor?.id.startsWith("reg-")) {
      const [m] = await tx.getPlayers([c.mayor.id]);
      if (m) {
        tick(m, now);
        regularMayorDay(c, m, [...real, ...regs], now, Math.random);
        await tx.putPlayer(m);
      }
    }
  });
}

/** Every city, for the timer. One city failing never stops the others. */
export async function allCityIncidents(store: Store, now: number) {
  const out: Partial<Record<CountryId, string | null>> = {};
  for (const { id } of COUNTRIES) {
    out[id] = await cityIncident(store, id, now).catch((e) => (console.error(`incident ${id}`, e), null));
    await cityLife(store, id, now).catch((e) => console.error(`city life ${id}`, e));
    await cityCivic(store, id, now).catch((e) => console.error(`city hall ${id}`, e));
  }
  return out;
}
