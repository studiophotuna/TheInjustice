// Street regulars with a career do their job for players, for a fee: the doctor patches you up,
// the attorney takes your case, the banker cleans your money, the beat cop looks the other way,
// the muscle watches your back, the soldier drills you, the vigilante keeps an eye out.
// Only while they're out on the street (their own hours), in your city. Fees go to them.

import { BALANCE } from "./balance";
import { countryOf, shiftIntegrity } from "./engine";
import { defFor, scheduledOut } from "./regulars";
import { GameError, type GameEvent, type Player } from "./types";
import { playerMaxHp, WOUNDS, woundsOf } from "./wounds";

export const WORK = {
  /** Patch-up: a base fee plus this much per missing health point. */
  patchBase: 25,
  patchPerHp: 2,
  surgeryBase: 2500,
  surgeryPerRank: 500,
  /** Attorney retainer: a week, like a player lawyer. */
  retainerBase: 600,
  retainerPerRank: 200,
  retainerMs: 7 * 24 * 60 * 60_000,
  /** Banker's cut of dirty money cleaned (the laundromat takes 30%). */
  launderCut: 0.22,
  launderMax: 20_000,
  /** Beat cop: heat off, once a day per officer, and it nags your conscience. */
  copFee: 150,
  copHeat: 15,
  /** Muscle: bodyguards for half a day. */
  muscleFee: 450,
  muscleMs: 12 * 60 * 60_000,
  /** Soldier: a drill session (more than the gym gives), costs energy. */
  drillFee: 40,
  drillEnergy: 12,
  drillXp: 1.6,
  /** Vigilante: watches your place for the night (break-ins are harder). */
  watchFee: 250,
  watchMs: 10 * 60 * 60_000,
  dayMs: 24 * 60 * 60_000,
};

export type ServiceId = "patch" | "surgery" | "retainer" | "launder" | "cop" | "muscle" | "drill" | "watch";
export interface Service { id: ServiceId; label: string; fee: number; note: string; block: string | null; amount?: boolean }

const usedAt = (p: Player, key: string) => p.regularServices?.[key] ?? 0;
const mark = (p: Player, key: string, now: number) => {
  p.regularServices = { ...(p.regularServices ?? {}), [key]: now };
};

/** Why this regular can't work for you right now (or null). */
function availability(p: Player, r: Player, now: number): string | null {
  const def = defFor(r);
  if (!def || !r.regular || !r.path) return "They don't do that kind of work.";
  if (countryOf(r) !== countryOf(p)) return "They work in another city.";
  if (!scheduledOut(def, now)) return "They're off the street right now. Come back during their hours.";
  if ((r.hospitalUntil ?? 0) > now) return "They're in the clinic.";
  if ((r.jailUntil ?? 0) > now) return "They're behind bars.";
  if ((p.jailUntil ?? 0) > now) return "Not from a cell.";
  return null;
}

export const retainerFee = (r: Player) => WORK.retainerBase + r.rank * WORK.retainerPerRank;
export const surgeryFee = (r: Player) => WORK.surgeryBase + r.rank * WORK.surgeryPerRank;
export const patchFee = (p: Player) => WORK.patchBase + Math.ceil(Math.max(0, playerMaxHp(p) - p.hp) * WORK.patchPerHp);

/** What this regular offers you, with why each one isn't possible right now. */
export function servicesOf(p: Player, r: Player, now: number): Service[] {
  if (!r.regular || !r.path) return [];
  const away = availability(p, r, now);
  const s = (id: ServiceId, label: string, fee: number, note: string, block: string | null, amount = false): Service => ({ id, label, fee, note, block: away ?? block, ...(amount ? { amount } : {}) });
  const out: Service[] = [];
  switch (r.path) {
    case "medicine":
      out.push(s("patch", "Patch you up", patchFee(p), "Heals you fully, cash.", p.hp >= playerMaxHp(p) ? "You're not hurt." : p.cash < patchFee(p) ? `It's $${patchFee(p)}, cash.` : null));
      if (r.rank >= WOUNDS.surgeryRank) {
        out.push(s("surgery", "Operate on old wounds", surgeryFee(r), "Fixes up to two old wounds.", !woundsOf(p) ? "You have no old wounds." : p.cash < surgeryFee(r) ? `It's $${surgeryFee(r)}, cash.` : null));
      }
      break;
    case "courts":
      if (r.rank >= BALANCE.justice.lawyerRank) {
        const mine = p.retainer && p.retainer.until > now && p.retainer.lawyerId === r.id;
        out.push(s("retainer", "Put them on retainer", retainerFee(r), "A week: if you're arrested, they defend you.", mine ? "They're already your lawyer." : !p.hasBankAccount || p.bank < retainerFee(r) ? `A week costs $${retainerFee(r)} from the bank.` : null));
      }
      break;
    case "banking":
      out.push(s("launder", "Clean dirty money", Math.round(WORK.launderCut * 100), `They keep ${Math.round(WORK.launderCut * 100)}%. Quietly.`, (p.dirty ?? 0) < 1 ? "You have no dirty money." : null, true));
      break;
    case "police":
      out.push(s("cop", "Look the other way", WORK.copFee, "Cools your record a little. Once a day.", p.heat < 1 ? "Your record's clean." : now - usedAt(p, `cop:${r.id}`) < WORK.dayMs ? "Once a day. Don't push it." : p.cash + (p.dirty ?? 0) < WORK.copFee ? `It's $${WORK.copFee}, cash or dirty.` : null));
      break;
    case "enforcer":
      out.push(s("muscle", "Watch your back", WORK.muscleFee, "Their people stay close for 12 hours.", (p.bodyguardUntil ?? 0) > now ? "You already have people with you." : p.cash < WORK.muscleFee ? `It's $${WORK.muscleFee}, cash.` : null));
      break;
    case "military":
      out.push(s("drill", "Drill with them", WORK.drillFee, "Strength and toughness, harder than the gym.", p.energy < WORK.drillEnergy ? "You're too tired." : p.cash < WORK.drillFee ? `It's $${WORK.drillFee}, cash.` : null));
      break;
    case "vigilante":
      out.push(s("watch", "Watch your place tonight", WORK.watchFee, "Break-ins at your home are harder for 10 hours.", (p.homeWatchUntil ?? 0) > now ? "They're already watching it." : p.cash < WORK.watchFee ? `It's $${WORK.watchFee}, cash.` : null));
      break;
  }
  return out;
}

/** Engine hooks the server passes in (they live in the engine and the justice module). */
export interface WorkHooks {
  drill: (p: Player, xp: Record<string, number>) => GameEvent[];
  lawyerPower: (r: Player) => number;
}

/** The player pays; the regular does the job. */
export function useService(p: Player, r: Player, id: ServiceId, now: number, hooks: WorkHooks, amount = 0): GameEvent[] {
  const svc = servicesOf(p, r, now).find((x) => x.id === id);
  if (!svc) throw new GameError("They don't offer that.");
  if (svc.block) throw new GameError(svc.block);
  const pay = (fee: number, dirtyOk = false) => {
    let left = fee;
    if (dirtyOk) {
      const d = Math.min(p.dirty ?? 0, left);
      p.dirty = (p.dirty ?? 0) - d;
      left -= d;
    }
    p.cash -= left;
    r.cash += fee;
  };
  switch (id) {
    case "patch": {
      const fee = patchFee(p);
      pay(fee);
      p.hp = playerMaxHp(p);
      return [{ tone: "good", text: `${r.name} cleans you up and stitches what needs stitching. Good as new. -$${fee}` }];
    }
    case "surgery": {
      const fee = surgeryFee(r);
      pay(fee);
      const fixed = Math.min(WOUNDS.surgeryRemoves, woundsOf(p));
      p.wounds = { count: woundsOf(p) - fixed, at: now };
      return [{ tone: "good", text: `${r.name} operates. ${fixed === 1 ? "An old wound" : "Two old wounds"} fixed. -$${fee}` }];
    }
    case "retainer": {
      const fee = retainerFee(r);
      p.bank -= fee;
      r.cash += fee;
      p.retainer = { lawyerId: r.id, name: r.name, power: hooks.lawyerPower(r), until: now + WORK.retainerMs };
      return [{ tone: "good", text: `${r.name} is your lawyer for the next week. If you're arrested, they're already on it. -$${fee} from the bank` }];
    }
    case "launder": {
      const a = Math.floor(Math.min(amount || (p.dirty ?? 0), p.dirty ?? 0, WORK.launderMax));
      if (a < 1) throw new GameError("How much?");
      const fee = Math.ceil(a * WORK.launderCut);
      p.dirty = (p.dirty ?? 0) - a;
      p.cash += a - fee;
      r.cash += fee;
      return [{ tone: "good", text: `${r.name} runs $${a.toLocaleString("en")} through the books. You get $${(a - fee).toLocaleString("en")} back clean.` }];
    }
    case "cop": {
      pay(WORK.copFee, true);
      p.heat = Math.max(0, p.heat - WORK.copHeat);
      shiftIntegrity(p, -1);
      mark(p, `cop:${r.id}`, now);
      return [{ tone: "good", text: `${r.name} pockets the envelope and a few of your notes go missing. Your record cools. -$${WORK.copFee}` }];
    }
    case "muscle": {
      pay(WORK.muscleFee);
      p.bodyguardUntil = Math.max(p.bodyguardUntil ?? now, now) + WORK.muscleMs;
      return [{ tone: "good", text: `${r.name}'s people fall in behind you. Nobody comes close for twelve hours. -$${WORK.muscleFee}` }];
    }
    case "drill": {
      pay(WORK.drillFee);
      p.energy -= WORK.drillEnergy;
      const xp = BALANCE.gym.xp * WORK.drillXp;
      return [{ tone: "good", text: `${r.name} runs you through drills until your legs shake. -$${WORK.drillFee}` }, ...hooks.drill(p, { strength: xp / 2, toughness: xp / 2 })];
    }
    case "watch": {
      pay(WORK.watchFee);
      p.homeWatchUntil = now + WORK.watchMs;
      return [{ tone: "good", text: `${r.name} says they'll keep an eye on your place tonight. -$${WORK.watchFee}` }];
    }
  }
}
