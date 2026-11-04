"use client";

import { Footprints, Hand, Radio, Swords, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PATH_LOOKS, PlayerAvatar } from "./art/Portraits";
import type { GameApi } from "./useGame";

type CrimeKind = "pickpocket" | "snatch" | "mug";
type OnlinePlayer = {
  photo?: string | null;
  id: string;
  name: string;
  title: string;
  path: string | null;
  crewTag: string | null;
  status: "ok" | "hospital" | "traveling" | "dead";
  protected: boolean;
  read: string;
  danger: number;
  canAttack: string | null;
  canCrime: Record<CrimeKind, string | null>;
  bounty: number;
};

const DANGER = ["Easy", "Favorable", "Even", "Risky", "Deadly"];
const ACTIONS: { op: "attack" | CrimeKind; label: string; Icon: typeof Hand; danger?: boolean }[] = [
  { op: "attack", label: "Attack", Icon: Swords, danger: true },
  { op: "pickpocket", label: "Pickpocket", Icon: Hand },
  { op: "snatch", label: "Snatch", Icon: Footprints },
  { op: "mug", label: "Mug", Icon: Zap },
];

/**
 * Players in your city with the game open right now. Tap a name for one-tap actions.
 * `limit` keeps the Home version short.
 */
export function OnlineNow({ game, limit }: { game: GameApi; limit?: number }) {
  const view = game.view!;
  const [list, setList] = useState<OnlinePlayer[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/community?online=1", { cache: "no-store" });
    if (res.ok) setList((await res.json()).online);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    return () => clearInterval(t);
  }, [load, view.location.country]);

  const act = async (op: "attack" | CrimeKind, targetId: string) => {
    const body = op === "attack" ? { op: "attack", targetId } : { op: "crime", kind: op, targetId };
    if (await game.social(body)) load();
  };

  const shown = limit ? (list ?? []).slice(0, limit) : list ?? [];
  return (
    <section className="card online-now">
      <div className="row between">
        <h3 className="card-title">
          <Radio size={16} className="pulse" /> Online now · {view.location.city}
        </h3>
        <span className="chip chip-green">{list ? list.length : "…"}</span>
      </div>
      {list && list.length === 0 && <p className="muted">Nobody else is out on the streets of {view.location.city} right now.</p>}
      <ul className="online-list">
        {shown.map((o) => {
          const expanded = open === o.id;
          return (
            <li key={o.id} className={expanded ? "open" : ""}>
              <button className="online-who" onClick={() => setOpen(expanded ? null : o.id)} aria-expanded={expanded}>
                <PlayerAvatar name={o.name} path={o.path} photo={o.photo} className="avatar-sm" />
                <span className="online-name">
                  <b>{o.name}</b>
                  {o.crewTag && <span className="crew-tag"> [{o.crewTag}]</span>}
                  <span className="muted" style={{ color: o.path ? PATH_LOOKS[o.path]?.rim : undefined }}>
                    {o.title}
                    {o.status === "hospital" ? " · in the clinic" : o.status === "traveling" ? " · on the road" : ""}
                  </span>
                </span>
                {o.bounty > 0 && <span className="chip chip-red">${o.bounty}</span>}
                <span className={`danger-pill d${o.danger}`}>{DANGER[o.danger]}</span>
              </button>
              {expanded && (
                <div className="online-actions">
                  <p className="muted fine">&ldquo;{o.read}&rdquo;</p>
                  <div className="row wrap">
                    {ACTIONS.map(({ op, label, Icon, danger }) => {
                      const block = op === "attack" ? o.canAttack : o.canCrime[op];
                      return (
                        <button
                          key={op}
                          className={`btn btn-sm ${danger ? "btn-danger" : "btn-ghost"}`}
                          disabled={game.busy || !!block}
                          title={block ?? ""}
                          onClick={() => act(op, o.id)}
                        >
                          <Icon size={13} /> {label}
                        </button>
                      );
                    })}
                  </div>
                  {o.canAttack && Object.values(o.canCrime).every(Boolean) && <p className="job-lock fine">{o.canAttack}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {limit && list && list.length > limit && (
        <button className="btn btn-ghost btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("injustice:go", { detail: "tab:people" }))}>
          See all {list.length}
        </button>
      )}
    </section>
  );
}
