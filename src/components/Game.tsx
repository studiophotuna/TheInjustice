"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PROLOGUE } from "@/game/content/story";
import type { GameEvent } from "@/game/types";
import type { JobView, PublicView } from "@/game/view";
import { ComicPanel } from "./Comic";

type Tab = "jobs" | "fight" | "shop" | "profile" | "city";
type Leader = { name: string; reputation: number; title: string };
type Toast = GameEvent & { id: number };

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "jobs", label: "Jobs", icon: "💼" },
  { id: "fight", label: "Fight", icon: "👊" },
  { id: "shop", label: "Shop", icon: "🛒" },
  { id: "profile", label: "Me", icon: "🪪" },
  { id: "city", label: "City", icon: "🏙️" },
];

function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, "0")}`;
}

async function notify(title: string, body: string, url: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!document.hidden) return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "/icon.svg", data: { url }, tag: title });
    else new Notification(title, { body, icon: "/icon.svg" });
  } catch {
    /* notifications are best-effort */
  }
}

export default function Game() {
  const [view, setView] = useState<PublicView | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("jobs");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clock, setClock] = useState(0);
  const toastId = useRef(0);

  const pushToasts = useCallback((events: GameEvent[]) => {
    const fresh = events.map((e) => ({ ...e, id: ++toastId.current }));
    // Keep at most 3 on screen; ones with a call to action stay until tapped.
    setToasts((t) => [...t, ...fresh].slice(-3));
    for (const f of fresh) {
      if (!f.action) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== f.id)), 4500);
    }
  }, []);

  const accept = useCallback((v: PublicView | null) => {
    setView(v);
    setReceivedAt(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/game", { cache: "no-store" });
    const data = await res.json();
    accept(data.view);
    setLeaders(data.leaderboard ?? []);
    setLoaded(true);
    return data.view as PublicView | null;
  }, [accept]);

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      if (busy) return null;
      setBusy(true);
      try {
        const res = await fetch("/api/game", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          pushToasts([{ tone: "bad", text: data.error ?? "Something went wrong." }]);
          return null;
        }
        accept(data.view);
        if (data.events?.length) pushToasts(data.events);
        return data.view as PublicView;
      } finally {
        setBusy(false);
      }
    },
    [busy, accept, pushToasts],
  );

  useEffect(() => {
    refresh();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, [refresh]);

  // 1-second clock for countdowns.
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.max(0, clock - receivedAt);

  const live = useMemo(() => {
    if (!view) return null;
    let energy = view.energy;
    if (view.nextEnergyMs > 0 && elapsed >= view.nextEnergyMs) {
      energy += 1 + Math.floor((elapsed - view.nextEnergyMs) / view.energyRegenMs);
    }
    energy = Math.min(view.maxEnergy, energy);
    const sinceTick = elapsed - view.nextEnergyMs;
    const nextIn =
      energy >= view.maxEnergy
        ? 0
        : sinceTick < 0
          ? view.nextEnergyMs - elapsed
          : view.energyRegenMs - (sinceTick % view.energyRegenMs);
    return {
      energy,
      nextIn,
      fullIn: Math.max(0, view.energyFullMs - elapsed),
      hospital: Math.max(0, view.hospitalMs - elapsed),
      full: Math.max(0, view.fullMs - elapsed),
    };
  }, [view, elapsed]);

  // Timer pop-ups: when something finishes, refresh and offer a one-tap next step.
  const fired = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!view || !live) return;
    const fire = async (key: string, run: () => void) => {
      if (fired.current[key] === receivedAt) return;
      fired.current[key] = receivedAt;
      run();
    };
    if (view.energyFullMs > 0 && live.fullIn === 0) {
      fire("energy", async () => {
        const v = await refresh();
        const job = v?.jobs.find((j) => j.id === v.recommendedJobId);
        const times = job ? Math.floor(v!.energy / job.energy) : 0;
        const text = job ? `⚡ Energy full! Best job now: ${job.name} (${times}× in a row).` : "⚡ Energy full!";
        pushToasts([{ tone: "good", text, action: job ? { label: "Go to job →", target: `job:${job.id}` } : undefined }]);
        notify("Energy full", text, job ? `/?go=job:${job.id}` : "/");
      });
    }
    if (view.hospitalMs > 0 && live.hospital === 0) {
      fire("hospital", async () => {
        await refresh();
        const text = "🏥 You're out of the hospital. Back to the streets.";
        pushToasts([{ tone: "good", text, action: { label: "Find work →", target: "tab:jobs" } }]);
        notify("Discharged", text, "/?go=tab:jobs");
      });
    }
  }, [view, live, receivedAt, refresh, pushToasts]);

  const go = useCallback((target: string) => {
    const [kind, id] = target.split(":");
    if (kind === "tab") {
      setTab(id as Tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (kind === "job") {
      setTab("jobs");
      setHighlight(id);
      setTimeout(() => document.getElementById(`job-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      setTimeout(() => setHighlight(null), 4000);
    }
  }, []);

  const answerOffer = useCallback(
    async (path: string, accept: boolean) => {
      const v = await act({ type: "offer", path, accept });
      if (v) {
        setToasts((t) => t.filter((x) => !x.action?.target.startsWith("offer:")));
        if (accept) window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [act],
  );

  // Deep links from notifications (/?go=job:cans).
  useEffect(() => {
    if (!view) return;
    const target = new URLSearchParams(window.location.search).get("go");
    if (target) {
      go(target);
      window.history.replaceState(null, "", "/");
    }
  }, [view, go]);

  if (!loaded) return <div className="loading">Loading Grayhaven…</div>;
  if (!view) return <CreateCharacter onCreate={(name) => act({ type: "create", name })} busy={busy} />;
  if (!view.flags.includes("seen_prologue")) {
    return <Prologue onDone={() => act({ type: "flag", flag: "seen_prologue" })} />;
  }

  const L = live!;
  const offer = view.offers[0];

  return (
    <div className="app">
      <header className="hud">
        <div className="hud-top">
          <div>
            <div className="hud-name">{view.name}</div>
            <div className="hud-title">{view.path ? `${view.path.rank} · ${view.path.name}` : "Bum · The Gutter"}</div>
          </div>
          <div className="hud-money">
            <span className="cash">${view.cash.toLocaleString()}</span>
            <span className="bank">🏦 ${view.bank.toLocaleString()}</span>
          </div>
        </div>
        <Meter
          label="⚡ Energy"
          value={L.energy}
          max={view.maxEnergy}
          kind="energy"
          note={L.energy >= view.maxEnergy ? "Full" : `+1 in ${fmt(L.nextIn)} · full in ${fmt(L.fullIn)}`}
        />
        <Meter label="❤️ Health" value={L.hospital > 0 ? 0 : view.hp} max={view.maxHp} kind="hp" />
        <div className="hud-chips">
          <span className={`chip heat-${view.heatLabel.replace(" ", "-").toLowerCase()}`}>🚨 {view.heatLabel}</span>
          <span className="chip">⭐ Rep {view.reputation}</span>
          <span className="chip">🏠 {view.housing}</span>
        </div>
      </header>

      {L.hospital > 0 && (
        <div className="banner bad">
          🏥 In the free clinic for {fmt(L.hospital)}.
          {view.inventory.some((i) => i.id === "medkit") && (
            <button className="btn small" disabled={busy} onClick={() => act({ type: "use", itemId: "medkit" })}>
              Use medkit
            </button>
          )}
        </div>
      )}

      {offer && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="offer-title">
          <div className="offer panel">
            <h3 id="offer-title">📞 {offer.contact}</h3>
            {offer.lines.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            <p className="tagline">Choosing a path closes the others for now.</p>
            <div className="row">
              <button className="btn primary" disabled={busy} onClick={() => answerOffer(offer.id, true)}>
                Accept
              </button>
              <button className="btn" disabled={busy} onClick={() => answerOffer(offer.id, false)}>
                Turn it down
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        {tab === "jobs" && (
          <JobsTab view={view} energy={L.energy} busy={busy || L.hospital > 0} highlight={highlight} onWork={(id) => act({ type: "job", jobId: id })} />
        )}
        {tab === "fight" && (
          <FightTab view={view} energy={L.energy} busy={busy || L.hospital > 0} onFight={(id) => act({ type: "fight", npcId: id })} />
        )}
        {tab === "shop" && <ShopTab view={view} busy={busy} onBuy={(id) => act({ type: "buy", itemId: id })} />}
        {tab === "profile" && <ProfileTab view={view} busy={busy} fullIn={L.full} act={act} />}
        {tab === "city" && <CityTab view={view} leaders={leaders} />}
      </main>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <span>{t.text}</span>
            <div className="toast-actions">
              {t.action && (
                <button
                  className="btn small primary"
                  onClick={() => {
                    go(t.action!.target);
                    setToasts((x) => x.filter((y) => y.id !== t.id));
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button className="x" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Meter({ label, value, max, kind, note }: { label: string; value: number; max: number; kind: string; note?: string }) {
  return (
    <div className="meter">
      <div className="meter-label">
        <span>{label}</span>
        <span>
          {value}/{max}
          {note ? <em> · {note}</em> : null}
        </span>
      </div>
      <div className={`meter-bar ${kind}`}>
        <div style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
      </div>
    </div>
  );
}

function JobsTab({
  view,
  energy,
  busy,
  highlight,
  onWork,
}: {
  view: PublicView;
  energy: number;
  busy: boolean;
  highlight: string | null;
  onWork: (id: string) => void;
}) {
  return (
    <div className="stack">
      {[...view.districts]
        .sort((a, b) => Number(view.jobs.some((j) => j.pathJob && j.district === b.id)) - Number(view.jobs.some((j) => j.pathJob && j.district === a.id)))
        .map((d) => {
        const jobs = view.jobs.filter((j) => j.district === d.id);
        if (!jobs.length) return null;
        const pathJobs = jobs.filter((j) => j.pathJob);
        const streetJobs = jobs.filter((j) => !j.pathJob);
        return (
          <section key={d.id} className={`district panel ${d.locked ? "locked" : ""}`}>
            <h2>{d.name}</h2>
            <p className="tagline">{d.locked ? `🔒 ${d.locked}` : d.tagline}</p>
            {!d.locked || pathJobs.length ? (
              <div className="cards">
                {[...pathJobs, ...(d.locked ? [] : streetJobs)].map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    energy={energy}
                    busy={busy}
                    recommended={j.id === view.recommendedJobId}
                    highlight={j.id === highlight}
                    onWork={onWork}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function JobCard({
  job,
  energy,
  busy,
  recommended,
  highlight,
  onWork,
}: {
  job: JobView;
  energy: number;
  busy: boolean;
  recommended: boolean;
  highlight: boolean;
  onWork: (id: string) => void;
}) {
  const tired = energy < job.energy;
  return (
    <div id={`job-${job.id}`} className={`card ${highlight ? "flash" : ""} ${job.pathJob ? "path" : ""}`}>
      <div className="card-head">
        <strong>{job.name}</strong>
        {recommended && <span className="badge good">Best now</span>}
      </div>
      <div className="card-tags">
        <span className="tag">{job.tag}</span>
        {job.risky && <span className="tag warn">Risky</span>}
        {job.crime && <span className="tag bad">Shady</span>}
      </div>
      <div className="card-foot">
        <span>
          ⚡{job.energy} · 💵 ${job.pay[0]}–{job.pay[1]}
        </span>
        <button className="btn primary small" disabled={busy || tired || !!job.locked} onClick={() => onWork(job.id)}>
          {job.locked ? "Locked" : tired ? "Tired" : "Work"}
        </button>
      </div>
      {job.locked && <p className="lock">🔒 {job.locked}</p>}
    </div>
  );
}

function FightTab({ view, energy, busy, onFight }: { view: PublicView; energy: number; busy: boolean; onFight: (id: string) => void }) {
  return (
    <div className="stack">
      <p className="hint panel">
        You never see the numbers. Trust your gut, and your gut gets sharper the more you notice things. Fights cost ⚡
        {view.fightEnergy}.
      </p>
      {view.fights.map((n) => (
        <div key={n.id} className={`card wide ${n.locked ? "locked" : ""}`}>
          <div className="card-head">
            <strong>
              {n.icon} {n.name}
            </strong>
          </div>
          <p>{n.description}</p>
          <p className="gut">
            Your gut says: <b>{n.read}</b>
          </p>
          <div className="card-foot">
            <span>{n.locked ? `🔒 ${n.locked}` : ""}</span>
            <button
              className="btn danger small"
              disabled={busy || !!n.locked || energy < view.fightEnergy || view.hp < 20}
              onClick={() => onFight(n.id)}
            >
              {view.hp < 20 ? "Too hurt" : "Fight"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShopTab({ view, busy, onBuy }: { view: PublicView; busy: boolean; onBuy: (id: string) => void }) {
  return (
    <div className="stack">
      {view.shop.map((i) => (
        <div key={i.id} className="card wide">
          <div className="card-head">
            <strong>
              {i.icon} {i.name}
            </strong>
            <span className="price">${i.price}</span>
          </div>
          <p>{i.description}</p>
          <div className="card-foot">
            <span className="tag">{i.kind}</span>
            <button className="btn primary small" disabled={busy || i.owned || view.cash < i.price} onClick={() => onBuy(i.id)}>
              {i.owned ? "Owned" : "Buy"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileTab({
  view,
  busy,
  fullIn,
  act,
}: {
  view: PublicView;
  busy: boolean;
  fullIn: number;
  act: (b: Record<string, unknown>) => Promise<PublicView | null>;
}) {
  const [amount, setAmount] = useState("");
  const [perm, setPerm] = useState<string>(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  return (
    <div className="stack">
      <section className="panel">
        <h2>How you feel</h2>
        <dl className="feel">
          <dt>Body</dt>
          <dd>{view.feel.body}</dd>
          <dt>Reflexes</dt>
          <dd>{view.feel.reflexes}</dd>
          <dt>Street smarts</dt>
          <dd>{view.feel.smarts}</dd>
          <dt>Presence</dt>
          <dd>{view.feel.presence}</dd>
        </dl>
        <p className="tagline">“{view.feel.conscience}”</p>
      </section>

      {view.path && (
        <section className="panel">
          <h2>
            {view.path.side === "law" ? "⚖️" : "🃏"} {view.path.rank}
          </h2>
          <p>
            {view.path.name} path · answers to {view.path.contact}
          </p>
          {view.path.promotion && <p className="tagline">{view.path.promotion}</p>}
        </section>
      )}

      <section className="panel">
        <h2>🩺 Doc Mercy</h2>
        <p>{view.assessment.reason}</p>
        <button className="btn" disabled={busy || !view.assessment.available} onClick={() => act({ type: "assess" })}>
          Get checked
        </button>
      </section>

      <section className="panel">
        <h2>🏦 Old Market Credit Union</h2>
        {view.hasBankAccount ? (
          <>
            <p>Money in the bank can't be stolen.</p>
            <div className="row">
              <input
                inputMode="numeric"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              />
              <button className="btn primary small" disabled={busy} onClick={() => act({ type: "bank", op: "deposit", amount: Number(amount || view.cash) }).then(() => setAmount(""))}>
                Deposit
              </button>
              <button className="btn small" disabled={busy} onClick={() => act({ type: "bank", op: "withdraw", amount: Number(amount || 0) }).then(() => setAmount(""))}>
                Withdraw
              </button>
            </div>
            <p className="tagline">Leave the amount empty to deposit all your cash.</p>
          </>
        ) : (
          <>
            <p>Muggers can't steal what's in the bank. Opening an account costs $20.</p>
            <button className="btn primary" disabled={busy || view.cash < 20} onClick={() => act({ type: "bank", op: "open" })}>
              Open account
            </button>
          </>
        )}
      </section>

      <section className="panel">
        <h2>🎒 Pockets</h2>
        {view.inventory.length === 0 && <p>Empty. Like your stomach.</p>}
        {view.inventory.map((i) => (
          <div key={i.id} className="row between">
            <span>
              {i.icon} {i.name} ×{i.count}
            </span>
            {i.usable && (
              <button className="btn small" disabled={busy} onClick={() => act({ type: "use", itemId: i.id })}>
                Use
              </button>
            )}
          </div>
        ))}
        {fullIn > 0 && <p className="tagline">🍽️ Still full for {fmt(fullIn)}.</p>}
      </section>

      <section className="panel">
        <h2>🔔 Alerts</h2>
        <p>Get a notification when your energy is full or you're out of the hospital, even when the game is in the background.</p>
        {perm === "granted" ? (
          <p>✅ Alerts are on.</p>
        ) : perm === "unsupported" ? (
          <p>This browser doesn't support alerts. On iPhone, add the game to your Home Screen first.</p>
        ) : (
          <button className="btn" onClick={() => Notification.requestPermission().then(setPerm)}>
            Turn on alerts
          </button>
        )}
      </section>
    </div>
  );
}

function CityTab({ view, leaders }: { view: PublicView; leaders: Leader[] }) {
  return (
    <div className="stack">
      <section className="panel">
        <h2>🏆 Most respected in Grayhaven</h2>
        <ol className="leaders">
          {leaders.map((l, i) => (
            <li key={i} className={l.name === view.name ? "me" : ""}>
              <span>
                {l.name} <em>{l.title}</em>
              </span>
              <b>⭐ {l.reputation}</b>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel">
        <h2>📰 What happened</h2>
        <ul className="log">
          {view.log.map((e, i) => (
            <li key={i} className={e.tone}>
              {e.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CreateCharacter({ onCreate, busy }: { onCreate: (name: string) => void; busy: boolean }) {
  const [name, setName] = useState("");
  return (
    <div className="splash">
      <h1 className="logo">
        INJUSTICE<span>Grayhaven</span>
      </h1>
      <p>Framed. Jailed. Released with nothing. What's your name on the street?</p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(name);
        }}
      >
        <input autoFocus maxLength={20} placeholder="Street name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary" disabled={busy || name.trim().length < 2}>
          Start
        </button>
      </form>
    </div>
  );
}

function Prologue({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === PROLOGUE.panels.length - 1;
  return (
    <div className="splash">
      <h2 className="chapter">{PROLOGUE.title}</h2>
      <ComicPanel panel={PROLOGUE.panels[i]} />
      <div className="row">
        {i > 0 && (
          <button className="btn" onClick={() => setI(i - 1)}>
            Back
          </button>
        )}
        <button className="btn primary" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? "Hit the streets" : "Next"}
        </button>
      </div>
      <p className="dots">{PROLOGUE.panels.map((_, k) => (k === i ? "●" : "○")).join(" ")}</p>
    </div>
  );
}
