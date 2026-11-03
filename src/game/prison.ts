// The prison yard: everyone behind bars in a country shares one yard. Inmates can talk
// (a yard-only chat), fight each other for respect, work prison shifts (good behavior takes
// time off a sentence) and get recruited by crew leaders doing time with them.

import { BALANCE } from "./balance";
import { playerFighter, resolveFight } from "./combat";
import { countryOf, inJail, practiceFalloff } from "./engine";
import { notify } from "./social";
import { GameError, type FightSummary, type GameEvent, type Player, type Rng } from "./types";

const Y = BALANCE.yard;

export const yardChannel = (p: Player) => `yard:${countryOf(p)}`;

/** Serving a sentence, not just held for trial. */
const serving = (p: Player, now: number) => !p.custodyCase && inJail(p, now);

export function yardFightBlock(a: Player, t: Player, now: number): string | null {
  if (a.id === t.id) return "You can't fight yourself.";
  if (!inJail(a, now)) return "You're not in the yard.";
  if (!inJail(t, now) || countryOf(t) !== countryOf(a)) return "They're not in your yard.";
  if (a.energy < Y.fightEnergy) return "You're too tired.";
  if (a.hp < 20) return "You're too hurt.";
  if (t.hp < 20) return "They're already beaten up. The guards are watching them.";
  if (now - (a.attackLog?.[`yard:${t.id}`] ?? 0) < Y.fightCooldownMs) return "You just fought them. The guards are watching.";
  return null;
}

/** A yard fight: no money, no hospital trips. Respect for the winner, bruises for the loser. */
export function yardFight(a: Player, t: Player, now: number, rng: Rng): { events: GameEvent[]; fight: FightSummary } {
  const block = yardFightBlock(a, t, now);
  if (block) throw new GameError(block);
  a.energy -= Y.fightEnergy;
  a.attackLog = { ...(a.attackLog ?? {}), [`yard:${t.id}`]: now };
  const res = resolveFight(playerFighter(a, BALANCE.hp.max), { ...playerFighter(t, BALANCE.hp.max), hp: t.hp }, rng);
  const fight: FightSummary = { opponent: t.name, icon: "🧍", won: res.won, lines: res.lines, outcome: res.won ? "win" : "loss" };
  // The guards break it up before anyone dies: nobody drops below a few points of health.
  a.hp = Math.max(5, res.playerHp);
  const winner = res.won ? a : t;
  const loser = res.won ? t : a;
  if (res.won) t.hp = Math.max(5, t.hp - Math.max(25, t.hp * 0.5));
  winner.reputation += Y.respect;
  winner.stats.nerve += 0.4;
  winner.stats.strength += 0.3;
  loser.stats.toughness += 0.3;
  notify(
    t,
    res.won ? `${a.name} jumped you in the yard. You lost, and everyone saw it.` : `${a.name} tried you in the yard. You put them down. +${Y.respect} reputation.`,
    res.won ? "bad" : "good",
    a,
    now,
  );
  return {
    events: [
      { tone: res.won ? "good" : "bad", text: `Yard fight: ${t.name}`, fight },
      res.won
        ? { tone: "good", text: `You win. The yard saw it. +${Y.respect} reputation.` }
        : { tone: "bad", text: `${t.name} puts you down. The yard's respect goes to ${winner.name}.` },
    ],
    fight,
  };
}

/** A prison shift: a few dollars, some hard labor, and good behavior off a sentence. */
export function prisonWork(p: Player, now: number, rng: Rng): GameEvent[] {
  if (!inJail(p, now)) throw new GameError("You're not behind bars.");
  if (p.energy < Y.workEnergy) throw new GameError("You're too tired to work.");
  p.energy -= Y.workEnergy;
  const pay = Y.workPay[0] + Math.floor(rng() * (Y.workPay[1] - Y.workPay[0] + 1));
  p.cash += pay;
  const falloff = practiceFalloff(p, "prison_work", now);
  p.stats.strength += 0.6 * falloff;
  p.stats.toughness += 0.6 * falloff;
  const events: GameEvent[] = [];
  const shifts = ["Laundry duty. Steam, bleach and other people's socks.", "Kitchen shift. You peel potatoes until your hands go numb.", "License plates. Stamp, flip, stamp."];
  events.push({ tone: "good", text: `${shifts[Math.floor(rng() * shifts.length)]} +$${pay}` });
  if (serving(p, now)) {
    p.jailUntil = Math.max(now, (p.jailUntil ?? now) - Y.goodBehaviorMs);
    events.push({ tone: "info", text: `Good behavior: ${Math.round(Y.goodBehaviorMs / 60_000)} minutes off your sentence.` });
  }
  return events;
}

/** What one inmate sees about another in the yard. */
export function inmateView(viewer: Player, o: Player, now: number, crewTag: string | null, canInvite: boolean) {
  return {
    id: o.id,
    name: o.name,
    crewTag,
    path: o.path,
    status: o.custodyCase ? "awaiting trial" : "serving time",
    freeIn: Math.max(0, (o.jailUntil ?? now) - now),
    canFight: yardFightBlock(viewer, o, now),
    canInvite,
  };
}
