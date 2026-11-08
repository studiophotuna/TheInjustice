// Bankers' laundering service, drug busts, crew drug labs, money-laundering investigations.

import { assertNotAlt } from "./anticheat";
import { BALANCE } from "./balance";
import { DISTRICTS } from "./content/districts";
import { COUNTRY_BY_ID } from "./content/world";
import { DRUGS, science, type DrugId } from "./drugs";
import { addMerit, countryOf, inJail, shiftIntegrity } from "./engine";
import { notify } from "./social";
import { sv } from "./stats";
import { GameError, type City, type Crew, type GameEvent, type Player, type Rng } from "./types";

const L = BALANCE.launderService;
const B = BALANCE.drugBust;
const LAB = BALANCE.lab;
const I = BALANCE.launderProbe;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const carried = (p: Player) => Object.values(p.drugs ?? {}).reduce((s, n) => s + (n ?? 0), 0);

// ── Bankers' laundering service ────────────────────────────────────────────

export const isBankStaff = (p: Player) => p.path === "banking" && p.rank >= L.minRank;

/** A banker (teller or above) opens their service and sets their own fee. */
export function setLaunderService(b: Player, open: boolean, fee: number): GameEvent[] {
  if (!isBankStaff(b)) throw new GameError("Only bank staff can do that.");
  if (open && (!Number.isFinite(fee) || fee < L.minFee || fee > L.maxFee)) {
    throw new GameError(`Set a fee between ${Math.round(L.minFee * 100)}% and ${Math.round(L.maxFee * 100)}%.`);
  }
  b.launderService = open ? { fee: Math.round(fee * 100) / 100 } : null;
  return [{ tone: "info", text: open ? `You'll clean money for ${Math.round(b.launderService!.fee * 100)}%. Quietly.` : "You stop taking dirty money." }];
}

export function serviceBlock(client: Player, banker: Player | null, amount: number): string | null {
  if (!banker?.launderService || banker.dead) return "That banker isn't taking clients.";
  if (banker.id === client.id) return "Use your own back office.";
  if (countryOf(banker) !== countryOf(client)) return "They work in another country.";
  if (inJail(banker, Date.now())) return "They're behind bars.";
  if (!Number.isFinite(amount) || amount <= 0) return "How much?";
  if (amount > (client.dirty ?? 0)) return "You don't have that much dirty money.";
  return null;
}

/**
 * The banker runs the client's dirty money through the bank. The client gets clean cash minus
 * the banker's fee; the banker keeps the fee (clean) and a ledger internal affairs can find.
 * Returns a flag when the amount is big enough to catch the attention of investigators.
 */
export function launderWithBanker(client: Player, banker: Player, amount: number, now: number): { events: GameEvent[]; flag: boolean } {
  assertNotAlt(client, banker);
  const a = Math.floor(amount);
  const block = serviceBlock(client, banker, a);
  if (block) throw new GameError(block);
  const fee = Math.ceil(a * banker.launderService!.fee);
  client.dirty = (client.dirty ?? 0) - a;
  client.cash += a - fee;
  banker.cash += fee;
  shiftIntegrity(banker, -2);
  banker.launderLog = [...(banker.launderLog ?? []), { at: now, amount: a }].slice(-50);
  addMerit(banker, "banking", 1);
  notify(banker, `A client ran $${a} through your books. Your fee: $${fee}.`, "info", undefined, now);
  return { events: [{ tone: "good", text: `${banker.name} cleans $${a}. You get $${a - fee} back clean (fee $${fee}).` }], flag: a >= I.threshold };
}

// ── Drug busts ─────────────────────────────────────────────────────────────

export function friskBlock(o: Player, t: Player, now: number): string | null {
  if (o.path !== "police" || o.rank < B.minRank) return "Only police officers can frisk people.";
  if (o.id === t.id) return "You can't frisk yourself.";
  if (countryOf(o) !== countryOf(t) || t.travel) return "They're not around.";
  if (inJail(t, now)) return "They're already behind bars.";
  if (t.heat < B.minHeat) return "No reason to stop them. They look clean.";
  if (now - (o.attackLog?.[`frisk:${t.id}`] ?? 0) < B.cooldownMs) return "You just searched them.";
  if (o.energy < B.energy) return "You're too tired.";
  return null;
}

/** Stop and frisk someone who's drawing attention. Drugs found: seized, and a cell. */
export function frisk(o: Player, t: Player, now: number, rng: Rng): GameEvent[] {
  const block = friskBlock(o, t, now);
  if (block) throw new GameError(block);
  o.energy -= B.energy;
  o.attackLog = { ...(o.attackLog ?? {}), [`frisk:${t.id}`]: now };
  const units = carried(t);
  const found = units > 0 && rng() < clamp(0.5 + (sv(o, "perception") - sv(t, "wits")) / 60, 0.2, 0.9);
  if (found) {
    t.drugs = {};
    const minutes = Math.min(B.maxJailMin, B.baseJailMin + units);
    t.jailUntil = Math.max(t.jailUntil ?? 0, now + minutes * 60_000);
    t.jailReason = `Caught with ${units} units of drugs.`;
    t.heat += 5;
    o.reputation += 2;
    o.jobCounts.arrest = (o.jobCounts.arrest ?? 0) + 1;
    notify(t, `${o.name} frisked you and found your stash. ${units} units seized; ${minutes} minutes in a cell.`, "bad", o, now);
    return [{ tone: "good", text: `Bust! ${units} units seized from ${t.name}. ${minutes} minutes in a cell.` }, ...addMerit(o, "police", 2)];
  }
  if (units > 0) {
    notify(t, `${o.name} frisked you. They didn't find anything. Lucky.`, "info", o, now);
    return [{ tone: "info", text: `You search ${t.name}. Nothing. Maybe.` }];
  }
  t.reputation += 1;
  o.reputation = Math.max(0, o.reputation - 1);
  notify(t, `${o.name} frisked you for nothing. +1 reputation.`, "info", o, now);
  return [{ tone: "info", text: `${t.name} is clean.` }];
}

// ── Crew drug labs ─────────────────────────────────────────────────────────

/** Suspicion cools by a point an hour. */
export function labHeat(c: Crew, now: number): number {
  const lab = c.lab;
  if (!lab) return 0;
  return Math.max(0, lab.heat - (now - lab.heatAt) / 3_600_000);
}

export function buildLab(c: Crew, p: Player, now: number, rng: Rng): GameEvent[] {
  if (c.leaderId !== p.id) throw new GameError("Only the crew leader can set up a lab.");
  if (c.lab) throw new GameError("Your crew already has a lab.");
  if (c.vault < LAB.cost) throw new GameError(`A lab costs $${LAB.cost} from the crew vault.`);
  const here = DISTRICTS.filter((d) => d.country === countryOf(p));
  const district = here[Math.floor(rng() * here.length)];
  c.vault -= LAB.cost;
  c.lab = { country: countryOf(p), district: district.id, districtName: district.name, builtAt: now, heat: 0, heatAt: now, batches: 0 };
  c.log = [{ at: now, text: `${p.name} set up a lab in ${district.name}. Members with chemistry can cook there.` }, ...c.log].slice(0, 30);
  return [{ tone: "good", text: `The lab is set up in ${district.name}. It cooks twice as much, but every batch makes the neighbors suspicious.` }];
}

export function labCookBlock(c: Crew, p: Player, drug: DrugId): string | null {
  const d = DRUGS[drug];
  if (!c.lab) return "Your crew has no lab.";
  if (countryOf(p) !== c.lab.country) return "The lab is in another country.";
  if (science(p) < d.science) return "You don't know enough chemistry for that.";
  if ((p.supplies ?? 0) < d.supplies) return `You need ${d.supplies} box${d.supplies > 1 ? "es" : ""} of lab supplies.`;
  if (p.energy < d.energy) return "You're too tired.";
  if (carried(p) >= BALANCE.drugs.maxCarry) return "You're carrying too much already.";
  return null;
}

/** Cooking in the crew lab: twice the output, half the accidents, and the lab gets hotter. */
export function labCook(c: Crew, p: Player, drug: DrugId, now: number, rng: Rng): GameEvent[] {
  const block = labCookBlock(c, p, drug);
  if (block) throw new GameError(block);
  const d = DRUGS[drug];
  const sci = science(p);
  p.supplies = (p.supplies ?? 0) - d.supplies;
  p.energy -= d.energy;
  shiftIntegrity(p, -2);
  const lab = c.lab!;
  lab.heat = labHeat(c, now) + LAB.heatPerBatch;
  lab.heatAt = now;
  lab.batches += 1;
  if (rng() < Math.min(0.15, Math.max(0.03, (0.3 - (sci - d.science) / 100) / 2))) {
    lab.heat += LAB.heatPerBatch;
    return [{ tone: "bad", text: "A batch boils over in the lab. Nobody's hurt, but the whole street smells it." }];
  }
  const units = Math.min(BALANCE.drugs.maxCarry - carried(p), (1 + Math.floor(sci / 30)) * 2);
  p.drugs = { ...(p.drugs ?? {}), [drug]: (p.drugs?.[drug] ?? 0) + units };
  return [{ tone: "good", text: `The crew lab turns out ${units} × ${d.name}.` }];
}

/** Labs hot enough for the police to hear about (district only, never the crew). */
export function labTips(crews: Crew[], country: string, now: number) {
  return crews
    .filter((c) => c.lab && c.lab.country === country && labHeat(c, now) >= LAB.tipHeat)
    .map((c) => ({ crewId: c.id, district: c.lab!.districtName, heat: Math.round(labHeat(c, now)) }));
}

/** A detective raids a lab the neighbors complained about. */
export function raidLab(o: Player, c: Crew, now: number, rng: Rng): GameEvent[] {
  if (o.path !== "police" || o.rank < BALANCE.crime.detectiveRank) throw new GameError("Only detectives lead raids.");
  if (!c.lab || labHeat(c, now) < LAB.tipHeat) throw new GameError("There's nothing to go on.");
  if (countryOf(o) !== c.lab.country) throw new GameError("That's in another country.");
  if (c.members.some((m) => m.id === o.id)) throw new GameError("Raid your own crew's lab? Bold.");
  if (o.energy < LAB.raidEnergy) throw new GameError("You're too tired.");
  o.energy -= LAB.raidEnergy;
  const heat = labHeat(c, now);
  const district = c.lab.districtName;
  if (rng() < clamp(0.4 + (sv(o, "perception") - 10) / 60 + heat / 200, 0.2, 0.9)) {
    const fine = Math.floor(c.vault * LAB.fineShare);
    c.vault -= fine;
    c.lab = null;
    c.log = [{ at: now, text: `The police raided the lab in ${district}. It's gone, and $${fine} from the vault went with it.` }, ...c.log].slice(0, 30);
    o.reputation += 4;
    return [{ tone: "good", text: `Raid in ${district}: a drug lab, shut down. ${c.name} [${c.tag}] loses it and $${fine}.` }, ...addMerit(o, "police", 4)];
  }
  c.lab.heat = Math.max(0, heat - 15);
  c.lab.heatAt = now;
  c.log = [{ at: now, text: `Someone tipped you off: the police hit the wrong door in ${district}.` }, ...c.log].slice(0, 30);
  return [{ tone: "info", text: `You kick in the door in ${district}. Empty. Someone tipped them off.` }];
}

export function labView(c: Crew, p: Player, now: number) {
  if (!c.lab) return null;
  const heat = labHeat(c, now);
  return {
    district: c.lab.districtName,
    city: COUNTRY_BY_ID[c.lab.country].capital,
    batches: c.lab.batches,
    suspicion: heat < 10 ? "quiet" : heat < LAB.tipHeat ? "the neighbors talk" : heat < LAB.tipHeat * 2 ? "the police have heard" : "a raid is coming",
    cook: (Object.keys(DRUGS) as DrugId[]).filter((d) => science(p) >= DRUGS[d].science).map((d) => ({ id: d, name: DRUGS[d].name, block: labCookBlock(c, p, d) })),
  };
}

// ── Money-laundering investigations ────────────────────────────────────────

/** A big laundering leaves a flag for investigators (anonymous: an amount, a method, a time). */
export function flagLaundering(c: City, playerId: string, amount: number, method: string, now: number) {
  c.launderFlags = [{ id: `L${now.toString(36)}${Math.floor(Math.random() * 1000)}`, playerId, amount, method, at: now, tried: [] }, ...(c.launderFlags ?? [])].slice(0, 30);
}

export function probeBlock(o: Player, c: City, id: string): string | null {
  if (o.path !== "police" || o.rank < BALANCE.crime.detectiveRank) return "Only detectives run financial investigations.";
  if (countryOf(o) !== c.country) return "That's another country's case.";
  const f = c.launderFlags?.find((x) => x.id === id);
  if (!f || f.solved) return "That trail is closed.";
  if (f.tried.includes(o.id)) return "You already followed that trail.";
  if (f.playerId === o.id) return "Better not.";
  if (o.energy < I.energy) return "You're too tired.";
  return null;
}

/** A detective follows the money. If they find who laundered it, a fine and a cell. */
export function probeLaundering(o: Player, c: City, id: string, launderer: Player | null, now: number, rng: Rng): GameEvent[] {
  const block = probeBlock(o, c, id);
  if (block) throw new GameError(block);
  o.energy -= I.energy;
  const f = c.launderFlags!.find((x) => x.id === id)!;
  f.tried.push(o.id);
  if (!launderer || rng() >= clamp(0.35 + (sv(o, "wits") + sv(o, "perception") - 20) / 120, 0.15, 0.85)) {
    return [{ tone: "info", text: "The money went through too many hands. The trail goes cold." }];
  }
  f.solved = true;
  const fine = Math.floor(f.amount * I.fineShare);
  const fromCash = Math.min(launderer.cash, fine);
  launderer.cash -= fromCash;
  launderer.bank -= Math.min(launderer.bank, fine - fromCash);
  launderer.jailUntil = Math.max(launderer.jailUntil ?? 0, now + I.jailMs);
  launderer.jailReason = "Held on money-laundering charges.";
  o.reputation += 3;
  notify(launderer, `A detective traced the $${f.amount} you laundered. Fined $${fine} and held for ${Math.round(I.jailMs / 60_000)} minutes.`, "bad", o, now);
  c.log = [{ at: now, text: `Detectives crack a $${f.amount} money-laundering case.` }, ...c.log].slice(0, 20);
  return [{ tone: "good", text: `You follow the money to ${launderer.name}. Fined $${fine} and held.` }, ...addMerit(o, "police", 3)];
}

export function flagsView(c: City, o: Player, now: number) {
  return (c.launderFlags ?? [])
    .filter((f) => !f.solved && now - f.at < I.windowMs)
    .map((f) => ({ id: f.id, amount: f.amount, method: f.method, at: f.at, canProbe: probeBlock(o, c, f.id) }));
}
