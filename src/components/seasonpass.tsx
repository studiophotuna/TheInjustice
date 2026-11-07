"use client";
// The season pass: ten levels a month, climbed by playing. Free rewards for everyone, more with
// the pass. Looks and Favors only.
import { useState } from "react";
import type { GameApi } from "./useGame";

const left = (ms: number) => {
  const d = Math.floor(ms / 86_400_000);
  if (d >= 1) return `${d} day${d === 1 ? "" : "s"}`;
  const h = Math.max(1, Math.floor(ms / 3_600_000));
  return `${h} hour${h === 1 ? "" : "s"}`;
};

type Reward = { look?: string; favors?: number; name: string | null; claimed: boolean };

function RewardChip({ r, ready, locked, onClaim, busy }: { r: Reward; ready: boolean; locked: boolean; onClaim: () => void; busy: boolean }) {
  const label = r.name ?? `${r.favors} Favors`;
  const kind = r.look?.split(":")[0];
  return (
    <div className={`pass-reward ${r.claimed ? "got" : ""} ${locked ? "locked" : ""}`}>
      <span className="pass-kind">{kind === "frame" ? "Frame" : kind === "color" ? "Name colour" : kind === "banner" ? "Banner" : "Favors"}</span>
      <b>{label}</b>
      {r.claimed ? (
        <span className="pass-got">Collected</span>
      ) : ready && !locked ? (
        <button className="btn btn-primary btn-xs" disabled={busy} onClick={onClaim}>Collect</button>
      ) : null}
    </div>
  );
}

export function SeasonPass({ game }: { game: GameApi }) {
  const view = game.view!;
  const pass = view.pass;
  const [open, setOpen] = useState(false);
  const next = pass.levels.findIndex((l) => !l.reached);
  const nextMarks = next === -1 ? null : pass.levels[next].marks;
  const prevMarks = next <= 0 ? 0 : pass.levels[next - 1].marks;
  const pct = nextMarks === null ? 100 : Math.min(100, ((pass.marks - prevMarks) / (nextMarks - prevMarks)) * 100);
  const level = next === -1 ? pass.levels.length : next;
  const ready = pass.levels.reduce((n, l) => n + (l.reached && !l.free.claimed ? 1 : 0) + (pass.premium && l.reached && !l.paid.claimed ? 1 : 0), 0);
  const claim = (level: number, track: "free" | "paid") => game.act({ type: "pass_claim", level, track });
  return (
    <section className="card season-pass">
      <div className="pass-head">
        <div>
          <span className="kicker">Season pass · {pass.name}</span>
          <h3>Level {level} of {pass.levels.length}</h3>
          <p className="fine muted">Ends in {left(pass.endsAt - Date.now())}. Jobs, training, fights won and arrests all count.</p>
        </div>
        {!pass.premium ? (
          <button className="btn btn-red btn-sm" disabled={game.busy || view.favors.balance < pass.price} onClick={() => game.act({ type: "pass_buy" })}>
            Get the pass · {pass.price} Favors
          </button>
        ) : (
          <span className="pass-owned">Pass holder</span>
        )}
      </div>
      <div className="pass-bar"><span style={{ width: `${pct}%` }} /></div>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)}>
        {open ? "Hide rewards" : ready > 0 ? `See rewards · ${ready} ready` : "See rewards"}
      </button>
      {open && (
        <ol className="pass-levels">
          {pass.levels.map((l, i) => (
            <li key={i} className={l.reached ? "reached" : ""}>
              <span className="pass-num">{i + 1}</span>
              <RewardChip r={l.free} ready={l.reached} locked={false} busy={game.busy} onClaim={() => claim(i, "free")} />
              <RewardChip r={l.paid} ready={l.reached} locked={!pass.premium} busy={game.busy} onClaim={() => claim(i, "paid")} />
            </li>
          ))}
        </ol>
      )}
      {open && !pass.premium && <p className="fine muted">The right-hand rewards come with the pass. Buy it any time this month and every level you&apos;ve reached is ready to collect.</p>}
    </section>
  );
}
