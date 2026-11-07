// The season pass. Every monthly season has ten levels, climbed by playing: each job or gym
// session is a mark, a fight won two, an arrest three. Each level has a free reward and a pass
// reward. Rewards are looks and Favors only, never power. The pass costs Favors and lasts the
// month. Anything earned but not collected is handed over when the month turns.
import { COSMETIC_BY_ID, creditFavors, spendFavors } from "./favors";
import { seasonId, seasonName } from "./season";
import { GameError, type GameEvent, type Player } from "./types";

export interface PassReward {
  /** A look only the pass gives out. */
  look?: string;
  favors?: number;
}

export const PASS = {
  price: 500,
  /** Favors instead of a look you already have (from an earlier month). */
  dupeFavors: 30,
  levels: [
    { marks: 10, free: { favors: 10 }, paid: { look: "color:ember" } },
    { marks: 25, free: { look: "color:jade" }, paid: { favors: 50 } },
    { marks: 45, free: { favors: 10 }, paid: { look: "banner:railyards" } },
    { marks: 70, free: { look: "banner:oldmarket" }, paid: { favors: 50 } },
    { marks: 100, free: { favors: 15 }, paid: { look: "frame:onyx" } },
    { marks: 140, free: { look: "frame:brass" }, paid: { favors: 75 } },
    { marks: 190, free: { favors: 15 }, paid: { look: "banner:halcyon" } },
    { marks: 250, free: { look: "color:smoke" }, paid: { look: "color:sunset" } },
    { marks: 320, free: { favors: 20 }, paid: { favors: 100 } },
    { marks: 400, free: { look: "banner:ironmoor" }, paid: { look: "frame:halo" } },
  ] as { marks: number; free: PassReward; paid: PassReward }[],
  marks: { job: 1, train: 1, win: 2, arrest: 3 },
};

export type PassTrack = "free" | "paid";

/** This month's pass for the player, starting a fresh one (and paying out the old) if needed. */
export function ensurePass(p: Player, now: number): NonNullable<Player["pass"]> {
  const id = seasonId(now);
  if (!p.pass || p.pass.season !== id) {
    if (p.pass) settle(p, now);
    p.pass = { season: id, marks: 0, premium: false, claimed: [] };
  }
  return p.pass;
}

/** Adds marks toward the pass. */
export function addMarks(p: Player, kind: keyof typeof PASS.marks, now: number): void {
  ensurePass(p, now).marks += PASS.marks[kind];
}

const key = (level: number, track: PassTrack) => `${track}:${level}`;

function reached(p: Player, level: number): boolean {
  return (p.pass?.marks ?? 0) >= PASS.levels[level].marks;
}

/** Gives one reward. Looks you already own turn into a few Favors. */
function grant(p: Player, r: PassReward, ref: string, now: number): string {
  const label = `Season pass`;
  if (r.look) {
    const owned = p.cosmetics?.owned ?? [];
    if (owned.includes(r.look)) {
      creditFavors(p, PASS.dupeFavors, `${label}: ${COSMETIC_BY_ID[r.look].name} again`, now, ref);
      return `${PASS.dupeFavors} Favors (you already have ${COSMETIC_BY_ID[r.look].name})`;
    }
    p.cosmetics = { ...(p.cosmetics ?? { owned: [] }), owned: [...owned, r.look] };
    return COSMETIC_BY_ID[r.look].name;
  }
  if (r.favors) {
    creditFavors(p, r.favors, label, now, ref);
    return `${r.favors} Favors`;
  }
  return "";
}

export function claimReward(p: Player, level: number, track: PassTrack, now: number): GameEvent[] {
  const pass = ensurePass(p, now);
  if (!Number.isInteger(level) || level < 0 || level >= PASS.levels.length) throw new GameError("Bad request.");
  if (!reached(p, level)) throw new GameError("You haven't reached that level yet.");
  if (track === "paid" && !pass.premium) throw new GameError("That one comes with the season pass.");
  if (pass.claimed.includes(key(level, track))) throw new GameError("Already collected.");
  pass.claimed.push(key(level, track));
  const what = grant(p, PASS.levels[level][track], `pass:${pass.season}:${key(level, track)}`, now);
  return [{ tone: "good", text: `Collected: ${what}.` }];
}

export function buyPass(p: Player, now: number): GameEvent[] {
  const pass = ensurePass(p, now);
  if (pass.premium) throw new GameError("You already have this month's pass.");
  if ((p.favors ?? 0) < PASS.price) throw new GameError("You don't have enough Favors.");
  spendFavors(p, PASS.price, now);
  p.favorLog = [{ at: now, delta: -PASS.price, what: `Season pass: ${seasonName(pass.season)}` }, ...(p.favorLog ?? [])].slice(0, 40);
  pass.premium = true;
  return [{ tone: "good", text: `The ${seasonName(pass.season)} pass is yours. Every level you've reached is ready to collect.` }];
}

/** Pays out whatever was earned but not collected, when a month ends. */
function settle(p: Player, now: number) {
  const pass = p.pass!;
  PASS.levels.forEach((lvl, i) => {
    if (pass.marks < lvl.marks) return;
    for (const track of ["free", "paid"] as const) {
      if (track === "paid" && !pass.premium) continue;
      if (pass.claimed.includes(key(i, track))) continue;
      pass.claimed.push(key(i, track));
      grant(p, lvl[track], `pass:${pass.season}:${key(i, track)}`, now);
    }
  });
}

export function passView(p: Player, now: number) {
  const id = seasonId(now);
  const pass = p.pass?.season === id ? p.pass : { season: id, marks: 0, premium: false, claimed: [] as string[] };
  const next = new Date(Date.UTC(Math.floor((id + 1) / 12), (id + 1) % 12, 1)).getTime();
  return {
    name: seasonName(id),
    endsAt: next,
    marks: pass.marks,
    premium: pass.premium,
    price: PASS.price,
    levels: PASS.levels.map((l, i) => ({
      marks: l.marks,
      reached: pass.marks >= l.marks,
      free: { ...l.free, name: l.free.look ? COSMETIC_BY_ID[l.free.look]?.name : null, claimed: pass.claimed.includes(key(i, "free")) },
      paid: { ...l.paid, name: l.paid.look ? COSMETIC_BY_ID[l.paid.look]?.name : null, claimed: pass.claimed.includes(key(i, "paid")) },
    })),
  };
}
