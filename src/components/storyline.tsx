"use client";

import { BookOpen, Briefcase, Coins, Cross, DoorClosed, Flame, MapPin, MessageCircle, Share2, Skull, Star, Users } from "lucide-react";
import { useState } from "react";
import type { GameApi } from "./useGame";

const ICONS: Record<string, typeof Star> = {
  start: DoorClosed,
  career: Briefcase,
  rank: Star,
  crew: Users,
  jail: Flame,
  clinic: Cross,
  story: BookOpen,
  money: Coins,
  move: MapPin,
  death: Skull,
  street: MessageCircle,
};

const DAY = 24 * 60 * 60_000;

/**
 * The story so far: your character's life, written as you play. Grouped by day since you were
 * released, newest first, and shareable as a few lines of text.
 */
export function StoryLine({ game }: { game: GameApi }) {
  const view = game.view!;
  const [all, setAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const entries = [...view.journal].reverse();
  if (!entries.length) return null;
  const day = (at: number) => Math.max(1, Math.floor((at - view.startedAt) / DAY) + 1);
  const shown = all ? entries : entries.slice(0, 4);
  const groups: { day: number; items: typeof entries }[] = [];
  for (const e of shown) {
    const d = day(e.at);
    const g = groups.at(-1);
    if (g && g.day === d) g.items.push(e);
    else groups.push({ day: d, items: [e] });
  }

  const share = async () => {
    const lines = [...view.journal].slice(-8).map((e) => `Day ${day(e.at)}: ${e.text}`);
    const text = `${view.name} in Crookvale\n${lines.join("\n")}\n\nEvery move has an agenda.`;
    try {
      if (navigator.share) await navigator.share({ title: `${view.name} · Crookvale`, text, url: window.location.origin });
      else {
        await navigator.clipboard.writeText(`${text}\n${window.location.origin}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // The player closed the share sheet.
    }
  };

  return (
    <section className="card storyline">
      <div className="row between">
        <h3 className="card-title">The story so far</h3>
        <button className="btn btn-ghost btn-xs" onClick={share}><Share2 size={13} /> {copied ? "Copied" : "Share"}</button>
      </div>
      <ol className="timeline">
        {groups.map((g) => (
          <li key={g.day}>
            <span className="tl-day">Day {g.day}</span>
            <ul>
              {g.items.map((e, i) => {
                const Icon = ICONS[e.kind] ?? Star;
                return (
                  <li key={i} className={`tl-${e.kind}`}>
                    <span className="tl-icon"><Icon size={13} /></span>
                    <span>{e.text}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
      {entries.length > 4 && (
        <button className="btn btn-ghost btn-sm" onClick={() => setAll(!all)}>{all ? "Show less" : `Show all ${entries.length}`}</button>
      )}
    </section>
  );
}
