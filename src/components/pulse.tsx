"use client";

import { ArrowRight, Briefcase, Coins, Crown, Gift, MessageCircle, Radio, Siren, Sparkles, X, Zap } from "lucide-react";
import { PlayerAvatar } from "./art/Portraits";
import { useScrollLock } from "./scrollLock";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { fmt, type GameApi } from "./useGame";

export type FeedItem = { at: number; text: string; kind: "city" | "street" };
export type CrewNeed = { kind: string; text: string; cta: string; go: string; until: number | null };
export type Heavy = {
  id: string; name: string; photo: string | null; title: string; path: string | null; out: boolean; status: string;
  canAttack: string | null; hours: [number, number] | null; reputation: number;
  tie: { label: string; tone: string; memo: string } | null;
};
type Pulse = { feed: FeedItem[]; needs: CrewNeed[]; heavies?: Heavy[]; stats?: { out: number; crews: number; wanted: number; fires: number } };

/** The street feed and your crew's needs, refreshed every minute while the page is visible. */
export function usePulse(country: string) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/community?pulse=1", { cache: "no-store" });
      if (res.ok) setPulse(await res.json());
    } catch {
      // Offline for a moment; keep what we have.
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    window.addEventListener("conspira:changed", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("conspira:changed", load);
    };
  }, [load, country]);
  return pulse;
}

const ago = (at: number) => {
  const m = Math.max(0, Math.round((Date.now() - at) / 60_000));
  return m < 1 ? "now" : m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
};

/** A thin, slowly scrolling ticker of what's happening in the city. */
export function StreetFeed({ feed }: { feed: FeedItem[] | undefined }) {
  if (!feed?.length) return null;
  const items = [...feed, ...feed];
  return (
    <div className="street-feed" aria-label="What's happening in the city">
      <span className="feed-live"><Radio size={12} className="pulse" /> Live</span>
      <div className="feed-window">
        <div className="feed-track" style={{ animationDuration: `${Math.max(30, feed.length * 9)}s` }}>
          {items.map((f, i) => (
            <span key={i} className={`feed-item ${f.kind}`} aria-hidden={i >= feed.length}>
              <i>{ago(f.at)}</i> {f.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type Move = { key: string; icon: typeof Zap; tone: "urgent" | "money" | "normal"; title: string; text?: string; cta: string; run: () => void };

/**
 * One card at the top of Home: the single most useful thing to do right now, plus up to two
 * smaller follow-ups. Crew needs come first, then money waiting, then work.
 */
export function RightNow({ game, go, needs, onRead }: { game: GameApi; go: (t: string) => void; needs: CrewNeed[]; onRead: (id: string) => void }) {
  const view = game.view!;
  const live = game.live!;
  const moves: Move[] = [];
  const blocked = !!view.jail || !!view.travel || live.hospital > 0 || !!view.threat.morgueUntil;

  for (const n of needs) {
    moves.push({
      key: `need-${n.kind}`,
      icon: Siren,
      tone: "urgent",
      title: n.text,
      text: n.until ? `${fmt(n.until - Date.now())} left` : undefined,
      cta: n.cta,
      run: () => go(n.go),
    });
  }
  if (view.disposal) {
    moves.push({ key: "body", icon: Siren, tone: "urgent", title: `${view.disposal.targetName}'s body needs dealing with.`, text: `${fmt(view.disposal.until - Date.now())} to decide`, cta: "Decide", run: () => go("tab:home") });
  }
  if (view.encounter) {
    const e = view.encounter;
    moves.push({ key: "encounter", icon: MessageCircle, tone: "urgent", title: `${e.name} wants a word.`, text: `${fmt(e.expiresAt - Date.now())} before they move on`, cta: "Hear them out", run: () => window.dispatchEvent(new Event("conspira:encounter")) });
  }
  if (view.sightings.length) {
    moves.push({ key: "sighting", icon: Siren, tone: "urgent", title: "You saw something. The police would like to know.", cta: "Decide", run: () => go("people:inbox") });
  }
  if (view.daily.canClaim) {
    moves.push({ key: "daily", icon: Gift, tone: "money", title: `Your day ${view.daily.nextDay} reward is waiting.`, cta: "Collect", run: () => game.act({ type: "claim_daily" }) });
  }
  const waiting = view.properties.filter((p) => p.owned && p.waiting >= 1);
  if (waiting.length) {
    const total = waiting.reduce((s, p) => s + Math.floor(p.waiting), 0);
    moves.push({
      key: "business",
      icon: Coins,
      tone: "money",
      title: `Your ${waiting.length === 1 ? waiting[0].name.toLowerCase() : "businesses"} made $${total.toLocaleString("en")}.`,
      cta: "Collect",
      run: async () => {
        for (const p of waiting) await game.act({ type: "collect_property", id: p.id });
      },
    });
  }
  if (view.promoChoice) {
    moves.push({ key: "promo", icon: Sparkles, tone: "money", title: `${view.promoChoice.title}: how did the job change you?`, cta: "Choose", run: () => go("tab:profile") });
  }
  const exit = view.careerRecord.exit;
  if (exit?.started) {
    const done = exit.items.filter((i) => i.done).length;
    moves.push({
      key: "exit",
      icon: Sparkles,
      tone: exit.ready ? "money" : "normal",
      title: exit.ready ? "You're clean. You can leave your career now." : `Getting out: ${done} of ${exit.items.length} done.`,
      cta: exit.ready ? "Leave" : "See what's left",
      run: () => go("tab:profile"),
    });
  }
  const unread = view.chapters.find((c) => c.unlocked && !c.read);
  if (unread) moves.push({ key: "story", icon: Sparkles, tone: "normal", title: `New chapter: ${unread.title}`, cta: "Read", run: () => onRead(unread.id) });

  const best = view.jobs.find((j) => j.id === view.recommendedJobId);
  if (!blocked) {
    if (best) {
      moves.push({
        key: "work",
        icon: Briefcase,
        tone: "normal",
        title: live.fullIn === 0 ? `Your energy is full. ${best.name}?` : best.name,
        text: `$${best.pay[0]}–${best.pay[1]} · ⚡${best.energy}`,
        cta: "Go to work",
        run: () => go(`job:${best.id}`),
      });
    } else {
      moves.push({ key: "rest", icon: Zap, tone: "normal", title: `Out of energy. Full in ${fmt(live.fullIn)}.`, text: "Eat something, or check on the people in your city.", cta: "Shop", run: () => go("tab:shop") });
    }
  }
  if (!moves.length) return null;
  const [top, ...rest] = moves;
  const Icon = top.icon;

  return (
    <section className={`card right-now ${top.tone}`}>
      <p className="eyebrow">Right now</p>
      <div className="right-now-top">
        <span className="right-now-icon"><Icon size={20} /></span>
        <div>
          <b>{top.title}</b>
          {top.text && <p className="muted fine">{top.text}</p>}
        </div>
      </div>
      <motion.button whileTap={{ scale: 0.95 }} className={`btn ${top.tone === "urgent" ? "btn-danger" : "btn-primary"}`} disabled={game.busy} onClick={top.run}>
        {top.cta} <ArrowRight size={15} />
      </motion.button>
      {rest.length > 0 && (
        <ul className="right-now-more">
          {rest.slice(0, 2).map((m) => (
            <li key={m.key}>
              <button disabled={game.busy} onClick={m.run}>
                <m.icon size={14} /> <span>{m.title}</span> <b>{m.cta}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── While you were away ─────────────────────────────────────────────────────

const AWAY_KEY = "cns_away";
const AWAY_MS = 30 * 60_000;

type Snapshot = { at: number; cash: number; bank: number; rep: number; feel: Record<string, string>; inboxTop: number; rank: string | null };

const snap = (game: GameApi): Snapshot => {
  const v = game.view!;
  return {
    at: Date.now(),
    cash: v.cash,
    bank: v.bank,
    rep: v.reputation,
    feel: { Body: v.feel.body, Reflexes: v.feel.reflexes, "Street smarts": v.feel.smarts, Presence: v.feel.presence },
    inboxTop: v.inbox.items[0]?.at ?? 0,
    rank: v.path?.rank ?? null,
  };
};

const read = (): Snapshot | null => {
  try {
    const raw = localStorage.getItem(AWAY_KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
};
const write = (s: Snapshot) => {
  try {
    localStorage.setItem(AWAY_KEY, JSON.stringify(s));
  } catch {
    // Private mode: no recap next time, that's all.
  }
};

/** When you come back after a while: what happened, in a few lines. */
export function AwayRecap({ game }: { game: GameApi }) {
  const [recap, setRecap] = useState<{ gone: number; lines: { tone: string; text: string }[] } | null>(null);
  useScrollLock(!!recap);
  const view = game.view;

  useEffect(() => {
    if (!view) return;
    const prev = read();
    if (prev && Date.now() - prev.at > AWAY_MS) {
      const lines: { tone: string; text: string }[] = [];
      const news = view.inbox.items.filter((n) => n.at > prev.inboxTop).slice(0, 5);
      for (const n of news) lines.push({ tone: n.tone, text: n.text });
      const money = view.cash + view.bank - (prev.cash + prev.bank);
      if (Math.abs(money) >= 1) lines.push({ tone: money > 0 ? "good" : "bad", text: `${money > 0 ? "+" : "-"}$${Math.abs(Math.round(money)).toLocaleString("en")} since you left.` });
      if (view.reputation !== prev.rep) lines.push({ tone: view.reputation > prev.rep ? "good" : "bad", text: `Reputation ${view.reputation > prev.rep ? "up" : "down"} ${Math.abs(view.reputation - prev.rep)}.` });
      const now = { Body: view.feel.body, Reflexes: view.feel.reflexes, "Street smarts": view.feel.smarts, Presence: view.feel.presence };
      for (const [k, v] of Object.entries(now)) if (prev.feel[k] && prev.feel[k] !== v) lines.push({ tone: "good", text: `${k}: ${v}` });
      if (game.live && game.live.fullIn === 0) lines.push({ tone: "info", text: "Your energy is full." });
      if (lines.length) setRecap({ gone: Date.now() - prev.at, lines });
    }
    write(snap(game));
    const t = setInterval(() => game.view && write(snap(game)), 60_000);
    return () => clearInterval(t);
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!view]);

  if (!recap) return null;
  return (
    <div className="modal-backdrop" onClick={() => setRecap(null)}>
      <motion.div className="modal glass away-recap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn away-close" aria-label="Close" onClick={() => setRecap(null)}><X size={18} /></button>
        <p className="eyebrow">While you were away · {fmt(recap.gone)}</p>
        <h2>The city kept moving.</h2>
        <ul className="log">
          {recap.lines.map((l, i) => <li key={i} className={l.tone}>{l.text}</li>)}
        </ul>
        <button className="btn btn-primary" onClick={() => setRecap(null)}>Back to it</button>
      </motion.div>
    </div>
  );
}

// ── Guest chip ──────────────────────────────────────────────────────────────

const GUEST_KEY = "cns_guest_hidden";

/** A small reminder to save your character. Dismissed, it comes back once, at your next promotion. */
export function GuestChip({ game, onSave }: { game: GameApi; onSave: () => void }) {
  const rank = game.view!.ladder?.current ?? 0;
  const [hiddenAt, setHiddenAt] = useState<number | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(GUEST_KEY);
      setHiddenAt(v === null ? -1 : Number(v));
    } catch {
      setHiddenAt(-1);
    }
  }, []);
  if (game.account || hiddenAt === null) return null;
  // Hidden at rank N: show again once you're promoted past it (once; hiding again sets a new rank).
  if (hiddenAt >= 0 && rank <= hiddenAt) return null;
  const hide = () => {
    try {
      localStorage.setItem(GUEST_KEY, String(rank));
    } catch {
      // ignore
    }
    setHiddenAt(rank);
  };
  return (
    <div className="guest-chip">
      <button onClick={onSave}>💾 {hiddenAt >= 0 ? "Promoted! Save your character so you never lose it." : "Playing as a guest · Save your character"}</button>
      <button className="guest-x" aria-label="Hide" onClick={hide}><X size={14} /></button>
    </div>
  );
}

// ── Deep links into People sections ─────────────────────────────────────────

let pendingSection: string | null = null;
export const setPeopleSection = (s: string) => {
  pendingSection = s;
};
/** The section People should open on (once). */
export const takePeopleSection = () => {
  const s = pendingSection;
  pendingSection = null;
  return s;
};

// ── Desktop side panel ──────────────────────────────────────────────────────

/** Desktop only: what to do, what's happening and who's out, beside every screen. */
export function LiveRail({ game, go, onRead }: { game: GameApi; go: (t: string) => void; onRead: (id: string) => void }) {
  const pulse = usePulse(game.view!.location.country);
  return (
    <div className="rail-inner">
      <RightNow game={game} go={go} needs={pulse?.needs ?? []} onRead={onRead} />
      {!!pulse?.feed.length && (
        <section className="card rail-feed">
          <h3 className="card-title"><Radio size={14} className="pulse" /> Live in {game.view!.location.city}</h3>
          <ul>
            {pulse.feed.slice(0, 8).map((f, i) => (
              <li key={i} className={f.kind}>
                <span>{f.text}</span>
                <i>{ago(f.at)}</i>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── Big fish ────────────────────────────────────────────────────────────────


/** When a heavy is next out, in the player's own clock. */
export function nextOut(hours: [number, number] | null): string {
  if (!hours) return "";
  const d = new Date();
  d.setUTCHours(hours[0], 0, 0, 0);
  if (d.getTime() < Date.now()) d.setUTCDate(d.getUTCDate() + 1);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * The city's heavies: the people who actually run these streets. Where they are, how a fight
 * would go, and a way to take them on (alone if you're strong enough, with your crew if not).
 */
export function BigFish({ game, heavies, go }: { game: GameApi; heavies: Heavy[] | undefined; go: (t: string) => void }) {
  if (!heavies?.length) return null;
  return (
    <section className="card bigfish">
      <h3 className="card-title"><Crown size={16} /> Big fish in {game.view!.location.city}</h3>
      <p className="fine muted">The people who really run these streets. Beat one and the whole city hears about it.</p>
      <ul className="bigfish-list">
        {heavies.map((h) => (
          <li key={h.id} className={h.out ? "out" : ""}>
            <PlayerAvatar name={h.name} path={h.path} photo={h.photo} className="avatar-md" />
            <div className="bf-body">
              <b>{h.name}</b>
              <span className="fine muted">{h.title} · ★ {h.reputation}</span>
              <span className="row bf-tags">
                {h.status === "hospital" ? (
                  <span className="chip chip-red">In the clinic</span>
                ) : h.out ? (
                  <span className="chip chip-green">Out now</span>
                ) : (
                  <span className="chip">Out at {nextOut(h.hours)}</span>
                )}
                {h.tie && <span className={`tie-badge tie-${h.tie.tone}`}>{h.tie.label}</span>}
              </span>
            </div>
            <div className="bf-actions">
              {h.out && !h.canAttack && (
                <button className="btn btn-danger btn-sm" disabled={game.busy} onClick={() => confirm(`Take on ${h.name} alone? Heavies don't go down easy.`) && game.social({ op: "attack", targetId: h.id })}>
                  Take them on
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => go("people:crew")} title="Plan an ambush with your crew from their file in People.">Bring a crew</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Ready board ─────────────────────────────────────────────────────────────

type ReadyItem = { key: string; label: string; ready: boolean; until?: number; go?: string; run?: () => unknown };

/** What you can do now, and what's on a timer, at a glance. */
export function ReadyStrip({ game, go }: { game: GameApi; go: (t: string) => void }) {
  const view = game.view!;
  const live = game.live!;
  const items: ReadyItem[] = [];
  const spec = (id: string) => view.specialties.find((s) => s.id === id && s.tier > 0);
  items.push({ key: "energy", label: live.fullIn > 0 ? "Energy full" : "Energy full", ready: live.fullIn === 0, until: Date.now() + live.fullIn, go: "tab:jobs" });
  items.push({ key: "daily", label: "Daily reward", ready: view.daily.canClaim, run: () => game.act({ type: "claim_daily" }) });
  items.push({ key: "food", label: "Eat", ready: live.full === 0, until: Date.now() + live.full, go: "tab:shop" });
  const medic = spec("combat_medic");
  if (medic) items.push({ key: "dressing", label: "Field dressing", ready: !!medic.ready, run: () => game.act({ type: "field_dressing" }) });
  if (view.threat.bodyguardUntil) items.push({ key: "guards", label: "Bodyguards", ready: false, until: view.threat.bodyguardUntil });
  if (view.threat.canLieLow && view.heatLabel !== "Clean") items.push({ key: "lowlie", label: "Lie low", ready: true, go: "tab:home" });
  const risky = view.dirty > 0 || view.stash.drugs.some((d) => d.onYou > 0);
  if (risky && view.stash.spot && !view.travel && !view.jail) items.push({ key: "stash", label: view.dirty > 0 ? `Hide $${view.dirty.toLocaleString()} dirty` : "Hide your product", ready: true, run: () => game.act({ type: "stash", op: "put_all" }) });
  const dog = view.dog.dog;
  if (dog && dog.state === "hungry" && !view.travel) items.push({ key: "dog", label: `Feed ${dog.name}`, ready: true, run: () => game.act({ type: "dog_feed" }) });
  if (live.hospital > 0) items.push({ key: "clinic", label: "Out of the clinic", ready: false, until: Date.now() + live.hospital });
  if (view.travel) items.push({ key: "travel", label: `Arrive in ${view.travel.city}`, ready: false, until: Date.now() + live.travel });
  const readyNow = items.filter((i) => i.ready);
  const later = items.filter((i) => !i.ready && i.until && i.until > Date.now());
  if (!readyNow.length && !later.length) return null;
  return (
    <div className="ready-strip" aria-label="What's ready">
      {readyNow.map((i) => (
        <button key={i.key} className="ready-chip on" onClick={() => (i.run ? i.run() : i.go && go(i.go))} disabled={game.busy}>
          <span className="dot" /> {i.label}
        </button>
      ))}
      {later.map((i) => (
        <span key={i.key} className="ready-chip">
          {i.label} <b>{fmt(i.until! - Date.now())}</b>
        </span>
      ))}
    </div>
  );
}

// ── After a hit: the body ───────────────────────────────────────────────────

/** The job is done. Now there's a body, and how you deal with it decides what the police find. */
export function DisposalCard({ game }: { game: GameApi }) {
  const d = game.view!.disposal;
  if (!d) return null;
  return (
    <section className="card disposal">
      <p className="eyebrow">The job is done</p>
      <h3 className="disposal-title">{d.targetName} is dead. What about the body?</h3>
      <p className="fine muted">Decide in {fmt(d.until - Date.now())}. What you choose decides what the police have to work with.</p>
      <div className="disposal-options">
        {d.options.map((o) => (
          <button key={o.id} className="enc-option" disabled={game.busy || !!o.block} onClick={() => game.social({ op: "dispose", choice: o.id })}>
            <b>{o.label}</b>
            <small>{o.block ?? o.hint}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
