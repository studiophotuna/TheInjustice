"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { GameApi } from "./useGame";

const REWARD = 15;

/**
 * Your first day, pinned to the top of Home: how far along you are, the one next thing to do,
 * and the full list on demand. Past rank 2 it only shows up when a reward is waiting.
 */
export function DayOne({ game, go }: { game: GameApi; go: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const steps = game.view!.tutorial;
  if (!steps) return null;
  const done = steps.filter((s) => s.claimed).length;
  const ready = steps.filter((s) => s.done && !s.claimed);
  const next = ready[0] ?? steps.find((s) => !s.done);
  const veteran = (game.view!.ladder?.current ?? 0) >= 2;
  const claimAll = () => game.act({ type: "tutorial", step: "all" });

  if (veteran) {
    if (!ready.length) return null;
    return (
      <section className="dayone compact">
        <span className="dayone-line">{ready.length} first-day reward{ready.length === 1 ? "" : "s"} waiting</span>
        <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={claimAll}>Claim ${ready.length * REWARD}</button>
      </section>
    );
  }

  return (
    <section className={`dayone ${open ? "open" : ""}`} aria-label="Your first day">
      <div className="dayone-head">
        <span className="dayone-kicker">Your first day</span>
        <span className="dayone-count">{done} of {steps.length}</span>
        <div className="dayone-bar" aria-hidden><span style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      </div>
      {next && (
        <div className="dayone-next">
          <div className="dayone-text">
            <b>{next.title}</b>
            <span>{next.done ? `Done. $${REWARD} is waiting for you.` : next.hint}</span>
          </div>
          {ready.length > 1 ? (
            <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={claimAll}>Claim all ${ready.length * REWARD}</button>
          ) : next.done ? (
            <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => game.act({ type: "tutorial", step: next.id })}>Claim ${REWARD}</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => go(next.go)}>Show me</button>
          )}
        </div>
      )}
      {open && (
        <ul className="dayone-list">
          {steps.map((s) => (
            <li key={s.id} className={s.claimed ? "claimed" : s.done ? "ready" : ""}>
              <span className="dayone-dot" aria-hidden />
              <span className="dayone-step">{s.title}</span>
              {s.done && !s.claimed ? (
                <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "tutorial", step: s.id })}>Claim ${REWARD}</button>
              ) : !s.claimed ? (
                <button className="btn btn-ghost btn-xs" onClick={() => go(s.go)}>Show me</button>
              ) : (
                <span className="dayone-done">Done</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="dayone-foot">
        <button className="dayone-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Fewer" : "All ten"} <ChevronDown size={14} className={open ? "flip" : ""} />
        </button>
        <button className="dayone-more" onClick={() => game.act({ type: "flag", flag: "tut:hidden" })}>Hide for good</button>
      </div>
    </section>
  );
}
