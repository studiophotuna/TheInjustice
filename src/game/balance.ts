// Tunable numbers in one place. Pacing is checked with the simulator in pacing.ts
// (`npm run pacing`): see PACING.md for the targets and the latest table.

export const BALANCE = {
  energy: {
    /** A full bar is about a session's worth of work. */
    base: 100,
    /** Milliseconds to regenerate one point of energy with no housing (a full bar in ~5 hours). */
    regenMs: 3 * 60_000,
  },
  housing: [
    { name: "Cardboard box", regenMult: 1, bonusMax: 0 },
    { name: "Sleeping bag under the overpass", regenMult: 1.15, bonusMax: 15 },
    { name: "Rented room", regenMult: 1.35, bonusMax: 40 },
    { name: "Studio apartment", regenMult: 1.45, bonusMax: 55 },
    { name: "Townhouse", regenMult: 1.55, bonusMax: 70 },
    { name: "Penthouse", regenMult: 1.65, bonusMax: 85 },
  ],
  hp: { max: 100, regenMs: 30_000, hospitalMinMs: 10 * 60_000, hospitalMaxMs: 25 * 60_000 },
  /** Heat cools down by one point every this many ms. */
  heatDecayMs: 2 * 60_000,
  /** Heat at or above this blocks law jobs and draws police attention. */
  cleanRecordHeat: 10,
  /** How long food keeps you "full" before you can eat again. */
  foodCooldownMs: 3 * 60 * 60_000,
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
    /** Time the dean takes to review an application. */
    reviewMs: 60 * 60_000,
    /** Vouched applications are reviewed faster and judged more kindly. */
    vouchedReviewMult: 0.5,
    vouchBonus: 6,
    /** Share of tuition refunded to the bank after a rejection. */
    refundShare: 0.75,
    reapplyCooldownMs: 6 * 60 * 60_000,
  },
  travel: {
    /** Extra time held by customs when flying with heat. */
    customsDelayMs: 20 * 60_000,
  },
  gym: { fee: 12, energy: 10, xp: 2.2 },
  pvp: {
    energy: 15,
    /** New characters can't be attacked for this long. */
    protectionMs: 24 * 60 * 60_000,
    /** Wait before attacking the same player again. */
    cooldownMs: 30 * 60_000,
    /** Share of the loser's cash on hand the winner takes. */
    cashShare: 0.1,
    heat: 8,
    /** Survive an attack or mugging and the street leaves you alone this long. */
    immunityMs: 4 * 60 * 60_000,
  },
  /** The prison yard: fights for respect, prison shifts that shorten a sentence. */
  yard: {
    fightEnergy: 10,
    fightCooldownMs: 30 * 60_000,
    respect: 2,
    workEnergy: 10,
    workPay: [3, 6],
    goodBehaviorMs: 2 * 60_000,
  },
  /** Crew wars over districts. */
  turf: {
    claimCost: 8000,
    maxPerCrew: 3,
    /** Share of outsiders' job pay in a district that goes to the crew running it. */
    cut: 0.05,
    warMs: 30 * 60_000,
    peaceMs: 12 * 60 * 60_000,
    joinEnergy: 15,
    homeAdvantage: 1.15,
    heat: 6,
    damage: 25,
  },
  /** Bankers' laundering service: tellers and up, fee set by the banker. */
  launderService: { minRank: 2, minFee: 0.05, maxFee: 0.5 },
  /** Launderings this big get flagged for detectives. */
  launderProbe: { threshold: 500, energy: 15, fineShare: 0.5, jailMs: 15 * 60_000, windowMs: 3 * 24 * 60 * 60_000 },
  /** Police stop-and-frisk for drugs. */
  drugBust: { minRank: 2, minHeat: 10, energy: 10, cooldownMs: 60 * 60_000, baseJailMin: 10, maxJailMin: 60 },
  /** Crew drug labs. */
  lab: { cost: 15000, heatPerBatch: 8, tipHeat: 30, raidEnergy: 20, fineShare: 0.5 },
  /** Drugs: dealers pay this share of the street price; the more you deal, the more heat. */
  drugs: {
    sellShare: 0.8,
    heat: 1,
    maxCarry: 50,
    supplyPrice: 15,
    /** Chance a trip finds your stash. */
    seizeChance: { bus: 0.05, train: 0.15, plane: 0.35, car: 0 },
  },
  /** Bank heists. */
  heist: { energy: 20, cooldownMs: 24 * 60 * 60_000, baseTake: 3000, perRole: 0.25, heat: 15, caughtMs: 30 * 60_000 },
  /** Cleaning dirty money: fees by method; businesses can only take so much a day. */
  laundering: { laundromatFee: 0.3, businessFee: 0.1, bankerFee: 0.05, businessCapPerDay: 300 },
  /** Campaigns: money spent shows on the ballot (and breaks ties); a share pays for permits. */
  campaign: { min: 50, permitShare: 0.2, minBribe: 20 },
  /** Loans: bankers at legal rates, loan sharks at any rate; three days to pay. */
  /** Rates are per three-day term. A legal lender stays near payday-loan rates (about 15% over two weeks in real
   *  life); a loan shark's "vig" runs about 20% a week, so 30% for three days is already brutal. */
  loans: { min: 50, bankMaxRate: 0.05, sharkMaxRate: 0.3, termMs: 3 * 24 * 60 * 60_000, collectEnergy: 15 },
  /** Revenge contracts: a victim's reward for whoever gets their money back. */
  contracts: { min: 50, energy: 15 },
  /** Search warrants: a detective searches a suspect's home once per case. */
  search: { energy: 15, missChance: 0.2 },
  /** Lawyers on retainer: a week of defense, paid up front. Real criminal-defense retainers start around $1,000. */
  retainer: { base: 600, perRank: 200, weekMs: 7 * 24 * 60 * 60_000 },
  /** Doctors' back-alley treatment: cash, no paperwork. */
  /** Off-the-books doctor: cash, no records. Real discreet doctors charge a premium over urgent care ($300 to $1,000). */
  backAlley: { base: 200, perRank: 50 },
  /** Bounties on other players: posted from the bank, collected by beating the target. */
  bounty: { min: 100 },
  /** Bail = the stolen amount × this, at least `min`; refunded to whoever paid at the verdict. */
  bail: { multiplier: 3, min: 500 },
  /** A guilty verdict also carries a fine to the city, after the victim is paid back. Real theft fines run
   *  from a few hundred dollars to several thousand. */
  courtFine: { share: 0.5, min: 250, max: 10_000 },
  /** Crew prison breaks for members serving a sentence. */
  breakout: {
    joinEnergy: 15,
    /** Base odds, plus each member's skill, plus a bonus per extra member, capped. */
    base: 0.15,
    perMember: 0.06,
    maxTeam: 5,
    maxOdds: 0.85,
    /** Strict countries and crackdowns make it harder. */
    crackdownPenalty: 0.15,
    failJailMs: 20 * 60_000,
    failExtraMs: 10 * 60_000,
    heat: 15,
  },
  vouch: { minRank: 5, cooldownMs: 24 * 60 * 60_000 },
  /** Only street bosses can found crews: Mafia at Capo (rank 4) or above. */
  crew: { createCost: 5000, maxMembers: 12, path: "enforcer", minRank: 4 },
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
    sentenceMs: { pickpocket: 10 * 60_000, snatch: 15 * 60_000, mug: 25 * 60_000, murder: 6 * 60 * 60_000, attempted_murder: 2 * 60 * 60_000, assault: 45 * 60_000, burglary: 30 * 60_000, car_theft: 25 * 60_000 },
    minBribe: 50,
  },
  /** Other careers that help solve crimes. */
  casework: {
    /** Interns and up examine victims of snatches and muggings. */
    /** Examining a victim for the police (real forensic exams are paid by the state, several hundred dollars). */
    clinic: { minRank: 2, fee: 100, feePerRank: 20 },
    /** Loan Officers and up review cash deposits made soon after a crime. */
    bank: { minRank: 3, windowMs: 2 * 60 * 60_000, minDeposit: 50, buryShare: 0.1 },
    /** Night Patrollers and up hunt suspects on cold cases. */
    vigilante: { minRank: 2, energy: 15, heat: 6 },
  },
  /** The Mafia fights back; internal affairs fights the corruption. */
  racket: {
    /** Soldiers and up lean on witnesses of their own crimes. */
    intimidate: { minRank: 2, energy: 10, heat: 4 },
    /** Capos and up offer police officers money to lose a file. */
    payoff: { minRank: 4, minAmount: 100, copMinRank: 2 },
    /** Sergeants and up audit officials. */
    audit: { minRank: 5, energy: 20, cooldownMs: 24 * 60 * 60_000, jailMs: 20 * 60_000 },
  },
  city: {
    /** Mayors serve two weeks; the ballot opens for the last three days of a term. */
    termMs: 14 * 24 * 60 * 60_000,
    electionMs: 3 * 24 * 60 * 60_000,
    /** Reputation and filing fee (from the bank) to run for mayor. */
    runReputation: 25,
    runFee: 500,
    maxTax: 0.1,
    defaultTax: 0.03,
    maxBounty: 200,
    crackdownMs: 60 * 60_000,
    crackdownCooldownMs: 24 * 60 * 60_000,
    /** During a crackdown, crimes succeed less often and draw more heat. */
    crackdownOdds: 0.8,
    crackdownHeat: 1.5,
    salary: 150,
    salaryEveryMs: 24 * 60 * 60_000,
    /** The police chief (Detective or higher) the mayor appoints; paid daily from the treasury. */
    chiefRank: 4,
    chiefSalary: 100,
    /** Soup kitchen: each meal costs the treasury this much and restores this much energy.
     * Only for people with less than `soupMaxMoney` (cash + bank), once per `soupEveryMs`. */
    mealCost: 5,
    mealEnergy: 15,
    soupMaxMoney: 100,
    soupEveryMs: 6 * 60 * 60_000,
    /** Witness protection: a police detail paid from the treasury, per case. */
    protectionCost: 50,
    /** Recall: signatures needed = max(min, share × last election's turnout). */
    recallMin: 3,
    recallShare: 0.5,
  },
  /** Seen within this long counts as online. */
  onlineMs: 5 * 60_000,
  chat: { cooldownMs: 3_000, maxLength: 280 },
  banking: {
    /**
     * Bankers earn interest on savings: a daily rate (base + per rank) on the first
     * `capPerRank × rank` dollars only, so it's a perk, not a money printer.
     */
    baseRatePerDay: 0.005,
    ratePerRankPerDay: 0.001,
    capPerRank: 5000,
  },
  /**
   * Diminishing returns on repeating the same work: XP multiplier is 1 / (1 + recent / this),
   * where "recent" repetitions fade by half every `practiceHalfLifeMs`. Grinding one job all
   * day stops teaching you much; after a rest it's useful again.
   */
  repeatFalloff: 20,
  practiceHalfLifeMs: 12 * 60 * 60_000,
  /**
   * Progression speed. Every job teaches the same amount per point of energy (its own mix of
   * stats), so cheap jobs can't be farmed; career work teaches a little more. Promotion merit is
   * also per energy spent, and each rank needs `meritGrowth` times more than the one before.
   */
  /** Training slows down above this effective stat value: gains halve every `halfEvery` points. */
  statSoftCap: { start: 70, halfEvery: 10 },
  progress: {
    xpPerEnergy: 0.2,
    careerXpPerEnergy: 0.26,
    /** Casework earns experience like a career job of this much energy per point of merit. */
    meritXpEnergy: 5,
    meritGrowth: 2.2,
    meritScale: 8,
    /** The first promotion comes quicker, so the first day feels like progress. */
    firstRankMult: 0.5,
  },
  /** Hidden stat points (effective value) given to a career's key stats on joining and on
   * each promotion: base + perRank × (new rank − 1). */
  careerBonus: { base: 1, perRank: 0.25 },
  logSize: 30,
} as const;

export function maxEnergy(housing: number): number {
  return BALANCE.energy.base + BALANCE.housing[housing].bonusMax;
}

export function regenMs(housing: number): number {
  return Math.round(BALANCE.energy.regenMs / BALANCE.housing[housing].regenMult);
}
