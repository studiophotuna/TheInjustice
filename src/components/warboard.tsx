"use client";

// A turf war as a live match: both crews, headcounts, the clock, who joined when, and the rosters.
// No odds: the board shows who's in, never who's likely to win.

import { useEffect, useState } from "react";
import { fmt, type GameApi } from "./useGame";

type Fighter = { name: string; at: number | null; me: boolean };
export type WarDistrict = {
  id: string;
  name: string;
  holder: { name: string; tag: string; mine: boolean; ally?: boolean } | null;
  war: {
    attacker: string;
    attackerName?: string;
    attackerTag?: string;
    startedAt?: number;
    endsAt: number;
    attackers: number;
    defenders: number;
    over: boolean;
    canJoin: string | null;
    canPeace: string | null;
    peacekeepers: number;
    attackerList?: Fighter[];
    defenderList?: Fighter[];
    mySide?: "attack" | "defend" | null;
  } | null;
};

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function Roster({ title, list, tone, slots }: { title: string; list: Fighter[]; tone: "red" | "teal"; slots: number }) {
  const empty = Math.max(0, slots - list.length);
  return (
    <div className={`roster tone-${tone}`}>
      <h4>{title}</h4>
      <div className="roster-faces">
        {list.map((f, i) => (
          <span key={i} className={`roster-face ${f.me ? "me" : ""}`} title={f.name}>
            <b>{initials(f.name)}</b>
            <small>{f.me ? "You" : f.name.split(" ")[0]}</small>
          </span>
        ))}
        {Array.from({ length: empty }, (_, i) => <span key={`e${i}`} className="roster-face empty">+</span>)}
      </div>
    </div>
  );
}

export function WarBoard({ d, game, act }: { d: WarDistrict; game: GameApi; act: (b: Record<string, unknown>) => Promise<void> }) {
  const w = d.war!;
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, w.endsAt - Date.now());
  const total = Math.max(1, w.attackers + w.defenders);
  const atkTag = w.attackerTag ?? w.attacker.match(/\[(.+)\]/)?.[1] ?? "ATK";
  const defTag = d.holder?.tag ?? "DEF";
  // Timeline: who joined which side, newest first. Older wars have no join times.
  const events = [
    ...(w.attackerList ?? []).map((f, i) => ({ ...f, side: "atk" as const, first: i === 0 })),
    ...(w.defenderList ?? []).map((f) => ({ ...f, side: "def" as const, first: false })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => b.at! - a.at!);
  const clock = (at: number) => {
    const m = Math.max(0, Math.floor((at - (w.startedAt ?? at)) / 1000));
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  return (
    <section className="warboard">
      <div className="wb-top">
        <span className={`wb-live ${w.over ? "over" : ""}`}>{w.over ? "Over" : "Live"}</span>
        <span className="wb-clock">{w.over ? "Fighting's over" : `${fmt(left)} left`}</span>
      </div>
      <h3 className="wb-district">{d.name}</h3>
      <p className="wb-sub">Who runs it after tonight</p>
      <div className="wb-score">
        <div className="wb-crew"><span className="wb-badge tone-red">{atkTag}</span><b>{w.attackerName ?? w.attacker}</b><small>Attacking</small></div>
        <div className="wb-nums">{w.attackers}<em>:</em>{w.defenders}</div>
        <div className="wb-crew"><span className="wb-badge tone-teal">{defTag}</span><b>{d.holder?.name ?? "Holding"}</b><small>Holding</small></div>
      </div>
      <div className="wb-tug" aria-label={`${w.attackers} fighting for ${atkTag}, ${w.defenders} for ${defTag}`}>
        <i style={{ width: `${(w.attackers / total) * 100}%` }} />
        <u />
      </div>
      <div className="wb-tug-label"><span>{w.attackers} in for {atkTag}</span><span>{w.defenders} in for {defTag}</span></div>
      {w.peacekeepers > 0 && <p className="wb-note">{w.peacekeepers} soldier{w.peacekeepers > 1 ? "s" : ""} sent in to break it up.</p>}

      {events.length > 0 && (
        <div className="wb-timeline">
          {events.map((e, i) => (
            <div key={i} className={`wb-ev ${e.side}`}>
              <span className="wb-who">{e.me ? "You" : e.name} {e.first ? "declared war" : "joined"}</span>
              <time>{clock(e.at!)}</time>
            </div>
          ))}
        </div>
      )}

      <div className="wb-rosters">
        <Roster title={atkTag} list={w.attackerList ?? []} tone="red" slots={Math.max(3, w.attackers + 1)} />
        <Roster title={defTag} list={w.defenderList ?? []} tone="teal" slots={Math.max(3, w.defenders + 1)} />
      </div>

      <div className="wb-acts">
        {!w.over && !w.canJoin && (
          <button className="btn btn-red" disabled={game.busy} onClick={() => act({ op: "join_war", district: d.id })}>Join the fight</button>
        )}
        {!w.over && w.canJoin && w.mySide && <span className="wb-note">You&apos;re in it, {w.mySide === "attack" ? "attacking" : "holding the line"}.</span>}
        {!w.over && !w.canPeace && (
          <button className="btn btn-ghost" disabled={game.busy} onClick={() => act({ op: "peacekeep", district: d.id })}>Break it up</button>
        )}
        {w.over && <button className="btn btn-red" disabled={game.busy} onClick={() => act({ op: "settle_war", district: d.id })}>Settle it</button>}
      </div>
    </section>
  );
}
