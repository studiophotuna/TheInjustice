"use client";

// The city channel in the wide-screen side panel, under "Right now" and the live feed: who is
// talking, their faces, and a box to say something.

import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerAvatar } from "./art/Portraits";
import { usePulse } from "./pulse";
import type { GameApi } from "./useGame";

type Msg = { id: number; authorId: string; authorName: string; body: string; at: number };
type Author = { photo: string | null; path: string | null };

const ago = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  return m < 1 ? "now" : m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
};

export function CityChatRail({ game }: { game: GameApi }) {
  const view = game.view!;
  const channel = `country:${view.location.country}`;
  const pulse = usePulse(view.location.country);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/community?channel=${encodeURIComponent(channel)}`, { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      setMsgs(j.messages ?? []);
      setAuthors(j.authors ?? {});
    } catch {
      /* offline for a moment */
    }
  }, [channel]);
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  // Chat and city news in one timeline, oldest at the top.
  const items = msgs.slice(-24).map((m) => ({ kind: "msg" as const, at: m.at, m }));
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [items.length]);

  const faces = [...new Map(msgs.slice().reverse().map((m) => [m.authorId, m])).values()].slice(0, 7);

  return (
    <section className="cchat">
      <header className="cchat-head">
        <h3>City chat</h3>
        {pulse?.stats && <span className="cchat-online">{pulse.stats.out} out</span>}
      </header>
      {faces.length > 0 && (
        <div className="cchat-faces">
          {faces.map((m) => (
            <PlayerAvatar key={m.authorId} name={m.authorName} path={authors[m.authorId]?.path} photo={authors[m.authorId]?.photo} className="cchat-face" />
          ))}
        </div>
      )}
      <div className="cchat-list" ref={list}>
        {items.length === 0 && <p className="muted">Quiet tonight. Say something.</p>}
        {items.map((it) => (
          <div key={it.m.id} className={`cchat-msg ${it.m.authorId === view.id ? "mine" : ""}`}>
            <PlayerAvatar name={it.m.authorName} path={authors[it.m.authorId]?.path} photo={authors[it.m.authorId]?.photo} className="cchat-avatar" />
            <div>
              <p className="cchat-who">{it.m.authorId === view.id ? "You" : it.m.authorName} <time>{ago(it.at)}</time></p>
              <p className="cchat-body">{it.m.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form
        className="cchat-input"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          if (await game.social({ op: "say", channel, body: text })) {
            setText("");
            load();
          }
        }}
      >
        <input maxLength={280} placeholder={`Say something to ${view.location.city}…`} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="cchat-send" disabled={game.busy || !text.trim()} aria-label="Send"><Send size={14} /></button>
      </form>
    </section>
  );
}
