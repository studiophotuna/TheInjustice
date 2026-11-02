"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  Briefcase,
  Building2,
  Cross,
  Flame,
  Heart,
  Home,
  Phone,
  Save,
  ShoppingBag,
  Star,
  Swords,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FightSummary } from "@/game/types";
import type { PublicView } from "@/game/view";
import { NpcPortrait, PATH_LOOKS, PlayerAvatar } from "./art/Portraits";
import { Skyline } from "./art/Skyline";
import { AuthForm, ChapterViewer, DeathScreen, Landing, Logo, Prologue } from "./screens";
import { CityTab, DeanLetter, FightTab, JobsTab, ProfileTab, ShopTab } from "./tabs";
import { fmt, useGame, type GameApi } from "./useGame";

type Tab = "jobs" | "fight" | "shop" | "profile" | "city";

const TABS: { id: Tab; label: string; Icon: typeof Briefcase }[] = [
  { id: "jobs", label: "Jobs", Icon: Briefcase },
  { id: "fight", label: "Fight", Icon: Swords },
  { id: "shop", label: "Shop", Icon: ShoppingBag },
  { id: "profile", label: "Me", Icon: UserRound },
  { id: "city", label: "City", Icon: Building2 },
];

export default function Game() {
  const game = useGame();
  const { view, loaded, fatal } = game;

  if (!loaded) return <Splash />;
  if (fatal && !view) {
    return (
      <div className="landing">
        <Skyline district="title" className="landing-bg" />
        <div className="landing-card glass">
          <Logo />
          <p>{fatal} Try again in a minute.</p>
          <button className="btn btn-primary btn-lg" onClick={() => game.refresh()}>Retry</button>
        </div>
      </div>
    );
  }
  if (!view) return <Landing game={game} />;
  if (!view.flags.includes("seen_prologue")) return <Prologue onDone={() => game.act({ type: "flag", flag: "seen_prologue" })} />;
  return (
    <>
      {view.dead ? <DeathScreen game={game} view={view} /> : <Shell game={game} view={view} />}
      <Toasts game={game} />
      <AnimatePresence>{game.fight && <FightScene fight={game.fight} view={view} onClose={game.closeFight} />}</AnimatePresence>
      <Floaters game={game} />
    </>
  );
}

function Splash() {
  return (
    <div className="splash">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
        <Logo small />
      </motion.div>
      <div className="loader" />
    </div>
  );
}

function Shell({ game, view }: { game: GameApi; view: PublicView }) {
  const [tab, setTab] = useState<Tab>("jobs");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [letterSeen, setLetterSeen] = useState<string | null>(null);
  const letterKey =
    view.application && view.application.status !== "pending" ? `${view.application.schoolName}:${view.application.status}` : null;
  const live = game.live!;

  // A newly unlocked chapter opens by itself once nothing else is on screen.
  useEffect(() => {
    if (view.unreadChapter && !game.fight && !view.offers.length) {
      const t = setTimeout(() => setReading((r) => r ?? view.unreadChapter), game.toasts.length ? 1200 : 300);
      return () => clearTimeout(t);
    }
  }, [view.unreadChapter, view.offers.length, game.fight, game.toasts.length]);

  const closeChapter = () => {
    const id = reading;
    setReading(null);
    if (id && view.chapters.find((c) => c.id === id && !c.read)) game.act({ type: "flag", flag: `read:${id}` });
  };

  const go = useCallback((target: string) => {
    const [kind, id] = target.split(":");
    if (kind === "tab") {
      setTab(id as Tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (kind === "story") setReading(id);
    if (kind === "job") {
      setTab("jobs");
      setHighlight(id);
      setTimeout(() => document.getElementById(`job-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      setTimeout(() => setHighlight(null), 3500);
    }
  }, []);

  // Toast buttons and notification deep links (/?go=job:cans).
  useEffect(() => {
    const onGo = (e: Event) => go((e as CustomEvent<string>).detail);
    window.addEventListener("injustice:go", onGo);
    const target = new URLSearchParams(window.location.search).get("go");
    if (target) {
      go(target);
      window.history.replaceState(null, "", "/");
    }
    return () => window.removeEventListener("injustice:go", onGo);
  }, [go]);

  const offer = view.offers[0];

  return (
    <div className="shell">
      <nav className="sidenav glass" aria-label="Main">
        <Logo small />
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => go(`tab:${id}`)}>
            <Icon size={20} /> <span>{label}</span>
            {tab === id && <motion.span layoutId="nav-pill" className="nav-pill" />}
          </button>
        ))}
      </nav>

      <div className="main">
        <Hud view={view} live={live} />

        {!game.account && (
          <button className="save-banner" onClick={() => setSaveOpen(true)}>
            <Save size={16} /> <span>Playing as a guest. <b>Save your character</b> to keep it on any device.</span>
          </button>
        )}

        {live.hospital > 0 && (
          <div className="banner banner-red">
            <Cross size={18} /> <span>In the free clinic for <b>{fmt(live.hospital)}</b></span>
            {view.inventory.some((i) => i.id === "medkit") && (
              <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "use", itemId: "medkit" })}>Use medkit</button>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.main key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            {tab === "jobs" && <JobsTab game={game} highlight={highlight} />}
            {tab === "fight" && <FightTab game={game} />}
            {tab === "shop" && <ShopTab game={game} />}
            {tab === "profile" && <ProfileTab game={game} />}
            {tab === "city" && <CityTab game={game} onRead={setReading} />}
          </motion.main>
        </AnimatePresence>
      </div>

      <nav className="bottomnav glass" aria-label="Main">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => go(`tab:${id}`)}>
            {tab === id && <motion.span layoutId="bottom-pill" className="bottom-pill" />}
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>{reading && <ChapterViewer key={reading} id={reading} onDone={closeChapter} />}</AnimatePresence>

      <AnimatePresence>
        {offer && (
          <Modal key="offer">
            <div className="offer" style={{ ["--path" as string]: PATH_LOOKS[offer.id]?.rim }}>
              <div className="offer-head">
                <NpcPortrait id={offer.contactId} className="offer-portrait" />
                <div>
                  <p className="eyebrow"><Phone size={14} /> Incoming</p>
                  <h2>{offer.contact}</h2>
                  <span className="path-badge">{offer.side === "law" ? "Law" : "Street"} · {offer.name}</span>
                </div>
              </div>
              <p className="offer-blurb">{offer.blurb}</p>
              {offer.lines.map((l, i) => (
                <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.35 }}>{l}</motion.p>
              ))}
              <p className="fine">Choosing a path closes the others for now.</p>
              <div className="row">
                <button className="btn btn-primary btn-lg" disabled={game.busy} onClick={() => game.act({ type: "offer", path: offer.id, accept: true }).then(() => go("tab:jobs"))}>Accept</button>
                <button className="btn btn-ghost btn-lg" disabled={game.busy} onClick={() => game.act({ type: "offer", path: offer.id, accept: false })}>Turn it down</button>
              </div>
            </div>
          </Modal>
        )}
        {letterKey && letterSeen !== letterKey && !offer && !reading && !game.fight && (
          <Modal key="letter" onClose={() => setLetterSeen(letterKey)}>
            <DeanLetter game={game} onClose={() => setLetterSeen(letterKey)} />
          </Modal>
        )}
        {saveOpen && !game.account && (
          <Modal key="save" onClose={() => setSaveOpen(false)}>
            <h2>Save your character</h2>
            <p className="muted">Create an account and {view.name} comes with you to any device.</p>
            <AuthForm
              game={game}
              onDone={(claimed) => {
                setSaveOpen(false);
                game.pushToasts([{ tone: "good", text: claimed ? `${view.name} is saved to your account.` : "Logged in. Your saved character is loaded." }]);
              }}
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Hud({ view, live }: { view: PublicView; live: NonNullable<GameApi["live"]> }) {
  const heatTone = { Clean: "ok", Noticed: "warn", Wanted: "hot", "Most wanted": "hot" }[view.heatLabel];
  return (
    <header className="hud glass">
      <div className="hud-id">
        <PlayerAvatar name={view.name} path={view.path?.id} className="avatar-sm" />
        <div>
          <div className="hud-name">{view.name}</div>
          <div className="hud-title">{view.path ? `${view.path.rank} · ${view.path.name}` : "Bum · The Gutter"}</div>
        </div>
        <div className="hud-money">
          <Counter value={view.cash} className="cash" prefix="$" />
          <span className="bank"><Home size={11} /> bank ${view.bank.toLocaleString()}</span>
        </div>
      </div>
      <div className="hud-bars">
        <Bar icon={<Zap size={14} />} label="Energy" value={live.energy} max={view.maxEnergy} tone="cyan"
          note={live.energy >= view.maxEnergy ? "Full" : `+1 in ${fmt(live.nextIn)} · full in ${fmt(live.fullIn)}`} />
        <Bar icon={<Heart size={14} />} label="Health" value={live.hospital > 0 ? 0 : view.hp} max={view.maxHp} tone="red"
          note={live.hospital > 0 ? `Clinic ${fmt(live.hospital)}` : view.hp >= view.maxHp ? "Healthy" : "Recovering"} />
      </div>
      <div className="hud-chips">
        <span className={`chip heat-${heatTone}`}><Flame size={12} /> {view.heatLabel}</span>
        <span className="chip"><Star size={12} /> Rep {view.reputation}</span>
        <span className="chip"><Home size={12} /> {view.housing}</span>
      </div>
    </header>
  );
}

function Bar({ icon, label, value, max, tone, note }: { icon: React.ReactNode; label: string; value: number; max: number; tone: string; note?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar bar-${tone}`}>
      <div className="bar-label">
        <span>{icon} {label}</span>
        <span><b>{value}</b>/{max}</span>
      </div>
      <div className="bar-track">
        <motion.div className="bar-fill" animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
      {note && <div className="bar-note">{note}</div>}
    </div>
  );
}

/** Animated number that rolls to its new value. */
function Counter({ value, prefix = "", className }: { value: number; prefix?: string; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v).toLocaleString()}`);
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: "easeOut" });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className={className}>{text}</motion.span>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal glass"
        role="dialog"
        aria-modal="true"
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && <button className="modal-x" aria-label="Close" onClick={onClose}><X size={18} /></button>}
        {children}
      </motion.div>
    </motion.div>
  );
}

const OUTCOME = {
  win: { word: "WIN!", cls: "win" },
  loss: { word: "BEATEN", cls: "loss" },
  ko: { word: "K.O.", cls: "loss" },
  death: { word: "LIGHTS OUT", cls: "death" },
} as const;

/** Plays the fight: both fighters face off, the blow-by-blow lines appear, then the result bursts in. */
function FightScene({ fight, view, onClose }: { fight: FightSummary; view: PublicView; onClose: () => void }) {
  const [shown, setShown] = useState(0);
  const lines = fight.lines.slice(0, 7);
  const done = shown >= lines.length;
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown((s) => s + 1), 320);
    return () => clearTimeout(t);
  }, [shown, done]);
  const o = OUTCOME[fight.outcome];
  const npcId = fight.opponent === "Mugger" ? "mugger" : view.fights.find((f) => f.name === fight.opponent)?.id ?? "mugger";

  return (
    <motion.div className="fight-scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={done ? onClose : undefined}>
      <div className="fight-stage">
        <motion.div initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
          <PlayerAvatar name={view.name} path={view.path?.id} className="avatar-fight" />
          <p>{view.name}</p>
        </motion.div>
        <motion.span className="vs" initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25 }}>VS</motion.span>
        <motion.div initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
          <NpcPortrait id={npcId} className="avatar-fight" />
          <p>{fight.opponent}</p>
        </motion.div>
      </div>
      <ul className="fight-lines">
        {lines.slice(0, shown).map((l, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>{l}</motion.li>
        ))}
      </ul>
      <AnimatePresence>
        {done && (
          <motion.div className={`fight-result ${o.cls}`} initial={{ scale: 0.3, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: -4, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
            {o.word}
          </motion.div>
        )}
      </AnimatePresence>
      {done && <button className="btn btn-ghost" onClick={onClose}>Continue</button>}
    </motion.div>
  );
}

function Toasts({ game }: { game: GameApi }) {
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {game.toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`toast toast-${t.tone}`}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <span>{t.text}</span>
            {t.action && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("injustice:go", { detail: t.action!.target }));
                  game.dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button className="toast-x" aria-label="Dismiss" onClick={() => game.dismiss(t.id)}><X size={16} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Floaters({ game }: { game: GameApi }) {
  return (
    <div className="floaters" aria-hidden>
      <AnimatePresence>
        {game.floaters.map((f) => (
          <motion.span
            key={f.id}
            className={`floater ${f.tone}`}
            style={{ left: f.x, top: f.y }}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -70, scale: 1.15 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          >
            {f.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
