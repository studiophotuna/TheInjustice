// Contract hits ("whacking"). A slow, expensive, risky Mafia contract with real counterplay.
//
// 1. The crew leader orders it and pays into escrow from the vault; a made man carries it out.
// 2. The hitman cases the target (three scouting trips over at least twelve hours). The target
//    notices something is off ("the same car three times today") without learning who, and can
//    hire bodyguards, lie low in a safe house, or go to the police.
// 3. Detectives can stake out a reported threat: if they catch the hitman, the hit is blown and
//    the hitman goes to a cell for conspiracy.
// 4. The hit itself: the hitman's nerve, agility, strength and weapon against the target's
//    perception, toughness, armor and bodyguards. Botched, wounded, or whacked.
// 5. A player killed by a hit keeps their career but drops one rank, loses cash on hand, dirty
//    money and their equipped gear, and spends eight hours in the morgue. They get a vendetta:
//    they and their crew can go after the hitman for three days, through any protection.
// 6. Every hit that lands opens a murder (or attempted murder) case in the justice chain.

import { BALANCE } from "./balance";
import { ITEM_BY_ID } from "./content/items";
import { PATHS } from "./content/paths";
import { COUNTRY_BY_ID } from "./content/world";
import { addTip, crimeDistrict, eyeAccuracy, suspectProfile } from "./crime";
import { addMerit, countryOf, inHospital, inJail } from "./engine";
import { family, isMade } from "./family";
import { equippedId, gearPower, wearGear } from "./gear";
import { earnDirty } from "./money";
import { notify, protectedUntil } from "./social";
import { sv } from "./stats";
import { GameError, type CaseFile, type City, type CrimeKind, type Crew, type GameEvent, type HitContract, type Player, type Rng } from "./types";

export const HIT = {
  /** Made Man and up carry out hits. */
  minRank: 3,
  costBase: 25_000,
  costPerRank: 5_000,
  scouts: 3,
  scoutEnergy: 20,
  scoutGapMs: 60 * 60_000,
  caseMs: 12 * 60 * 60_000,
  executeEnergy: 30,
  hitmanCooldownMs: 3 * 24 * 60 * 60_000,
  targetCooldownMs: 7 * 24 * 60 * 60_000,
  rankGap: 3,
  morgueMs: 8 * 60 * 60_000,
  woundMs: [2 * 60 * 60_000, 6 * 60 * 60_000] as [number, number],
  killShare: 1 / 3,
  botchJailChance: 0.5,
  botchJailMs: 30 * 60_000,
  conspiracyJailMs: 45 * 60_000,
  vendettaMs: 3 * 24 * 60 * 60_000,
  lowMs: 3 * 24 * 60 * 60_000,
  cancelRefund: 0.5,
  // Counterplay
  bodyguardCost: 2_000,
  bodyguardMs: 24 * 60 * 60_000,
  lieLowCost: 300,
  lieLowMs: 6 * 60 * 60_000,
  lieLowCooldownMs: 24 * 60 * 60_000,
  stakeoutRank: 4,
  stakeoutEnergy: 20,
};

const SCOUT_HINTS = [
  "You've seen the same car three times today. Same driver. Never looks at you.",
  "Someone was standing across the street from your place for an hour. Gone when you looked again.",
  "A stranger at the bar knew your name. You never told it to him.",
];

/** Standing on the career ladder (no career counts as 0). */
const standing = (p: Player) => (p.path ? p.rank : 0);

export const hitCost = (target: Player) => HIT.costBase + HIT.costPerRank * standing(target);
export const bodyguarded = (p: Player, now: number) => (p.bodyguardUntil ?? 0) > now;
export const lyingLow = (p: Player, now: number) => (p.lieLowUntil ?? 0) > now;
export const inMorgue = (p: Player, now: number) => (p.whacked?.until ?? 0) > now;

/** Who can be the target of a hit right now (null = they can). */
function targetBlock(hitman: Player, target: Player, now: number): string | null {
  if (target.dead) return "They're already dead.";
  if (now < protectedUntil(target)) return "They're new in town. Even the family has rules.";
  if (inJail(target, now)) return "They're behind bars.";
  if (inHospital(target, now) || inMorgue(target, now)) return "They're in the hospital.";
  if (target.travel) return "They're on the road.";
  if (lyingLow(target, now)) return "They've gone to ground. Nobody knows where they are.";
  if (countryOf(target) !== countryOf(hitman)) return "They're in another country.";
  if (standing(target) < standing(hitman) - HIT.rankGap) return "They're too small. A hit on a nobody brings heat and no respect.";
  return null;
}

export function orderBlock(crew: Crew, leader: Player, hitman: Player | null, target: Player, now: number): string | null {
  if (crew.leaderId !== leader.id) return "Only the crew leader can sign off on a hit.";
  if (crew.hit) return "The crew already has a contract out.";
  if (!hitman || hitman.crewId !== crew.id) return "The hitman has to be in your crew.";
  if (hitman.path !== "enforcer" || hitman.rank < HIT.minRank || !isMade(hitman)) return `Only a made man (${PATHS.enforcer.ranks[HIT.minRank - 1]} and up) carries out a hit.`;
  if (now - (hitman.lastHitAt ?? 0) < HIT.hitmanCooldownMs) return `${hitman.name} did a job recently. Give it a few days.`;
  if (target.id === hitman.id) return "Not one of your own.";
  return contractBlock(crew, leader, target, now, hitman);
}

/** Whether this target can have a contract put out on them (before a hitman is chosen). */
export function contractBlock(crew: Crew, leader: Player, target: Player, now: number, hitman: Player = leader): string | null {
  if (crew.leaderId !== leader.id) return "Only the crew leader can sign off on a hit.";
  if (crew.hit) return "The crew already has a contract out.";
  if (target.id === leader.id || target.crewId === crew.id) return "Not one of your own.";
  if (crew.allies?.some((a) => a.id === target.crewId)) return "They're with an allied crew.";
  if (now - (target.hitContractAt ?? 0) < HIT.targetCooldownMs) return "Someone already put out a contract on them this week.";
  const tb = targetBlock(hitman, target, now);
  if (tb) return tb;
  if (crew.vault < hitCost(target)) return `A contract on them costs $${hitCost(target).toLocaleString("en")} from the vault.`;
  return null;
}

export function orderHit(crew: Crew, leader: Player, hitman: Player, target: Player, now: number): GameEvent[] {
  const block = orderBlock(crew, leader, hitman, target, now);
  if (block) throw new GameError(block);
  const cost = hitCost(target);
  crew.vault -= cost;
  crew.hit = {
    id: `${now.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    targetId: target.id,
    targetName: target.name,
    hitmanId: hitman.id,
    hitmanName: hitman.name,
    orderedBy: leader.name,
    placedAt: now,
    scouts: 0,
    lastScoutAt: 0,
    escrow: cost,
    country: countryOf(target),
  };
  target.hitContractAt = now;
  crew.log = [{ at: now, text: `${leader.name} signed off on a contract. ${hitman.name} has the job.` }, ...crew.log].slice(0, 30);
  if (hitman.id !== leader.id) notify(hitman, `${leader.name} gave you a contract: ${target.name}. Case them first. Open the Crew tab.`, "story", leader, now);
  return [{ tone: "good", text: `$${cost.toLocaleString("en")} goes into escrow. ${hitman.name} has the contract on ${target.name}.` }];
}

export function scoutBlock(crew: Crew, hitman: Player, target: Player, now: number): string | null {
  const h = crew.hit;
  if (!h || h.hitmanId !== hitman.id) return "You don't have a contract.";
  if (h.targetId !== target.id) return "That's not your target.";
  if (h.scouts >= HIT.scouts) return "You know their routine. Time to do it.";
  if (now - h.lastScoutAt < HIT.scoutGapMs) return "Don't be seen around them too often. Wait a while.";
  if (inJail(hitman, now)) return "You're in a cell.";
  if (hitman.energy < HIT.scoutEnergy) return "You're too tired to tail anyone.";
  return targetBlock(hitman, target, now);
}

/** Tail the target for a while. They get a bad feeling, but not your name. */
export function scoutTarget(crew: Crew, hitman: Player, target: Player, now: number): GameEvent[] {
  const block = scoutBlock(crew, hitman, target, now);
  if (block) throw new GameError(block);
  const h = crew.hit!;
  hitman.energy -= HIT.scoutEnergy;
  h.scouts += 1;
  h.lastScoutAt = now;
  target.watched = { crewId: crew.id, count: (target.watched?.count ?? 0) + 1, at: now, since: target.watched?.since ?? now };
  notify(target, SCOUT_HINTS[(h.scouts - 1) % SCOUT_HINTS.length], "bad", undefined, now);
  const left = HIT.scouts - h.scouts;
  return [{ tone: "info", text: left ? `You learn a little more about ${target.name}'s days. ${left} more to go.` : `You know where ${target.name} will be, and when.` }];
}

export function executeBlock(crew: Crew, hitman: Player, target: Player, now: number): string | null {
  const h = crew.hit;
  if (!h || h.hitmanId !== hitman.id) return "You don't have a contract.";
  if (h.targetId !== target.id) return "That's not your target.";
  if (h.scouts < HIT.scouts) return `Case them first (${h.scouts}/${HIT.scouts}).`;
  if (now - h.placedAt < HIT.caseMs) return "Not yet. Rushed jobs get people caught.";
  if (inJail(hitman, now)) return "You're in a cell.";
  if (inHospital(hitman, now)) return "You're in the hospital.";
  if (hitman.energy < HIT.executeEnergy) return "You're too tired.";
  return targetBlock(hitman, target, now);
}

/** The hitman's edge: nerve, agility, strength and the weapon in their hand. */
export function hitOdds(hitman: Player, target: Player, now: number): number {
  const att = (sv(hitman, "nerve") + sv(hitman, "agility") + sv(hitman, "strength")) / 3 + gearPower(hitman, "weapon") * 0.5;
  const def = (sv(target, "perception") + sv(target, "toughness")) / 2 + gearPower(target, "armor") * 0.5;
  let odds = Math.max(0.25, Math.min(0.6, 0.42 + (att - def) / 40));
  if (bodyguarded(target, now)) odds *= 0.55;
  return odds;
}

/** A player killed by a hit: a softer death than the street. Career kept, one rank lost. */
export function whack(p: Player, now: number) {
  if (p.path) p.rank = Math.max(1, p.rank - 1);
  p.jobsSinceRank = 0;
  p.cash = 0;
  p.dirty = 0;
  for (const slot of ["weapon", "armor"] as const) {
    const id = equippedId(p, slot);
    if (id && !ITEM_BY_ID[id]?.issued) delete p.inventory[id];
    if (p.equipped) p.equipped[slot] = null;
  }
  p.hp = 1;
  p.hospitalUntil = now + HIT.morgueMs;
  p.whacked = { at: now, until: now + HIT.morgueMs };
}

export interface HitContext {
  caseId: string;
  crewTag: string | null;
  witnesses: Player[];
}

/** The hit. Returns what happened and, if it landed, the murder case it left behind. */
export function executeHit(crew: Crew, hitman: Player, target: Player, city: City | null, now: number, rng: Rng, ctx: HitContext): { events: GameEvent[]; caseFile: CaseFile | null } {
  const block = executeBlock(crew, hitman, target, now);
  if (block) throw new GameError(block);
  const h = crew.hit!;
  crew.hit = null;
  hitman.energy -= HIT.executeEnergy;
  hitman.lastHitAt = now;
  const heatMult = COUNTRY_BY_ID[countryOf(hitman)].heatMult;
  const district = crimeDistrict(hitman, rng);
  target.watched = null;
  wearGear(hitman, ["weapon"], 3);
  const guarded = bodyguarded(target, now);

  if (rng() >= hitOdds(hitman, target, now)) {
    // Botched: the target saw who it was.
    hitman.heat += 30 * heatMult;
    crew.vault += Math.floor(h.escrow * 0.25);
    target.reputation += 3;
    hitman.vendetta = { victimId: target.id, crewId: target.crewId ?? null, until: now + HIT.vendettaMs };
    notify(target, `${hitman.name} tried to kill you in ${district}.${guarded ? " Your bodyguards got you out." : " You got away."} You know their face now, and for three days so does every friend you have.`, "bad", hitman, now);
    crew.log = [{ at: now, text: `The contract on ${h.targetName} went wrong.` }, ...crew.log].slice(0, 30);
    const events: GameEvent[] = [{ tone: "bad", text: `It goes wrong.${guarded ? " Bodyguards." : ""} ${target.name} gets away and saw your face.` }];
    if (rng() < HIT.botchJailChance) {
      hitman.jailUntil = Math.max(hitman.jailUntil ?? 0, now + Math.round(HIT.botchJailMs * heatMult));
      hitman.jailReason = `Arrested near ${district} after shots were fired.`;
      events.push({ tone: "bad", text: "Patrol cars everywhere. You don't make it out. You're in a cell." });
    }
    if (city) city.log = [{ at: now, text: `Shots fired in ${district}. Nobody was hurt.` }, ...city.log].slice(0, 20);
    return { events, caseFile: null };
  }

  const killed = rng() < HIT.killShare;
  hitman.heat += (killed ? 40 : 25) * heatMult;
  family(hitman).lowUntil = now + HIT.lowMs;
  hitman.vendetta = { victimId: target.id, crewId: target.crewId ?? null, until: now + HIT.vendettaMs };
  hitman.reputation += killed ? 8 : 4;
  // The hitman is paid from escrow: all of it for a kill, half for a wounding (the rest goes back).
  const pay = killed ? h.escrow : Math.floor(h.escrow / 2);
  earnDirty(hitman, pay);
  crew.vault += h.escrow - pay;
  addMerit(hitman, "enforcer", killed ? 6 : 3);

  if (killed) {
    whack(target, now);
    notify(target, `You were whacked in ${district}. You wake up on a steel table in the morgue. Eight hours before anyone lets you out. You lost a rank, your cash and the gear you carried. For three days, you and your crew can go after whoever did this, wherever they hide.`, "bad", undefined, now);
  } else {
    const [lo, hi] = HIT.woundMs;
    target.hp = 1;
    target.hospitalUntil = now + lo + Math.round(rng() * (hi - lo));
    target.cash = 0;
    wearGear(target, ["weapon", "armor"], 10);
    notify(target, `Someone shot you in ${district}. You'll live. The doctors want you in a hospital bed for hours. For three days, you and your crew can go after whoever did this.`, "bad", undefined, now);
  }
  crew.log = [{ at: now, text: killed ? `The contract on ${h.targetName} is done.` : `${h.targetName} survived, but it'll be a while before they walk again.` }, ...crew.log].slice(0, 30);
  if (city) city.log = [{ at: now, text: killed ? `Body found in ${district}. Police are treating it as murder.` : `Shooting in ${district}. ${target.name} is in the hospital.` }, ...city.log].slice(0, 20);

  // The case file: detectives, witnesses and a trial, like any crime, but with a far longer sentence.
  const kind: CrimeKind = killed ? "murder" : "attempted_murder";
  const c: CaseFile = {
    id: ctx.caseId,
    country: countryOf(hitman),
    district,
    kind,
    at: now,
    victimId: target.id,
    victimName: target.name,
    amount: 0,
    culpritId: hitman.id,
    suspect: suspectProfile(hitman, ctx.crewTag),
    tips: [],
    witnesses: ctx.witnesses.map((w) => w.id),
    investigatedBy: [],
  };
  if (!killed) addTip(c, "victim", eyeAccuracy(target), now, rng, target.id, "Victim");
  addTip(c, "bystander", 0.55, now, rng, undefined, "A neighbor");
  const text = killed ? `You heard shots in ${district}, and saw someone walk away fast.` : `You saw someone open fire on ${target.name} in ${district}.`;
  for (const w of ctx.witnesses) {
    w.sightings = [{ caseId: c.id, text, at: now, until: now + BALANCE.crime.sightingMs }, ...(w.sightings ?? []).filter((s) => s.until > now)].slice(0, 5);
  }
  hitman.myCases = [{ caseId: c.id, at: now, kind, district, victimName: target.name }, ...(hitman.myCases ?? [])].slice(0, 8);
  return {
    events: [{ tone: "good", text: killed ? `It's done. ${target.name} won't be getting up. $${pay.toLocaleString("en")} from escrow, dirty.` : `${target.name} goes down, but they'll live. Half the money: $${pay.toLocaleString("en")}, dirty.` }],
    caseFile: c,
  };
}

export function cancelHit(crew: Crew, leader: Player, now: number): GameEvent[] {
  if (crew.leaderId !== leader.id) throw new GameError("Only the leader can call it off.");
  const h = crew.hit;
  if (!h) throw new GameError("There's no contract.");
  const back = Math.floor(h.escrow * HIT.cancelRefund);
  crew.vault += back;
  crew.hit = null;
  crew.log = [{ at: now, text: `${leader.name} called off the contract on ${h.targetName}.` }, ...crew.log].slice(0, 30);
  return [{ tone: "info", text: `Called off. $${back.toLocaleString("en")} comes back to the vault; the rest is gone.` }];
}

// ── Counterplay ────────────────────────────────────────────────────────────

export function hireBodyguards(p: Player, now: number): GameEvent[] {
  if (p.cash < HIT.bodyguardCost) throw new GameError(`Bodyguards cost $${HIT.bodyguardCost.toLocaleString("en")} a day, cash.`);
  p.cash -= HIT.bodyguardCost;
  p.bodyguardUntil = Math.max(p.bodyguardUntil ?? now, now) + HIT.bodyguardMs;
  return [{ tone: "good", text: "Two large men in dark coats follow you everywhere for a day. Nobody comes close." }];
}

export function lieLow(p: Player, now: number): GameEvent[] {
  if (lyingLow(p, now)) throw new GameError("You're already lying low.");
  if (now - (p.lastLieLowAt ?? 0) < HIT.lieLowCooldownMs) throw new GameError("You can't vanish again so soon. People notice.");
  if (p.cash < HIT.lieLowCost) throw new GameError(`A safe house costs $${HIT.lieLowCost}, cash.`);
  p.cash -= HIT.lieLowCost;
  p.lastLieLowAt = now;
  p.lieLowUntil = now + HIT.lieLowMs;
  return [{ tone: "good", text: "You disappear into a safe house for six hours. No work, no fights. Nobody can find you." }];
}

/** The target tells the police someone is watching them. Detectives can stake it out. */
export function reportThreat(city: City, p: Player, now: number): GameEvent[] {
  const w = p.watched;
  if (!w || now - w.at > 48 * 60 * 60_000) throw new GameError("Nothing to report. Nobody's watching you.");
  if ((city.threats ?? []).some((t) => t.targetId === p.id && !t.solved)) throw new GameError("The police already have your report.");
  city.threats = [...(city.threats ?? []), { id: `${now.toString(36)}`, crewId: w.crewId, targetId: p.id, targetName: p.name, at: now, solved: false }].slice(-20);
  return [{ tone: "good", text: "You tell a desk sergeant someone is following you. A detective will look into it." }];
}

export function stakeoutBlock(officer: Player, now: number): string | null {
  if (officer.path !== "police" || officer.rank < HIT.stakeoutRank) return `Only detectives (${PATHS.police.ranks[HIT.stakeoutRank - 1]} and up) run stakeouts.`;
  if (inJail(officer, now)) return "You're in a cell.";
  if (officer.energy < HIT.stakeoutEnergy) return "You're too tired for a night in a car.";
  return null;
}

/**
 * A detective watches over someone who reported a threat. If the crew's hitman shows up and the
 * detective spots them, the hit is blown and the hitman is arrested for conspiracy to murder.
 */
export function stakeOut(city: City, officer: Player, threatId: string, crew: Crew | null, hitman: Player | null, target: Player | null, now: number, rng: Rng): GameEvent[] {
  const block = stakeoutBlock(officer, now);
  if (block) throw new GameError(block);
  const t = (city.threats ?? []).find((x) => x.id === threatId && !x.solved);
  if (!t) throw new GameError("That report is closed.");
  officer.energy -= HIT.stakeoutEnergy;
  const live = crew?.hit && crew.hit.targetId === t.targetId ? crew.hit : null;
  if (!live || !hitman) {
    t.solved = true;
    return [{ tone: "info", text: `A long night outside ${t.targetName}'s place. Nobody came. Maybe whoever it was gave up.` }];
  }
  const spot = Math.max(0.2, Math.min(0.85, 0.5 + ((sv(officer, "perception") + sv(officer, "wits")) / 2 - sv(hitman, "nerve")) / 30));
  if (rng() >= spot) return [{ tone: "bad", text: "You think you saw someone, but they were gone before you got out of the car. Try again." }];
  t.solved = true;
  crew!.hit = null;
  crew!.log = [{ at: now, text: `The police were waiting. The contract on ${t.targetName} is blown and ${hitman.name} is in a cell.` }, ...crew!.log].slice(0, 30);
  hitman.jailUntil = Math.max(hitman.jailUntil ?? 0, now + HIT.conspiracyJailMs);
  hitman.jailReason = "Held for conspiracy to murder.";
  hitman.heat += 20;
  officer.reputation += 4;
  addMerit(officer, "police", 4);
  notify(hitman, `Detective ${officer.name} was waiting outside ${t.targetName}'s place. You're held for conspiracy to murder.`, "bad", officer, now);
  if (target) {
    target.watched = null;
    notify(target, `Detective ${officer.name} caught someone casing your place. The threat is over.`, "good", officer, now);
  }
  return [{ tone: "good", text: `There. You grab ${hitman.name} with a pistol under their coat. Conspiracy to murder.` }];
}

/** For the crew: their contract, if any. */
export function hitView(crew: Crew, viewer: Player, now: number) {
  const h: HitContract | null | undefined = crew.hit;
  if (!h) return null;
  return {
    targetName: h.targetName,
    targetId: h.targetId,
    hitmanName: h.hitmanName,
    isHitman: h.hitmanId === viewer.id,
    isLeader: crew.leaderId === viewer.id,
    scouts: h.scouts,
    scoutsNeeded: HIT.scouts,
    readyAt: h.placedAt + HIT.caseMs,
    nextScoutAt: h.lastScoutAt + HIT.scoutGapMs,
    escrow: h.escrow,
    ready: h.scouts >= HIT.scouts && now >= h.placedAt + HIT.caseMs,
  };
}

/** For the target: how they feel, and what they can do about it. Never who. */
export function threatView(p: Player, city: City | null, now: number) {
  const w = p.watched && now - p.watched.at < 48 * 60 * 60_000 ? p.watched : null;
  return {
    watched: w ? w.count : 0,
    bodyguardUntil: bodyguarded(p, now) ? p.bodyguardUntil! : null,
    lyingLowUntil: lyingLow(p, now) ? p.lieLowUntil! : null,
    canLieLow: !lyingLow(p, now) && now - (p.lastLieLowAt ?? 0) >= HIT.lieLowCooldownMs,
    reported: !!city?.threats?.some((t) => t.targetId === p.id && !t.solved),
    morgueUntil: inMorgue(p, now) ? p.whacked!.until : null,
    vendetta: null as null,
  };
}

/** A hitman with a vendetta on them can be attacked by the victim and their crew through any protection. */
export function vendettaAgainst(a: Player, t: Player, now: number): boolean {
  const v = t.vendetta;
  if (!v || v.until <= now) return false;
  return a.id === v.victimId || (!!v.crewId && a.crewId === v.crewId);
}
