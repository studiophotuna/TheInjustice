"use client";
// The Velvet Ace: Twenty-One, roulette and Burning Seven, for cash. Shows what each bet pays,
// never anyone's chances.
import { useState } from "react";
import type { Card } from "@/game/casino";
import type { GameApi } from "./useGame";

const STAKES = [10, 50, 100, 500, 1000, 5000];
const RANK = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
// Text style (not emoji) suit symbols.
const SUIT: Record<Card["suit"], string> = { s: "♠︎", h: "♥︎", d: "♦︎", c: "♣︎" };
const RED_POCKETS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const money = (n: number) => `$${Math.abs(n).toLocaleString()}`;

function PlayingCard({ c, down }: { c?: Card; down?: boolean }) {
  if (down || !c) return <span className="pcard down" aria-label="Face down" />;
  const red = c.suit === "h" || c.suit === "d";
  return (
    <span className={`pcard ${red ? "red" : ""}`} aria-label={`${RANK[c.rank]} ${c.suit}`}>
      <b>{RANK[c.rank]}</b>
      <i>{SUIT[c.suit]}</i>
    </span>
  );
}

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function Die({ n }: { n: number }) {
  return (
    <span className="die" aria-label={String(n)}>
      {Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[n].includes(i) ? "on" : ""} />)}
    </span>
  );
}

function Stake({ stake, setStake, max }: { stake: number; setStake: (n: number) => void; max: number }) {
  return (
    <div className="stake-row" role="group" aria-label="Bet">
      {STAKES.filter((s) => s <= max).map((s) => (
        <button key={s} className={`stake ${stake === s ? "on" : ""}`} onClick={() => setStake(s)}>
          ${s.toLocaleString()}
        </button>
      ))}
    </div>
  );
}

export function Casino({ game }: { game: GameApi }) {
  const view = game.view!;
  const c = view.casino;
  const [table, setTable] = useState<"21" | "roulette" | "seven">(c.hand ? "21" : "21");
  const [stake, setStake] = useState(100);
  const [num, setNum] = useState("17");
  const busy = game.busy;
  const last = c.last;
  const play = (body: Record<string, unknown>) => game.act({ type: "casino", ...body } as never);
  const broke = view.cash < stake;

  if (view.location.country !== "solmarra") {
    return (
      <section className="card">
        <p className="muted">{c.name} is on the Casino Strip in Port Solace. Take the station to Solmarra.</p>
      </section>
    );
  }

  if (c.breakUntil) {
    return (
      <section className="card casino-door">
        <h3 className="card-title">The doorman shakes his head</h3>
        <p className="muted">You asked to be kept out until {new Date(c.breakUntil).toLocaleString()}. He&apos;s holding you to it.</p>
      </section>
    );
  }

  return (
    <div className="stack casino">
      <section className="card casino-night">
        <div>
          <span className="kicker">Tonight at {c.name}</span>
          <b className={c.net > 0 ? "up" : c.net < 0 ? "down" : ""}>{c.net === 0 ? "Even" : `${c.net > 0 ? "Up" : "Down"} ${money(c.net)}`}</b>
        </div>
        <p className="fine muted">
          Cash only, ${c.minBet} to ${c.maxBet.toLocaleString()} a bet. You have {money(view.cash)} on you. {money(c.leftToday)} more in bets tonight.
        </p>
      </section>

      <div className="segmented casino-tables" role="tablist">
        <button className={table === "21" ? "on" : ""} onClick={() => setTable("21")}>Twenty-One</button>
        <button className={table === "roulette" ? "on" : ""} onClick={() => setTable("roulette")}>Roulette</button>
        <button className={table === "seven" ? "on" : ""} onClick={() => setTable("seven")}>Burning Seven</button>
      </div>

      {table === "21" && (
        <section className="card table-21">
          <p className="fine muted">Get closer to 21 than the dealer without going over. The dealer stands on 17. Two-card 21 pays 3 to 2; a win pays 1 to 1.</p>
          {c.hand ? (
            <>
              <div className="hand"><span className="hand-who">Dealer</span><div className="cards"><PlayingCard c={c.hand.dealerUp} /><PlayingCard down /></div></div>
              <div className="hand"><span className="hand-who">You · {c.hand.youTotal}</span><div className="cards">{c.hand.you.map((x, i) => <PlayingCard key={i} c={x} />)}</div></div>
              <p className="fine muted">Bet: {money(c.hand.stake)}</p>
              <div className="row table-acts">
                <button className="btn btn-primary" disabled={busy} onClick={() => play({ game: "hit" })}>Hit</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => play({ game: "stand" })}>Stand</button>
                {c.hand.canDouble && (
                  <button className="btn btn-ghost" disabled={busy || view.cash < c.hand.stake} onClick={() => play({ game: "double" })}>Double</button>
                )}
              </div>
            </>
          ) : (
            <>
              {last?.game === "blackjack" && last.you && last.dealer && (
                <div className={`last-hand ${last.outcome}`}>
                  <div className="hand"><span className="hand-who">Dealer</span><div className="cards">{last.dealer.map((x, i) => <PlayingCard key={i} c={x} />)}</div></div>
                  <div className="hand"><span className="hand-who">You</span><div className="cards">{last.you.map((x, i) => <PlayingCard key={i} c={x} />)}</div></div>
                </div>
              )}
              <Stake stake={stake} setStake={setStake} max={c.maxBet} />
              <button className="btn btn-red btn-lg" disabled={busy || broke} onClick={() => play({ game: "deal", stake })}>Deal · {money(stake)}</button>
            </>
          )}
        </section>
      )}

      {table === "roulette" && (
        <section className="card table-roulette">
          {last?.game === "roulette" && last.pocket !== undefined && (
            <div className={`pocket ${last.pocket === 0 ? "green" : RED_POCKETS.has(last.pocket) ? "red" : "black"}`}>{last.pocket}</div>
          )}
          <Stake stake={stake} setStake={setStake} max={c.maxBet} />
          <div className="bet-grid">
            {(
              [
                ["red", "Red"],
                ["black", "Black"],
                ["odd", "Odd"],
                ["even", "Even"],
                ["low", "1 to 18"],
                ["high", "19 to 36"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={`bet bet-${id}`} disabled={busy || broke} onClick={() => play({ game: "roulette", bet: id, stake })}>
                <b>{label}</b>
                <span>pays 1 to 1</span>
              </button>
            ))}
          </div>
          <div className="row bet-number">
            <input inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 2))} aria-label="Number" />
            <button className="btn btn-red" disabled={busy || broke || num === "" || Number(num) > 36} onClick={() => play({ game: "roulette", bet: "number", number: Number(num), stake })}>
              Bet on {num || "?"} · pays 35 to 1
            </button>
          </div>
          <p className="fine muted">One zero on the wheel. Zero loses every bet except a bet on zero.</p>
        </section>
      )}

      {table === "seven" && (
        <section className="card table-seven">
          <div className="seven-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.webp" alt="" />
            <p className="fine muted">Two dice. Bet under seven, over seven, or the burning seven itself.</p>
          </div>
          {last?.game === "seven" && last.dice && (
            <div className="dice-row">
              <Die n={last.dice[0]} />
              <Die n={last.dice[1]} />
              <b>{last.dice[0] + last.dice[1]}</b>
            </div>
          )}
          <Stake stake={stake} setStake={setStake} max={c.maxBet} />
          <div className="bet-grid three">
            <button className="bet" disabled={busy || broke} onClick={() => play({ game: "seven", bet: "under", stake })}><b>Under 7</b><span>pays 1 to 1</span></button>
            <button className="bet bet-seven" disabled={busy || broke} onClick={() => play({ game: "seven", bet: "seven", stake })}><b>Seven</b><span>pays 4 to 1</span></button>
            <button className="bet" disabled={busy || broke} onClick={() => play({ game: "seven", bet: "over", stake })}><b>Over 7</b><span>pays 1 to 1</span></button>
          </div>
        </section>
      )}

      <section className="card casino-break">
        <h3 className="card-title">Walk away</h3>
        <p className="fine muted">The house always comes out ahead in the end. If tonight&apos;s not your night, ask the doorman to keep you out.</p>
        <div className="row">
          {[1, 7, 30].map((d) => (
            <button key={d} className="btn btn-ghost btn-sm" disabled={busy || !!c.hand} onClick={() => play({ game: "break", days: d })}>
              {d === 1 ? "A day" : `${d} days`}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
