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
    { name: "Rented room", regenMult: 1.6, bonusMax: 25 },
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
  school: {
    /** Time the dean takes to review an application (shortened for testing). */
    reviewMs: 10 * 60_000,
    /** Vouched applications are reviewed faster and judged more kindly. */
    vouchedReviewMult: 0.5,
    vouchBonus: 6,
    /** Share of tuition refunded to the bank after a rejection. */
    refundShare: 0.75,
    reapplyCooldownMs: 30 * 60_000,
  },
  travel: {
    /** Extra time held by customs when flying with heat (shortened for testing). */
    customsDelayMs: 5 * 60_000,
  },
  gym: { fee: 5, energy: 10, xp: 2.2 },
  pvp: {
    energy: 15,
    /** New characters can't be attacked for this long (shortened for testing). */
    protectionMs: 2 * 60 * 60_000,
    /** Wait before attacking the same player again. */
    cooldownMs: 30 * 60_000,
    /** Share of the loser's cash on hand the winner takes. */
    cashShare: 0.1,
    heat: 8,
  },
  vouch: { minRank: 5, cooldownMs: 24 * 60 * 60_000 },
  /** Only street bosses can found crews: Mafia at Capo (rank 4) or above. */
  crew: { createCost: 500, maxMembers: 12, path: "enforcer", minRank: 4 },
  crime: {
    /** Cases stop accepting tips after this long (shortened for testing). */
    coldMs: 6 * 60 * 60_000,
    /** Witnesses have this long to decide whether to report. */
    sightingMs: 30 * 60_000,
    /** Players active this recently in the same country can witness a crime. */
    witnessWindowMs: 30 * 60_000,
    maxWitnesses: 3,
    /** Below this many player witnesses, stand-in bystanders leave tips. */
    minWitnesses: 2,
    cooldownMs: 30 * 60_000,
    reportRep: 1,
    /** Police rank needed to read case files (Patrol Officer) and to work them (Detective). */
    readRank: 2,
    detectiveRank: 4,
    investigateEnergy: 10,
  },
  justice: {
    /** Suspects are held this long; if no judge rules, the court clerk decides. */
    trialMs: 30 * 60_000,
    arrestEnergy: 10,
    /** Courts rank to argue a case (Junior Attorney) and to sit as judge (Judge). */
    lawyerRank: 2,
    judgeRank: 7,
    sentenceMs: { pickpocket: 10 * 60_000, snatch: 15 * 60_000, mug: 25 * 60_000 },
    minBribe: 50,
  },
  /** Other careers that help solve crimes. */
  casework: {
    /** Interns and up examine victims of snatches and muggings. */
    clinic: { minRank: 2, fee: 20, feePerRank: 5 },
    /** Loan Officers and up review cash deposits made soon after a crime. */
    bank: { minRank: 3, windowMs: 2 * 60 * 60_000, minDeposit: 50, buryShare: 0.1 },
    /** Night Patrollers and up hunt suspects on cold cases. */
    vigilante: { minRank: 2, energy: 15, heat: 6 },
  },
  chat: { cooldownMs: 3_000, maxLength: 280 },
  banking: {
    /** Bankers' interest per hour on savings (shortened for testing). */
    baseRatePerHour: 0.002,
    ratePerRank: 0.001,
    /** Never more than this share of the balance in one update. */
    maxGainShare: 0.05,
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
