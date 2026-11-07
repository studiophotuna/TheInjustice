// The casino on the Casino Strip in Port Solace. In-game cash only: Favors can never be bet.
// Three tables, each with a small house edge, so over time the casino takes money out of the
// game. Players see what a bet pays, never their chances.
//
// Roulette: one zero, 37 pockets. Even-money bets and single numbers (pays 35 to 1).
// Burning Seven: two dice. Under 7 or over 7 pays even money; exactly 7 pays 4 to 1.
// Twenty-One: closest to 21 without going over beats the dealer. Dealer draws to 16 and stands
// on 17. A two-card 21 pays 3 to 2. Double down on the first two cards.
import { GameError, type GameEvent, type Player, type Rng } from "./types";

const DAY = 86_400_000;

export const CASINO = {
  name: "The Velvet Ace",
  country: "solmarra" as const,
  minBet: 10,
  maxBet: 5_000,
  /** Total bets a day, so a bad night can't empty a fortune in minutes. */
  dailyLimit: 100_000,
  /** Lines the table staff say; never a number about chances. */
};

export type RouletteBet = "red" | "black" | "odd" | "even" | "low" | "high" | "number";
export type SevenBet = "under" | "seven" | "over";

export const PAYS = {
  roulette: { red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1, number: 35 } as Record<RouletteBet, number>,
  seven: { under: 1, over: 1, seven: 4 } as Record<SevenBet, number>,
  blackjack: 1.5,
};

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const pocketColor = (n: number) => (n === 0 ? "green" : RED.has(n) ? "red" : "black");

export interface Card {
  rank: number; // 1 = ace … 13 = king
  suit: "s" | "h" | "d" | "c";
}

export interface CasinoState {
  /** The day (UTC) the counters belong to. */
  day: number;
  wagered: number;
  /** Won minus lost today. */
  net: number;
  /** A Twenty-One hand in progress. */
  hand?: { stake: number; you: Card[]; dealer: Card[]; doubled: boolean; at: number } | null;
  /** Taking a break: no bets until then. */
  breakUntil?: number;
  last?: CasinoResult | null;
}

export interface CasinoResult {
  game: "roulette" | "seven" | "blackjack";
  stake: number;
  /** Cash back to the player (stake + winnings), 0 on a loss. */
  paid: number;
  /** What happened, for drawing it. */
  pocket?: number;
  dice?: [number, number];
  you?: Card[];
  dealer?: Card[];
  outcome?: "win" | "lose" | "push" | "blackjack";
  at: number;
}

const dayOf = (now: number) => Math.floor(now / DAY);

function state(p: Player, now: number): CasinoState {
  const d = dayOf(now);
  if (!p.casino) p.casino = { day: d, wagered: 0, net: 0 };
  if (p.casino.day !== d) p.casino = { ...p.casino, day: d, wagered: 0, net: 0 };
  return p.casino;
}

/** Takes the bet from the player's cash, after the house rules. */
function takeStake(p: Player, stake: number, now: number) {
  const s = state(p, now);
  if ((s.breakUntil ?? 0) > now) throw new GameError("You asked the casino to keep you out for a while. The doorman remembers.");
  if (!Number.isInteger(stake) || stake < CASINO.minBet || stake > CASINO.maxBet) {
    throw new GameError(`Bets run from $${CASINO.minBet} to $${CASINO.maxBet.toLocaleString()}.`);
  }
  if (s.wagered + stake > CASINO.dailyLimit) throw new GameError("That's enough for tonight. The tables open to you again tomorrow.");
  if (p.cash < stake) throw new GameError("The tables take cash. You don't have that much on you.");
  p.cash -= stake;
  s.wagered += stake;
  s.net -= stake;
}

function pay(p: Player, amount: number, now: number) {
  const s = state(p, now);
  p.cash += amount;
  s.net += amount;
}

const fmt = (n: number) => `$${n.toLocaleString()}`;

// ── Roulette ──────────────────────────────────────────────────────────

export function playRoulette(p: Player, bet: RouletteBet, number: number | undefined, stake: number, now: number, rng: Rng): GameEvent[] {
  if (!(bet in PAYS.roulette)) throw new GameError("That bet isn't on the table.");
  if (bet === "number" && (!Number.isInteger(number) || number! < 0 || number! > 36)) throw new GameError("Pick a number from 0 to 36.");
  takeStake(p, stake, now);
  const pocket = Math.floor(rng() * 37);
  const color = pocketColor(pocket);
  const won =
    bet === "number"
      ? pocket === number
      : pocket !== 0 &&
        ((bet === "red" && color === "red") ||
          (bet === "black" && color === "black") ||
          (bet === "odd" && pocket % 2 === 1) ||
          (bet === "even" && pocket % 2 === 0) ||
          (bet === "low" && pocket <= 18) ||
          (bet === "high" && pocket >= 19));
  const paid = won ? stake * (PAYS.roulette[bet] + 1) : 0;
  if (paid) pay(p, paid, now);
  state(p, now).last = { game: "roulette", stake, paid, pocket, outcome: won ? "win" : "lose", at: now };
  const where = `${pocket} ${color}`;
  return [won ? { tone: "good", text: `The ball drops on ${where}. You win ${fmt(paid - stake)}.` } : { tone: "bad", text: `The ball drops on ${where}. The house takes ${fmt(stake)}.` }];
}

// ── Burning Seven ─────────────────────────────────────────────────────

export function playSeven(p: Player, bet: SevenBet, stake: number, now: number, rng: Rng): GameEvent[] {
  if (!(bet in PAYS.seven)) throw new GameError("That bet isn't on the table.");
  takeStake(p, stake, now);
  const dice: [number, number] = [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
  const sum = dice[0] + dice[1];
  const won = (bet === "under" && sum < 7) || (bet === "over" && sum > 7) || (bet === "seven" && sum === 7);
  const paid = won ? stake * (PAYS.seven[bet] + 1) : 0;
  if (paid) pay(p, paid, now);
  state(p, now).last = { game: "seven", stake, paid, dice, outcome: won ? "win" : "lose", at: now };
  const roll = `${dice[0]} and ${dice[1]}: ${sum}`;
  if (won && bet === "seven") return [{ tone: "good", text: `${roll}. The seven burns. You win ${fmt(paid - stake)}.` }];
  return [won ? { tone: "good", text: `${roll}. You win ${fmt(paid - stake)}.` } : { tone: "bad", text: `${roll}. The house takes ${fmt(stake)}.` }];
}

// ── Twenty-One ────────────────────────────────────────────────────────

const SUITS: Card["suit"][] = ["s", "h", "d", "c"];
/** Cards come from a big shuffled shoe: every card is as likely as in a fresh deck. */
const draw = (rng: Rng): Card => ({ rank: 1 + Math.floor(rng() * 13), suit: SUITS[Math.floor(rng() * 4)] });

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.rank === 1 ? 11 : Math.min(10, c.rank);
    if (c.rank === 1) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

const isNatural = (cards: Card[]) => cards.length === 2 && handValue(cards).total === 21;

/** Ends the hand: the dealer plays out, and the bet is settled. */
function settle(p: Player, now: number, rng: Rng): GameEvent[] {
  const s = state(p, now);
  const h = s.hand!;
  const stake = h.stake * (h.doubled ? 2 : 1);
  const you = handValue(h.you).total;
  let outcome: CasinoResult["outcome"];
  if (you > 21) outcome = "lose";
  else if (isNatural(h.you) && !isNatural(h.dealer)) outcome = "blackjack";
  else {
    while (handValue(h.dealer).total < 17) h.dealer.push(draw(rng));
    const dealer = handValue(h.dealer).total;
    if (isNatural(h.dealer) && !isNatural(h.you)) outcome = "lose";
    else if (dealer > 21 || you > dealer) outcome = "win";
    else if (you === dealer) outcome = "push";
    else outcome = "lose";
  }
  const paid = outcome === "blackjack" ? Math.floor(stake * (1 + PAYS.blackjack)) : outcome === "win" ? stake * 2 : outcome === "push" ? stake : 0;
  if (paid) pay(p, paid, now);
  s.last = { game: "blackjack", stake, paid, you: h.you, dealer: h.dealer, outcome, at: now };
  s.hand = null;
  const d = handValue(h.dealer).total;
  const text =
    outcome === "blackjack"
      ? `Twenty-one on two cards. You win ${fmt(paid - stake)}.`
      : outcome === "win"
        ? `${you} against the dealer's ${d > 21 ? "bust" : d}. You win ${fmt(paid - stake)}.`
        : outcome === "push"
          ? `${you} each. Your ${fmt(stake)} comes back.`
          : you > 21
            ? `${you}. Bust. The house takes ${fmt(stake)}.`
            : `${you} against the dealer's ${d}. The house takes ${fmt(stake)}.`;
  return [{ tone: outcome === "lose" ? "bad" : outcome === "push" ? "info" : "good", text }];
}

export function startTwentyOne(p: Player, stake: number, now: number, rng: Rng): GameEvent[] {
  if (state(p, now).hand) throw new GameError("Finish the hand you're playing first.");
  takeStake(p, stake, now);
  const s = state(p, now);
  s.hand = { stake, you: [draw(rng), draw(rng)], dealer: [draw(rng), draw(rng)], doubled: false, at: now };
  s.last = null;
  if (isNatural(s.hand.you) || isNatural(s.hand.dealer)) return settle(p, now, rng);
  return [];
}

export function hit(p: Player, now: number, rng: Rng): GameEvent[] {
  const s = state(p, now);
  if (!s.hand) throw new GameError("There's no hand on the table.");
  s.hand.you.push(draw(rng));
  if (handValue(s.hand.you).total >= 21) return settle(p, now, rng);
  return [];
}

export function stand(p: Player, now: number, rng: Rng): GameEvent[] {
  if (!state(p, now).hand) throw new GameError("There's no hand on the table.");
  return settle(p, now, rng);
}

export function doubleDown(p: Player, now: number, rng: Rng): GameEvent[] {
  const s = state(p, now);
  const h = s.hand;
  if (!h) throw new GameError("There's no hand on the table.");
  if (h.you.length !== 2) throw new GameError("You can only double on your first two cards.");
  if (p.cash < h.stake) throw new GameError("You need the same again in cash to double.");
  if (s.wagered + h.stake > CASINO.dailyLimit) throw new GameError("That's enough for tonight. The tables open to you again tomorrow.");
  p.cash -= h.stake;
  s.wagered += h.stake;
  s.net -= h.stake;
  h.doubled = true;
  h.you.push(draw(rng));
  return settle(p, now, rng);
}

/** Keeps the player out of the casino for a while, at their own request. */
export function takeBreak(p: Player, days: number, now: number): GameEvent[] {
  if (![1, 7, 30].includes(days)) throw new GameError("Bad request.");
  const s = state(p, now);
  if (s.hand) throw new GameError("Finish the hand you're playing first.");
  s.breakUntil = Math.max(s.breakUntil ?? 0, now + days * DAY);
  return [{ tone: "info", text: `The doorman won't let you in for ${days === 1 ? "a day" : `${days} days`}. Good call.` }];
}

/** What the casino screen shows. The dealer's second card stays face down mid-hand. */
export function casinoView(p: Player, now: number) {
  const s = p.casino && p.casino.day === dayOf(now) ? p.casino : { day: dayOf(now), wagered: 0, net: 0, hand: p.casino?.hand ?? null, breakUntil: p.casino?.breakUntil, last: p.casino?.last ?? null };
  const h = s.hand ?? null;
  return {
    name: CASINO.name,
    minBet: CASINO.minBet,
    maxBet: CASINO.maxBet,
    leftToday: Math.max(0, CASINO.dailyLimit - s.wagered),
    net: s.net,
    breakUntil: (s.breakUntil ?? 0) > now ? s.breakUntil! : null,
    hand: h ? { stake: h.stake, you: h.you, youTotal: handValue(h.you).total, dealerUp: h.dealer[0], canDouble: h.you.length === 2 } : null,
    last: s.last ?? null,
  };
}
