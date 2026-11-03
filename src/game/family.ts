// The family: how a Mafia career climbs past the street.
//
// Associate → Soldier is hard work alone. After that the family has rules:
// - Made Man: you have to be *made*. Either pass Kozak's test ("make your bones", a one-time
//   contract), or be sworn in by your crew leader in a making ceremony.
// - Capo: made men who keep working. Capos can found their own crews.
// - Consigliere and Underboss: you must be in a crew and have taken part in its organized crime
//   (bank jobs, turf wars, prison breaks).
// - Boss: you must lead a crew.
// - Don: you lead a crew that has held turf under you and pulled off a bank job.
//
// None of this shows numbers; the hint tells you what the family is waiting for.

import { notify } from "./social";
import { GameError, type Crew, type GameEvent, type Player } from "./types";

export const FAMILY = {
  /** Crew jobs needed to reach each rank. */
  crewJobs: { 5: 2, 6: 5, 7: 8, 8: 12 } as Record<number, number>,
  /** Rank you must hold to be made, and to perform the ceremony. */
  madeFrom: 2,
  ceremonyRank: 4,
  ceremonyCost: 500,
};

export function family(p: Player) {
  if (!p.family) p.family = { crewJobs: 0, heists: 0 };
  return p.family;
}

export const isMade = (p: Player) => !!p.family?.madeAt;

/** What the family is waiting for before this Mafia rank can be reached, or null. */
export function familyGate(p: Player, nextRank: number): string | null {
  if (p.path !== "enforcer") return null;
  const f = p.family ?? { crewJobs: 0, heists: 0 };
  if (nextRank === 3 && !f.madeAt)
    return "Nobody gets made without proving themselves. Pass Kozak's test (make your bones), or get sworn in by your crew leader.";
  if (nextRank >= 5 && !p.crewId) return "No promotions for loners past Capo. Join a crew, or found one.";
  const jobs = FAMILY.crewJobs[nextRank] ?? 0;
  if (f.crewJobs < jobs) return "Kozak wants to see you in on the crew's work: bank jobs, turf wars, prison breaks.";
  if (nextRank >= 7 && !f.leads) return "Only someone who runs a crew becomes a Boss.";
  if (nextRank === 8) {
    if (!f.turf) return "A Don's crew runs streets. Take a district and hold it.";
    if (!f.heists) return "A Don's crew has robbed a bank. The family is waiting for your big score.";
  }
  return null;
}

/** Someone took part in a crew job (bank job, turf war, prison break). */
export function crewJob(p: Player, kind: "heist" | "war" | "breakout", success = false) {
  const f = family(p);
  f.crewJobs += 1;
  if (kind === "heist" && success) f.heists += 1;
}

/** Kozak's test: a one-time contract that makes you if you pull it off. */
export function passTest(p: Player, now: number): GameEvent[] {
  const f = family(p);
  if (f.madeAt) return [];
  f.madeAt = now;
  f.madeBy = "Kozak";
  return [{ tone: "story", text: "Kozak burns a saint's card in your palm and makes you swear. You're a made man now. Nobody touches you without asking the family first." }];
}

export function ceremonyBlock(crew: Crew, leader: Player, target: Player): string | null {
  if (crew.leaderId !== leader.id) return "Only the crew leader can make someone.";
  if (leader.path !== "enforcer" || leader.rank < FAMILY.ceremonyRank) return "Only a Capo or higher can make someone.";
  if (target.crewId !== crew.id) return "They're not in your crew.";
  if (target.id === leader.id) return "You can't make yourself.";
  if (target.path !== "enforcer") return "Only family can be made.";
  if (isMade(target)) return "They're already made.";
  if (target.rank < FAMILY.madeFrom) return "They're still just an Associate. Let them prove themselves first.";
  if ((target.family?.crewJobs ?? 0) < 1) return "They haven't done a job with the crew yet.";
  if (crew.vault < FAMILY.ceremonyCost) return `The ceremony costs $${FAMILY.ceremonyCost} from the vault.`;
  return null;
}

/** The crew leader swears a soldier in. */
export function makeMember(crew: Crew, leader: Player, target: Player, now: number): GameEvent[] {
  const block = ceremonyBlock(crew, leader, target);
  if (block) throw new GameError(block);
  crew.vault -= FAMILY.ceremonyCost;
  const f = family(target);
  f.madeAt = now;
  f.madeBy = leader.name;
  crew.log = [{ at: now, text: `${leader.name} made ${target.name}. A candle, a saint's card, an oath.` }, ...crew.log].slice(0, 30);
  notify(target, `${leader.name} swore you in. You're a made man now.`, "story", leader, now);
  return [{ tone: "good", text: `${target.name} is made.` }];
}
