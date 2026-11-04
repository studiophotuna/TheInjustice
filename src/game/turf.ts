// Crew wars over turf. A crew leader claims an unclaimed district; after that, a cut of what
// outsiders earn there goes to the crew vault. A rival crew can declare war on held turf: for
// a while, members of both crews join their side, then team strength decides who holds it.

import { wearGear } from "./gear";
import { peaceBlock } from "./military";
import { BALANCE } from "./balance";
import { playerFighter, power } from "./combat";
import { DISTRICT_BY_ID, DISTRICTS } from "./content/districts";
import { countryOf, inJail } from "./engine";
import { notify } from "./social";
import { crewJob, family } from "./family";
import { GameError, type City, type Crew, type DistrictId, type GameEvent, type Player, type Rng, type TurfHold } from "./types";

const T = BALANCE.turf;

const holdOf = (c: City, d: DistrictId): TurfHold | null => c.turf?.[d] ?? null;
const isLeader = (crew: Crew | null, p: Player) => !!crew && crew.leaderId === p.id;

export function claimBlock(c: City, crew: Crew | null, p: Player, d: DistrictId): string | null {
  const def = DISTRICT_BY_ID[d];
  if (!def || def.country !== c.country) return "That district isn't in this city.";
  if (!isLeader(crew, p)) return "Only a crew leader can claim turf.";
  if (countryOf(p) !== c.country) return "You have to be in the city.";
  if (holdOf(c, d)) return "Somebody already runs that district.";
  if (Object.values(c.turf ?? {}).filter((h) => h.crewId === crew!.id).length >= T.maxPerCrew) return `A crew can hold at most ${T.maxPerCrew} districts per city.`;
  if (crew!.vault < T.claimCost) return `Claiming turf costs $${T.claimCost} from the crew vault.`;
  return null;
}

export function claimTurf(c: City, crew: Crew, p: Player, d: DistrictId, now: number): GameEvent[] {
  const block = claimBlock(c, crew, p, d);
  if (block) throw new GameError(block);
  crew.vault -= T.claimCost;
  family(p).turf = true;
  c.turf = { ...(c.turf ?? {}), [d]: { crewId: crew.id, name: crew.name, tag: crew.tag, since: now, lastWarAt: 0, war: null } };
  c.log = [{ at: now, text: `${crew.name} [${crew.tag}] now runs ${DISTRICT_BY_ID[d].name}.` }, ...c.log].slice(0, 20);
  return [{ tone: "good", text: `${DISTRICT_BY_ID[d].name} is yours. Outsiders who work there now pay the crew ${Math.round(T.cut * 100)}%.` }];
}

export function warBlock(c: City, crew: Crew | null, p: Player, d: DistrictId, now: number): string | null {
  const h = holdOf(c, d);
  if (!h) return "Nobody holds it. Just claim it.";
  if (!isLeader(crew, p)) return "Only a crew leader can declare war.";
  if (h.crewId === crew!.id) return "That's already your turf.";
  if (crew!.allies?.some((a) => a.id === h.crewId)) return "They're your allies. Break the alliance first.";
  if (h.war) return "There's already a war on.";
  if ((c.truceUntil ?? 0) > now) return "The Don called a truce. Nobody moves until it's over.";
  if (now - h.lastWarAt < T.peaceMs) return "The streets need time to cool down after the last war.";
  if (countryOf(p) !== c.country) return "You have to be in the city.";
  return null;
}

export function declareWar(c: City, crew: Crew, p: Player, d: DistrictId, now: number): GameEvent[] {
  const block = warBlock(c, crew, p, d, now);
  if (block) throw new GameError(block);
  const h = holdOf(c, d)!;
  h.war = { crewId: crew.id, name: crew.name, tag: crew.tag, startedAt: now, endsAt: now + T.warMs, attackers: [{ id: p.id, name: p.name }], defenders: [] };
  c.log = [{ at: now, text: `War! ${crew.name} [${crew.tag}] is coming for ${h.name}'s ${DISTRICT_BY_ID[d].name}.` }, ...c.log].slice(0, 20);
  return [{ tone: "good", text: `You declare war on ${h.name} [${h.tag}] for ${DISTRICT_BY_ID[d].name}. Get your crew in the fight.` }];
}

/** Which side a player fights on: their own crew's, or an ally's. */
function sideOf(h: TurfHold, p: Player, allies: string[]): "attack" | "defend" | "both" | null {
  if (!p.crewId) return null;
  if (p.crewId === h.war!.crewId) return "attack";
  if (p.crewId === h.crewId) return "defend";
  const atk = allies.includes(h.war!.crewId);
  const def = allies.includes(h.crewId);
  return atk && def ? "both" : atk ? "attack" : def ? "defend" : null;
}

export function joinWarBlock(c: City, p: Player, d: DistrictId, now: number, allies: string[] = []): string | null {
  const h = holdOf(c, d);
  if (!h?.war) return "There's no war there.";
  if (now >= h.war.endsAt) return "The fighting is over. Settle it.";
  const side = sideOf(h, p, allies);
  if (!side) return "This isn't your crew's fight, or an ally's.";
  if (side === "both") return "You're allied with both sides. Stay out of it.";
  if ([...h.war.attackers, ...h.war.defenders].some((x) => x.id === p.id)) return "You're already in it.";
  if (countryOf(p) !== c.country) return "You have to be in the city.";
  if (inJail(p, now)) return "You're in a cell.";
  if (p.energy < T.joinEnergy) return "You're too tired.";
  return null;
}

export function joinWar(c: City, p: Player, d: DistrictId, now: number, allies: string[] = []): GameEvent[] {
  const block = joinWarBlock(c, p, d, now, allies);
  if (block) throw new GameError(block);
  const h = holdOf(c, d)!;
  p.energy -= T.joinEnergy;
  crewJob(p, "war");
  const attacking = sideOf(h, p, allies) === "attack";
  (attacking ? h.war!.attackers : h.war!.defenders).push({ id: p.id, name: p.name });
  return [{ tone: "good", text: attacking ? `You're on the attack for ${DISTRICT_BY_ID[d].name}.` : `You're defending ${DISTRICT_BY_ID[d].name}.` }];
}

/** Total fighting strength of a side. */
export function sideStrength(team: Player[]): number {
  return team.reduce((s, p) => s + power(playerFighter(p, 100)) * (0.5 + p.hp / 200), 0);
}

/**
 * Once the war's time is up: compare the sides (defenders get a home advantage) and hand out
 * the district, heat and bruises. `attackers` / `defenders` are the joined players' records.
 */
export function settleWar(c: City, d: DistrictId, attackers: Player[], defenders: Player[], now: number, rng: Rng): GameEvent[] {
  const h = holdOf(c, d);
  if (!h?.war) throw new GameError("There's no war there.");
  if (now < h.war.endsAt) throw new GameError("The fighting isn't over yet.");
  const war = h.war;
  const atk = sideStrength(attackers) * (0.8 + rng() * 0.4);
  const def = sideStrength(defenders) * T.homeAdvantage * (0.8 + rng() * 0.4);
  const attackersWin = attackers.length > 0 && atk > def;
  const district = DISTRICT_BY_ID[d].name;
  for (const p of [...attackers, ...defenders]) {
    wearGear(p, ["weapon", "armor"], 2);
    p.heat += T.heat;
    p.hp = Math.max(5, p.hp - T.damage);
  }
  const winners = attackersWin ? attackers : defenders;
  for (const p of winners) {
    p.reputation += 3;
    notify(p, `Your crew won the war for ${district}.`, "good", undefined, now);
  }
  for (const p of attackersWin ? defenders : attackers) notify(p, `Your crew lost the war for ${district}.`, "bad", undefined, now);
  if (attackersWin) {
    // The leader who declared the war now runs streets.
    const declarer = attackers.find((a) => a.id === war.attackers[0]?.id);
    if (declarer) family(declarer).turf = true;
    c.turf![d] = { crewId: war.crewId, name: war.name, tag: war.tag, since: now, lastWarAt: now, war: null };
    c.log = [{ at: now, text: `${war.name} [${war.tag}] took ${district} from ${h.name}.` }, ...c.log].slice(0, 20);
    return [{ tone: "good", text: `${war.name} takes ${district}.` }];
  }
  h.war = null;
  h.lastWarAt = now;
  c.log = [{ at: now, text: `${h.name} [${h.tag}] held ${district} against ${war.name}.` }, ...c.log].slice(0, 20);
  return [{ tone: "info", text: `${h.name} holds ${district}.` }];
}

/** Turf in this city, for the map. */
export function turfView(c: City, viewer: Player, crew: Crew | null, now: number) {
  const allies = (crew?.allies ?? []).map((a) => a.id);
  return DISTRICTS.filter((d) => d.country === c.country).map((d) => {
    const h = holdOf(c, d.id);
    return {
      id: d.id,
      name: d.name,
      holder: h ? { name: h.name, tag: h.tag, mine: viewer.crewId === h.crewId, ally: allies.includes(h.crewId) } : null,
      war: h?.war
        ? {
            attacker: `${h.war.name} [${h.war.tag}]`,
            endsAt: h.war.endsAt,
            attackers: h.war.attackers.length,
            defenders: h.war.defenders.length,
            over: now >= h.war.endsAt,
            canJoin: joinWarBlock(c, viewer, d.id, now, allies),
            canPeace: peaceBlock(c, viewer, d.id, now),
            peacekeepers: h.war.peacekeepers?.length ?? 0,
          }
        : null,
      canClaim: claimBlock(c, crew, viewer, d.id),
      canWar: h ? (allies.includes(h.crewId) ? "They're your allies." : warBlock(c, crew, viewer, d.id, now)) : "Nobody holds it.",
    };
  });
}

/** Crew that takes a cut of outsiders' pay in each district of this city. */
export function turfCuts(c: City | null): Partial<Record<DistrictId, string>> {
  const out: Partial<Record<DistrictId, string>> = {};
  for (const [d, h] of Object.entries(c?.turf ?? {})) if (h) out[d as DistrictId] = h.crewId;
  return out;
}
