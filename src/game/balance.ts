// Tunable numbers in one place. Timers are shortened for the first playable build
// so a play session shows every system; raise them for the real game.

export const BALANCE = {
  energy: {
    base: 50,
    /** Milliseconds to regenerate one point of energy with no housing. */
    regenMs: 60_000,
  },
  housing: [
    { name: "Cardboard box", regenMult: 1, bonusMax: 0 },
    { name: "Sleeping bag under the overpass", regenMult: 1.25, bonusMax: 10 },
    { name: "Rented room in Old Market", regenMult: 1.6, bonusMax: 25 },
  ],
  hp: { max: 100, regenMs: 30_000, hospitalMinMs: 3 * 60_000, hospitalMaxMs: 8 * 60_000 },
  /** Heat cools down by one point every this many ms. */
  heatDecayMs: 60_000,
  /** Heat at or above this blocks law jobs and draws police attention. */
  cleanRecordHeat: 10,
  /** How long food keeps you "full" before you can eat again. */
  foodCooldownMs: 10 * 60_000,
  bankOpenCost: 20,
  /** Chance of being mugged after a job when carrying more than `muggingMinCash`. */
  muggingChance: 0.1,
  muggingMinCash: 40,
  assessmentCooldownMs: 7 * 24 * 60 * 60_000,
  death: {
    /** Death chance when knocked out: (threat - safeRatio) * slope, capped. */
    safeRatio: 1.1,
    slope: 0.9,
    maxChance: 0.75,
    /** Share of every hidden stat kept after dying. */
    statsKept: 0.5,
    /** Share of reputation kept after dying. */
    reputationKept: 0.5,
  },
  /** Diminishing returns: XP multiplier is 1 / (1 + timesDone / this). */
  repeatFalloff: 60,
  logSize: 30,
} as const;

export function maxEnergy(housing: number): number {
  return BALANCE.energy.base + BALANCE.housing[housing].bonusMax;
}

export function regenMs(housing: number): number {
  return Math.round(BALANCE.energy.regenMs / BALANCE.housing[housing].regenMult);
}
