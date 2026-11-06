// Break-ins and car theft. Both hit property, not people: the best time is when the owner is out of
// town. Every success opens a case file like any street crime, so detectives, witnesses and trials
// work the same way. Owners defend with better homes, an alarm, and keeping an eye on their cars.

import { ALT_BLOCK, sameOwner } from "./anticheat";
import { BALANCE } from "./balance";
import { COUNTRY_BY_ID } from "./content/world";
import { addTip, suspectProfile } from "./crime";
import { DRUG_IDS, DRUGS } from "./drugs";
import { addMerit, countryOf, inHospital, inJail, shiftIntegrity } from "./engine";
import { earnDirty } from "./money";
import { notify, protectedUntil } from "./social";
import { specTier } from "./specialties";
import { stashOf, STASH } from "./stash";
import { dogAt, dogGuard } from "./dogs";
import { sv } from "./stats";
import { CARS, CAR, cargoUnits } from "./vehicles";
import { roleOdds } from "./heist";
import { crewJob } from "./family";
import { GameError, type Crew, type HeistRole, type Car, type CaseFile, type CountryId, type GameEvent, type Player, type Rng } from "./types";

export const BREAKIN = {
  energy: 20,
  heat: 10,
  integrity: -3,
  /** Wait before hitting the same place again. */
  cooldownMs: 6 * 60 * 60_000,
  /** Share of the stash a burglar finds and carries off. */
  share: [0.3, 0.6] as const,
  /** The owner counts as home when they're in the city and were active this recently. */
  homeMs: 10 * 60_000,
  alarm: { cost: 2_500, odds: 0.2 },
  /** How hard each kind of home is to get into (0 = a box). */
  lock: [1, 0.85, 0.7, 0.55, 0.4, 0.25],
};

export const CARJACK = {
  energy: 15,
  heat: 8,
  integrity: -2,
  cooldownMs: 6 * 60 * 60_000,
  /** How easy each car is to take. */
  ease: { hatch: 0.8, sedan: 0.65, van: 0.7, coupe: 0.45, suv: 0.3 } as Record<Car["model"], number>,
  /** A chop shop pays this share of the car's price, in dirty money. */
  chopShare: 0.35,
  /** New plates and papers cost this share of the price, clean. */
  plateShare: 0.2,
};

const NEIGHBORS = ["A neighbor walking her dog", "The night doorman", "A kid on the stairs", "Someone across the street", "A delivery rider"];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pick = <T,>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];

/** The kind of home `p` has in a city (0 = nothing). */
export function homeIn(p: Player, country: CountryId): number {
  return countryOf(p) === country ? p.housing : (p.homes?.[country] ?? 0);
}

export function ownerHome(t: Player, country: CountryId, now: number): boolean {
  return countryOf(t) === country && !t.travel && now - (t.seenAt ?? t.tickAt) < BREAKIN.homeMs;
}

export const hasAlarm = (p: Player, country: CountryId) => !!p.alarms?.includes(country);

function baseBlock(a: Player, t: Player, now: number): string | null {
  if (sameOwner(a, t)) return ALT_BLOCK;
  if (a.id === t.id) return "That's yours.";
  if (a.dead || t.dead) return "They're not around anymore.";
  if (a.travel) return "You're on the road.";
  if (inJail(a, now)) return "You're in a cell.";
  if (inHospital(a, now)) return "You're in the hospital.";
  if (now < protectedUntil(t)) return "They're new in town. The street protects newcomers for a while.";
  if (now < protectedUntil(a)) return "You're still new in town. Learn the streets first.";
  return null;
}

export function breakInBlock(a: Player, t: Player, now: number): string | null {
  const b = baseBlock(a, t, now);
  if (b) return b;
  const country = countryOf(a);
  if (homeIn(t, country) < 1) return "They don't have a place in this city.";
  if (now - (a.attackLog?.[`burgle:${t.id}`] ?? 0) < BREAKIN.cooldownMs) return "You hit that place recently. The neighbors are watching.";
  if (a.energy < BREAKIN.energy) return "You're too tired.";
  return null;
}

export function carTheftBlock(a: Player, t: Player, car: Car | undefined, now: number): string | null {
  const b = baseBlock(a, t, now);
  if (b) return b;
  if (!car || car.country !== countryOf(a)) return "That car isn't parked here.";
  if (t.travel?.carId === car.id) return "It's on the highway right now.";
  if ((a.garage ?? []).length >= CAR.maxCars) return "Your garage is full. Where would you even put it?";
  if (now - (a.attackLog?.[`carjack:${t.id}`] ?? 0) < CARJACK.cooldownMs) return "They'd recognize you hanging around their cars. Give it time.";
  if (a.energy < CARJACK.energy) return "You're too tired.";
  return null;
}

/** Hidden odds: nimble, clever hands against locks, alarms and whoever is home. */
export function breakInOdds(a: Player, t: Player, country: CountryId, now: number): number {
  const skill = (sv(a, "agility") + sv(a, "wits") - 20) / 120;
  let odds = BREAKIN.lock[homeIn(t, country)] * 0.9 + skill;
  if (hasAlarm(t, country)) odds -= BREAKIN.alarm.odds;
  odds *= 1 - dogGuard(t, country, now);
  if (ownerHome(t, country, now)) odds *= 0.5;
  return clamp(odds, 0.08, 0.9);
}

export function carTheftOdds(a: Player, car: Car): number {
  const skill = (sv(a, "agility") + sv(a, "wits") - 20) / 120 + specTier(a, "wheelman") * 0.05;
  return clamp(CARJACK.ease[car.model] + skill, 0.1, 0.9);
}

export interface PropertyCrimeContext {
  caseId: string;
  district: string;
  crewTag: string | null;
  witnesses: Player[];
}

/** Opens the case file after a property crime and tells the people involved. */
function openCase(a: Player, t: Player, kind: "burglary" | "car_theft", amount: number, ctx: PropertyCrimeContext, now: number, rng: Rng, extraTip: string | null): CaseFile {
  const c: CaseFile = {
    id: ctx.caseId,
    country: countryOf(a),
    district: ctx.district,
    kind,
    at: now,
    victimId: t.id,
    victimName: t.name,
    amount,
    culpritId: a.id,
    suspect: suspectProfile(a, ctx.crewTag),
    tips: [],
    witnesses: ctx.witnesses.map((w) => w.id),
    investigatedBy: [],
  };
  if (extraTip) addTip(c, "bystander", 0.85, now, rng, undefined, extraTip);
  for (let i = ctx.witnesses.length; i < BALANCE.crime.minWitnesses; i++) addTip(c, "bystander", 0.6, now, rng, undefined, pick(NEIGHBORS, rng));
  a.lastCrime = { caseId: c.id, at: now };
  a.myCases = [{ caseId: c.id, at: now, kind, district: ctx.district, victimName: t.name }, ...(a.myCases ?? [])].slice(0, 8);
  t.robbedIn = [{ caseId: c.id, at: now, amount, district: ctx.district }, ...(t.robbedIn ?? [])].slice(0, 5);
  const text = kind === "burglary" ? `You saw someone climb out of a window in ${ctx.district}.` : `You saw someone drive off in a car that wasn't theirs in ${ctx.district}.`;
  for (const w of ctx.witnesses) {
    w.sightings = [{ caseId: c.id, text, at: now, until: now + BALANCE.crime.sightingMs }, ...(w.sightings ?? []).filter((s) => s.until > now)].slice(0, 5);
  }
  return c;
}

function commit(a: Player, heat: number, integrity: number, energy: number) {
  a.energy -= energy;
  a.heat += heat * COUNTRY_BY_ID[countryOf(a)].heatMult;
  shiftIntegrity(a, integrity);
  a.stats.agility += 0.4;
  a.stats.wits += 0.3;
  a.stats.nerve += 0.3;
}

/** `a` breaks into `t`'s place in the city `a` is in. Both ticked to `now`. */
export function breakIn(a: Player, t: Player, now: number, rng: Rng, ctx: PropertyCrimeContext): { events: GameEvent[]; caseFile: CaseFile | null } {
  const block = breakInBlock(a, t, now);
  if (block) throw new GameError(block);
  const country = countryOf(a);
  const home = ownerHome(t, country, now);
  const alarm = hasAlarm(t, country);
  const dog = dogAt(t, country, now);
  commit(a, BREAKIN.heat, BREAKIN.integrity, BREAKIN.energy);
  a.attackLog = { ...(a.attackLog ?? {}), [`burgle:${t.id}`]: now };
  a.jobCounts["crime:burglary"] = (a.jobCounts["crime:burglary"] ?? 0) + 1;

  if (rng() >= breakInOdds(a, t, country, now)) {
    a.heat += BREAKIN.heat * 0.5;
    if (home) {
      t.reputation += 1;
      notify(t, `You heard the lock and caught ${a.name} breaking into your place. They ran. +1 reputation.`, "good", a, now);
      return { events: [{ tone: "bad", text: `${t.name} was home. They saw your face before you got out the window.` }], caseFile: null };
    }
    notify(
      t,
      dog
        ? `${dog.name} went off like a siren: someone tried to get into your place. They ran before they got in. Good dog.`
        : alarm
          ? "Your alarm went off: someone tried to get into your place. They ran before they got in."
          : "Someone tried to get into your place. Scratches on the lock, nothing taken.",
      "info",
      undefined,
      now,
    );
    return {
      events: [
        {
          tone: "bad",
          text: dog
            ? "A dog throws itself at the other side of the door, barking like it means it. Lights come on up and down the street. You run."
            : alarm
              ? "The alarm screams the moment the door gives. You run."
              : "The lock won't give, and a light comes on next door. You walk away fast.",
        },
      ],
      caseFile: null,
    };
  }

  // Inside: the stash, if there is one, and whatever the burglar can carry.
  const s = stashOf(t, country);
  const share = BREAKIN.share[0] + rng() * (BREAKIN.share[1] - BREAKIN.share[0]);
  const cash = Math.floor(s.cash * share);
  const dirty = Math.floor(s.dirty * share);
  const room = () => BALANCE.drugs.maxCarry - DRUG_IDS.reduce((n, d) => n + (a.drugs?.[d] ?? 0), 0);
  const took: string[] = [];
  const left = { cash: s.cash - cash, dirty: s.dirty - dirty, drugs: { ...s.drugs } };
  for (const d of DRUG_IDS) {
    const n = Math.min(room(), Math.floor((s.drugs?.[d] ?? 0) * share));
    if (n <= 0) continue;
    left.drugs[d] = (left.drugs[d] ?? 0) - n;
    a.drugs = { ...(a.drugs ?? {}), [d]: (a.drugs?.[d] ?? 0) + n };
    took.push(`${n} × ${DRUGS[d].name}`);
  }
  t.stash = { ...(t.stash ?? {}), [country]: left };
  earnDirty(a, cash + dirty);
  const amount = cash + dirty;
  if (amount) took.unshift(`$${amount.toLocaleString()}`);
  a.reputation += 1;
  const tier = homeIn(t, country);
  const c = openCase(a, t, "burglary", amount, ctx, now, rng, alarm ? "The alarm camera" : null);
  const events: GameEvent[] = [
    {
      tone: "good",
      text: took.length
        ? `In and out of ${t.name}'s ${BALANCE.housing[tier].name.toLowerCase()}. You found the hiding spot ${STASH.spots[tier]}: ${took.join(", ")}.`
        : `In and out of ${t.name}'s ${BALANCE.housing[tier].name.toLowerCase()}. Nothing worth taking. You leave with a toaster.`,
    },
  ];
  notify(
    t,
    `Someone broke into your place in ${COUNTRY_BY_ID[country].capital}${took.length ? ` and found your stash: ${took.join(", ")} gone` : ". They didn't find anything worth taking"}. The police opened case #${c.id}.`,
    "bad",
    undefined,
    now,
  );
  events.push(...addMerit(a, "enforcer", 1.2));
  if (ctx.witnesses.length) events.push({ tone: "info", text: `${ctx.witnesses.length === 1 ? "Someone" : "People"} saw you leave.` });
  return { events, caseFile: c };
}

/** `a` steals one of `t`'s cars parked in this city. It arrives "hot": stolen plates. */
export function stealCar(a: Player, t: Player, carId: string, now: number, rng: Rng, ctx: PropertyCrimeContext): { events: GameEvent[]; caseFile: CaseFile | null } {
  const car = (t.garage ?? []).find((c) => c.id === carId);
  const block = carTheftBlock(a, t, car, now);
  if (block) throw new GameError(block);
  commit(a, CARJACK.heat, CARJACK.integrity, CARJACK.energy);
  a.attackLog = { ...(a.attackLog ?? {}), [`carjack:${t.id}`]: now };
  a.jobCounts["crime:car_theft"] = (a.jobCounts["crime:car_theft"] ?? 0) + 1;
  const name = CARS[car!.model].name.toLowerCase();
  if (rng() >= carTheftOdds(a, car!)) {
    a.heat += CARJACK.heat * 0.5;
    notify(t, `Someone tried to steal your ${name} in ${COUNTRY_BY_ID[car!.country].capital}. The lock held.`, "info", undefined, now);
    return { events: [{ tone: "bad", text: `The ${name} won't start, and someone is shouting from a window. You leave it.` }], caseFile: null };
  }
  t.garage = (t.garage ?? []).filter((c) => c.id !== carId);
  const loaded = cargoUnits(car!);
  const stolen: Car = { ...car!, id: `car-${now.toString(36)}`, hot: { fromId: t.id, fromName: t.name } };
  a.garage = [...(a.garage ?? []), stolen];
  a.reputation += 1;
  const c = openCase(a, t, "car_theft", car!.boughtFor, ctx, now, rng, null);
  c.car = { id: stolen.id, name: CARS[car!.model].name };
  notify(t, `Your ${name} was stolen in ${COUNTRY_BY_ID[car!.country].capital}${loaded ? `, with ${loaded} units still in the trunk` : ""}. The police opened case #${c.id}.`, "bad", undefined, now);
  const events: GameEvent[] = [
    { tone: "good", text: `You're driving ${t.name}'s ${name}${loaded ? `, with ${loaded} units of cargo in the trunk` : ""}. It's hot: change the plates or sell it to a chop shop at the Docks.` },
    ...addMerit(a, "enforcer", 1),
  ];
  if (ctx.witnesses.length) events.push({ tone: "info", text: `${ctx.witnesses.length === 1 ? "Someone" : "People"} saw you drive off.` });
  return { events, caseFile: c };
}

/** Owners: an alarm makes a break-in harder, and its camera gives the police a good clue. */
export function fitAlarm(p: Player, price?: number): GameEvent[] {
  const country = countryOf(p);
  if (p.housing < 1) throw new GameError("There's nothing to wire an alarm to.");
  if (hasAlarm(p, country)) throw new GameError("It's already wired.");
  const cost = price ?? Math.round(BREAKIN.alarm.cost * COUNTRY_BY_ID[country].priceMult);
  if (p.cash + (p.hasBankAccount ? p.bank : 0) < cost) throw new GameError(`An alarm costs $${cost.toLocaleString()}.`);
  const fromCash = Math.min(p.cash, cost);
  p.cash -= fromCash;
  p.bank -= cost - fromCash;
  p.alarms = [...(p.alarms ?? []), country];
  return [{ tone: "good", text: `Alarm wired, with a camera over the door. A sticker on the window tells everyone. -$${cost.toLocaleString()}` }];
}

/** A chop shop takes a hot car apart: dirty money, no questions. */
export function chopCar(p: Player, carId: string): GameEvent[] {
  const car = (p.garage ?? []).find((c) => c.id === carId && c.country === countryOf(p));
  if (!car) throw new GameError("That car isn't parked here.");
  if (!car.hot) throw new GameError("It's clean. Sell it at the lot instead.");
  if (cargoUnits(car)) throw new GameError("Empty the trunk first.");
  const pay = Math.floor(car.boughtFor * CARJACK.chopShare * (0.5 + car.condition / 200));
  p.garage = (p.garage ?? []).filter((c) => c !== car);
  earnDirty(p, pay);
  return [{ tone: "good", text: `The chop shop has it in pieces before you've counted the money. +$${pay.toLocaleString()} dirty.` }];
}

/** New plates and papers: the car is yours as far as anyone can tell. */
export function newPlates(p: Player, carId: string): GameEvent[] {
  const car = (p.garage ?? []).find((c) => c.id === carId && c.country === countryOf(p));
  if (!car) throw new GameError("That car isn't parked here.");
  if (!car.hot) throw new GameError("Its papers are already clean.");
  const cost = Math.round(car.boughtFor * CARJACK.plateShare);
  if (p.cash + (p.dirty ?? 0) < cost) throw new GameError(`New plates and papers cost $${cost.toLocaleString()}. Cash or dirty money.`);
  const fromDirty = Math.min(p.dirty ?? 0, cost);
  p.dirty = (p.dirty ?? 0) - fromDirty;
  p.cash -= cost - fromDirty;
  car.hot = undefined;
  return [{ tone: "good", text: `New plates, a new VIN, papers that say it's yours. -$${cost.toLocaleString()}` }];
}

// ── Crew home jobs ────────────────────────────────────────────────────────────

export const HOME_JOB = {
  /** Only places this big are worth a crew. */
  minTier: 3,
  /** Share of the stash a crew carries out. */
  share: [0.6, 0.9] as const,
  heat: 14,
  caughtMs: 25 * 60_000,
};

/** Why a crew can't plan a job on this home. */
export function homeJobBlock(crew: Crew, leader: Player, t: Player, now: number): string | null {
  if (crew.leaderId !== leader.id) return "Only the crew leader plans a job.";
  if (crew.members.some((m) => m.id === t.id)) return "That's one of your own.";
  const b = baseBlock(leader, t, now);
  if (b) return b;
  if (homeIn(t, countryOf(leader)) < HOME_JOB.minTier) return "A place that small isn't worth a crew. Break in yourself.";
  if (now - (leader.attackLog?.[`burgle:${t.id}`] ?? 0) < BREAKIN.cooldownMs) return "You hit that place recently. The neighbors are watching.";
  return null;
}

/**
 * The crew hits a big home. The safecracker gets in and opens the safe (harder with better locks and
 * an alarm), the lookout keeps the owner from walking in on it, muscle handles them if they do, and
 * the driver gets everyone away. The safecracker is the face on the case file.
 */
export function runHomeJob(
  crew: Crew,
  leader: Player,
  team: Partial<Record<HeistRole, Player>>,
  t: Player,
  now: number,
  rng: Rng,
  ctx: PropertyCrimeContext,
): { events: GameEvent[]; caseFile: CaseFile | null } {
  const h = crew.heist;
  if (!h?.target) throw new GameError("There's no home job planned.");
  if (crew.leaderId !== leader.id) throw new GameError("Only the leader gives the word.");
  if (!team.driver || !team.safecracker) throw new GameError("You need at least a driver and a safecracker.");
  const country = h.country;
  const tier = homeIn(t, country);
  const alarm = hasAlarm(t, country);
  const home = ownerHome(t, country, now);
  const lock = BREAKIN.lock[tier] / BREAKIN.lock[HOME_JOB.minTier];
  const roll = (role: HeistRole, mult = 1) => !!team[role] && rng() < roleOdds(team[role]!, role) * mult;
  const ok = {
    driver: roll("driver"),
    safecracker: roll("safecracker", Math.min(1.2, lock + 0.25) * (alarm ? 0.85 : 1)),
    lookout: roll("lookout"),
    muscle: roll("muscle"),
  };
  // Someone walks in on it: the owner if they're home, or a neighbor if nobody watched the street.
  const dog = dogAt(t, country, now);
  const interrupted = (home && !ok.lookout) || (!team.lookout && rng() < 0.3) || (!!dog && !ok.muscle && rng() < dogGuard(t, country, now) * 2);
  const members = Object.values(team).filter((x): x is Player => !!x);
  const capital = COUNTRY_BY_ID[country].capital;
  crew.heist = null;
  crew.lastHeistAt = now;
  leader.attackLog = { ...(leader.attackLog ?? {}), [`burgle:${t.id}`]: now };
  for (const p of members) {
    p.heat += HOME_JOB.heat * COUNTRY_BY_ID[country].heatMult * (ok.lookout ? 1 : 1.5);
    shiftIntegrity(p, BREAKIN.integrity);
  }

  if (!ok.driver) {
    for (const p of members) {
      p.jailUntil = Math.max(p.jailUntil ?? 0, now + Math.round(HOME_JOB.caughtMs * COUNTRY_BY_ID[country].heatMult));
      p.jailReason = `Caught leaving ${t.name}'s place in ${capital}.`;
      crewJob(p, "heist", false);
      if (p.id !== leader.id) notify(p, `The getaway car never came. Everyone on the job at ${t.name}'s place got caught.`, "bad", undefined, now);
    }
    notify(t, `The police caught a crew breaking into your place in ${capital}. Nothing was taken.`, "good", undefined, now);
    crew.log = [{ at: now, text: `The job on ${t.name}'s place went wrong. Everyone got caught.` }, ...crew.log].slice(0, 30);
    return { events: [{ tone: "bad", text: "The getaway car never came. You're all caught at the door." }], caseFile: null };
  }
  if (interrupted && !ok.muscle) {
    for (const p of members) {
      p.hp = Math.max(5, p.hp - 25);
      crewJob(p, "heist", false);
    }
    t.reputation += 2;
    notify(t, home ? `You walked in on a crew robbing your place and ran them off. You saw ${team.safecracker.name}'s face. +2 reputation.` : "A neighbor scared off a crew breaking into your place. Nothing was taken.", "good", home ? team.safecracker : undefined, now);
    crew.log = [{ at: now, text: `The job on ${t.name}'s place was interrupted. Nobody got anything.` }, ...crew.log].slice(0, 30);
    return {
      events: [
        {
          tone: "bad",
          text: home
            ? `${t.name} was home and walked in on you. You got out, empty-handed and bruised.`
            : dog
              ? `${dog.name} wouldn't stop barking and the whole block woke up. You got out with nothing.`
              : "Someone walked in on the job. You got out with nothing.",
        },
      ],
      caseFile: null,
    };
  }

  // Inside, and the safe either opens or it doesn't.
  let take = 0;
  const took: string[] = [];
  if (ok.safecracker) {
    const s = stashOf(t, country);
    const share = HOME_JOB.share[0] + rng() * (HOME_JOB.share[1] - HOME_JOB.share[0]);
    const cash = Math.floor(s.cash * share);
    const dirty = Math.floor(s.dirty * share);
    take = cash + dirty;
    const left = { cash: s.cash - cash, dirty: s.dirty - dirty, drugs: { ...s.drugs } };
    // Product goes to whoever has room, safecracker first.
    for (const d of DRUG_IDS) {
      let n = Math.floor((s.drugs?.[d] ?? 0) * share);
      if (n > 0) took.push(`${n} × ${DRUGS[d].name}`);
      for (const p of [team.safecracker, ...members]) {
        if (n <= 0) break;
        const room = BALANCE.drugs.maxCarry - DRUG_IDS.reduce((x, k) => x + (p.drugs?.[k] ?? 0), 0);
        const give = Math.min(room, n);
        if (give <= 0) continue;
        p.drugs = { ...(p.drugs ?? {}), [d]: (p.drugs?.[d] ?? 0) + give };
        left.drugs[d] = (left.drugs[d] ?? 0) - give;
        n -= give;
      }
    }
    t.stash = { ...(t.stash ?? {}), [country]: left };
    if (take) took.unshift(`$${take.toLocaleString()}`);
  }
  const cut = members.length ? Math.floor(take / members.length) : 0;
  for (const p of members) {
    earnDirty(p, cut);
    crewJob(p, "heist", take > 0);
    p.reputation += take ? 3 : 1;
    addMerit(p, "enforcer", take ? 2.5 : 1);
    if (p.id !== leader.id) notify(p, take ? `The job on ${t.name}'s place worked. Your cut: $${cut.toLocaleString()}, dirty.` : `You got into ${t.name}'s place, but the safe wouldn't open.`, take ? "good" : "info", undefined, now);
  }
  const c = openCase(team.safecracker, t, "burglary", take, ctx, now, rng, alarm ? "The alarm camera" : null);
  notify(
    t,
    took.length
      ? `A crew hit your place in ${capital} and cracked the safe: ${took.join(", ")} gone. The police opened case #${c.id}.`
      : `A crew broke into your place in ${capital}, but couldn't open your hiding spot. The police opened case #${c.id}.`,
    "bad",
    undefined,
    now,
  );
  crew.log = [{ at: now, text: take ? `The job on ${t.name}'s place: $${take.toLocaleString()} split ${members.length} ways.` : `The job on ${t.name}'s place: in and out, safe shut.` }, ...crew.log].slice(0, 30);
  const events: GameEvent[] = [
    took.length
      ? { tone: "good", text: `You find the hiding spot ${STASH.spots[tier]} and open it: ${took.join(", ")}. Your cut is $${cut.toLocaleString()}, dirty.` }
      : { tone: "info", text: "In and out, but the hiding spot won't give. You leave with nothing." },
  ];
  if (!ok.lookout) events.push({ tone: "bad", text: "Nobody watched the street. Half the block saw your crew leave." });
  return { events, caseFile: c };
}
