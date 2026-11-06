"use client";

// A turf war as a live match: both crews, headcounts, the clock, who joined when, and the rosters,
// all with faces. No odds: the board shows who's in, never who's likely to win.

import { Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { BALANCE } from "@/game/balance";
import { PlayerAvatar } from "./art/Portraits";
import { fmt, type GameApi } from "./useGame";

type Fighter = { name: string; at: number | null; me: boolean; photo?: string | null };
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

/** District photos whose file name differs from the district id. */
const SCENE: Record<string, string> = { precinct_square: "precinct", casino_strip: "casino", checkpoint_row: "checkpoint", glass_quarter: "halcyon" };
const sceneOf = (id: string) => `/scenes/${SCENE[id] ?? id.replace(/_/g, "")}.jpg`;
const first = (n: string) => n.split(" ")[0];

function Roster({ title, list, tone, slots }: { title: string; list: Fighter[]; tone: "red" | "teal"; slots: number }) {
  const empty = Math.max(0, slots - list.length);
  return (
    <div className={`roster tone-${tone}`}>
      <h4>{title}</h4>
      <div className="roster-faces">
        {list.map((f, i) => (
          <span key={i} className={`roster-face ${f.me ? "me" : ""}`} title={f.me ? "You" : f.name}>
            <PlayerAvatar name={f.name} photo={f.photo} className="roster-photo" />
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
  const atkName = w.attackerName ?? w.attacker;
  const defTag = d.holder?.tag ?? "DEF";
  const defName = d.holder?.name ?? "The holders";
  // Timeline: who joined which side, newest first. Older wars have no join times.
  const events = [
    ...(w.attackerList ?? []).map((f, i) => ({ ...f, side: "atk" as const, first: i === 0 })),
    ...(w.defenderList ?? []).map((f) => ({ ...f, side: "def" as const, first: false })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => b.at! - a.at!);
  const clock = (at: number) => {
    const s = Math.max(0, Math.floor((at - (w.startedAt ?? at)) / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  return (
    <section className="warboard">
      <div className="wb-hero">
        <img className="wb-bg" src={sceneOf(d.id)} alt="" />
        <div className="wb-top">
          <span className={`wb-live ${w.over ? "over" : ""}`}>{w.over ? "Over" : "Live"}</span>
          <span className="wb-clock">{w.over ? "Fighting's over" : `${fmt(left)} left`}</span>
        </div>
        <h3 className="wb-district">{d.name}</h3>
        <p className="wb-sub">Who runs it after tonight</p>
        <div className="wb-score">
          <div className="wb-crew"><span className="wb-badge tone-red">{atkTag}</span><b>{atkName}</b><small>Attacking · {w.attackers} in</small></div>
          <div className="wb-nums">{w.attackers}<em>:</em>{w.defenders}</div>
          <div className="wb-crew"><span className="wb-badge tone-teal">{defTag}</span><b>{defName}</b><small>Holding · {w.defenders} in</small></div>
        </div>
        <div className="wb-tug" aria-label={`${w.attackers} fighting for ${atkTag}, ${w.defenders} for ${defTag}`}>
          <i style={{ width: `${(w.attackers / total) * 100}%` }} />
          <u />
        </div>
        <div className="wb-tug-label"><span>{first(atkName)} attacking</span><span>Settled when the clock runs out</span></div>
      </div>
      {w.peacekeepers > 0 && <p className="wb-note">{w.peacekeepers} soldier{w.peacekeepers > 1 ? "s" : ""} sent in to break it up.</p>}

      {events.length > 0 && (
        <div className="wb-timeline">
          {events.map((e, i) => (
            <div key={i} className={`wb-ev ${e.side}`}>
              <div className="wb-ev-text">
                <b>{e.me ? "You" : first(e.name)} {e.first ? "declared war" : "joined"}</b>
                <small>{e.first ? `on ${d.name}` : `+1 ${e.side === "atk" ? atkName : defName}`}</small>
              </div>
              <PlayerAvatar name={e.name} photo={e.photo} className={`wb-ev-face tone-${e.side === "atk" ? "red" : "teal"}`} />
              <time>{clock(e.at!)}</time>
            </div>
          ))}
        </div>
      )}

      <div className="wb-rosters">
        <Roster title={atkName} list={w.attackerList ?? []} tone="red" slots={Math.max(3, w.attackers + 1)} />
        <Roster title={defName} list={w.defenderList ?? []} tone="teal" slots={Math.max(3, w.defenders + 1)} />
      </div>

      <div className="wb-acts">
        {!w.over && !w.canJoin && (
          <button className="btn btn-red" disabled={game.busy} onClick={() => act({ op: "join_war", district: d.id })}>Join the fight · <Zap size={14} />{BALANCE.turf.joinEnergy}</button>
        )}
        {!w.over && w.canJoin && w.mySide && <span className="wb-note">You&apos;re in it, {w.mySide === "attack" ? "attacking" : "holding the line"}.</span>}
        {!w.over && !w.canPeace && (
          <button className="btn btn-ghost" disabled={game.busy} onClick={() => act({ op: "peacekeep", district: d.id })}>Call peacekeepers</button>
        )}
        {w.over && <button className="btn btn-red" disabled={game.busy} onClick={() => act({ op: "settle_war", district: d.id })}>Settle it</button>}
      </div>
    </section>
  );
}
