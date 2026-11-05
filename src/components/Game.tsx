"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  House,
  Map as MapIcon,
  Users,
  KeyRound,
  Copy,
  MapPin,
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
  ShieldCheck,
  Search,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FightSummary } from "@/game/types";
import type { PublicView } from "@/game/view";
import { NpcPortrait, PATH_LOOKS, PlayerAvatar } from "./art/Portraits";
import { Skyline } from "./art/Skyline";
import { Vehicle } from "./art/Vehicles";
import { AuthForm, ChapterViewer, DeathScreen, Landing, Logo, Prologue } from "./screens";
import { DeanLetter, FightTab, JobsTab, ProfileTab, ShopTab } from "./tabs";
import { CityPlaces, type Building } from "./places";
import { CommunityTab } from "./community";
import { HomeTab } from "./home";
import { AwayRecap, GuestChip, LiveRail, setPeopleSection } from "./pulse";
import { QuickBar } from "./quickbar";
import { useScrollLock } from "./scrollLock";
import { CommandPalette } from "./palette";
import { EncounterDock, openEncounter } from "./encounter";
import { play, preloadSounds, setSound, soundOn } from "./sfx";
import { fmt, useGame, type GameApi } from "./useGame";

type Tab = "home" | "jobs" | "fight" | "shop" | "people" | "city" | "profile";

const TABS: { id: Tab; label: string; Icon: typeof Briefcase }[] = [
  { id: "home", label: "Home", Icon: House },
  { id: "jobs", label: "Jobs", Icon: Briefcase },
  { id: "fight", label: "Fight", Icon: Swords },
  { id: "shop", label: "Shop", Icon: ShoppingBag },
  { id: "people", label: "People", Icon: Users },
  { id: "city", label: "City", Icon: MapIcon },
];
/** The desktop sidebar also lists your profile; on phones it opens from the avatar. */
const SIDE_TABS = [...TABS, { id: "profile" as Tab, label: "Me", Icon: UserRound }];

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
      <AnimatePresence>{game.recoveryCode && <RecoveryCodeModal game={game} />}</AnimatePresence>
      <AnimatePresence>{game.fight && <FightScene fight={game.fight} view={view} onClose={game.closeFight} />}</AnimatePresence>
      <Floaters game={game} />
    </>
  );
}

/** Shown once after sign-up or a reset: the only way to recover the account. */
function RecoveryCodeModal({ game }: { game: GameApi }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal>
      <p className="eyebrow"><KeyRound size={14} /> Save this somewhere safe</p>
      <h2>Your recovery code</h2>
      <p className="muted">If you forget your password, this code is the only way back into your account. It is shown once.</p>
      <div className="recovery-code">{game.recoveryCode}</div>
      <div className="row">
        <button
          className="btn btn-ghost"
          onClick={() => {
            navigator.clipboard?.writeText(game.recoveryCode ?? "").then(() => setCopied(true), () => undefined);
          }}
        >
          <Copy size={14} /> {copied ? "Copied" : "Copy"}
        </button>
        <button className="btn btn-primary" onClick={game.clearRecoveryCode}>I saved it</button>
      </div>
    </Modal>
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
  const [tab, setTab] = useState<Tab>("home");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [place, setPlace] = useState<Building | null>(null);
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
    if (kind === "encounter") openEncounter();
    // "people:crew" opens People on a section (people, chat, crew, inbox).
    if (kind === "people") {
      setTab("people");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setPeopleSection(id);
      setTimeout(() => window.dispatchEvent(new CustomEvent("conspira:section", { detail: id })), 60);
    }
    // "place:police" opens a building in the City tab; old "tab:map" links land on the City.
    if (kind === "place") {
      setTab("city");
      setPlace(id as Building);
    }
    if (kind === "tab" && (id === "map" || id === "city")) {
      setTab("city");
      setPlace(null);
    }
    if (kind === "job") {
      setTab("jobs");
      setHighlight(id);
      setTimeout(() => document.getElementById(`job-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      setTimeout(() => setHighlight(null), 3500);
    }
  }, []);

  // Sounds load on the first tap (browsers only allow audio after one).
  useEffect(() => {
    window.addEventListener("pointerdown", preloadSounds, { once: true });
    return () => window.removeEventListener("pointerdown", preloadSounds);
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
  const [arrivalFightDone, setArrivalFightDone] = useState<number | null>(null);
  const arrival = view.arrival;
  const arrivalFight = arrival?.incident?.fight && arrivalFightDone !== arrival.at ? arrival.incident.fight : null;

  return (
    <div className="shell">
      <nav className="sidenav glass" aria-label="Main">
        <Logo small />
        {SIDE_TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => go(`tab:${id}`)}>
            <Icon size={20} /> <span>{label}</span>
            {id === "people" && view.inbox.unread + view.sightings.length > 0 && <span className="badge-dot">{view.inbox.unread + view.sightings.length}</span>}
            {tab === id && <motion.span layoutId="nav-pill" className="nav-pill" />}
          </button>
        ))}
      </nav>

      <div className="main">
        <Hud view={view} live={live} onProfile={() => go("tab:profile")} onSearch={() => setPaletteOpen(true)} />

        <GuestChip game={game} onSave={() => setSaveOpen(true)} />

        {view.travel && (
          <div className="travel-banner">
            <div className="travel-top">
              <span>On the {view.travel.mode === "plane" ? "plane" : view.travel.mode} to <b>{view.travel.city}</b></span>
              <b>{fmt(live.travel)}</b>
            </div>
            <div className="travel-track">
              <div className="travel-road" />
              <div className="travel-vehicle" style={{ left: `${Math.min(100, 100 - (live.travel / view.travel.totalMs) * 100)}%` }}>
                <Vehicle mode={view.travel.mode} />
              </div>
            </div>
          </div>
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
            {tab === "home" && <HomeTab game={game} go={go} onRead={setReading} />}
            {tab === "jobs" && <JobsTab game={game} highlight={highlight} />}
            {tab === "fight" && <FightTab game={game} />}
            {tab === "shop" && <ShopTab game={game} />}
            {tab === "people" && <CommunityTab game={game} />}
            {tab === "people" && <Visited game={game} flag="visited:people" />}
            {tab === "city" && <Visited game={game} flag="visited:map" />}
            {tab === "profile" && <ProfileTab game={game} />}
            {tab === "city" && <CityPlaces game={game} place={place} setPlace={setPlace} onRead={setReading} />}
          </motion.main>
        </AnimatePresence>
      </div>

      <aside className="rail" aria-label="What's happening">
        <LiveRail game={game} go={go} onRead={setReading} />
      </aside>

      <EncounterDock game={game} />
      <QuickBar game={game} />
      <CommandPalette game={game} go={go} open={paletteOpen} setOpen={setPaletteOpen} />

      <AwayRecap game={game} />

      <nav className="bottomnav glass" aria-label="Main">
        {SIDE_TABS.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => go(`tab:${id}`)}>
            {tab === id && <motion.span layoutId="bottom-pill" className="bottom-pill" />}
            <Icon size={22} />
            <span>{label}</span>
            {id === "people" && view.inbox.unread + view.sightings.length > 0 && <span className="badge-dot nav-dot">{view.inbox.unread + view.sightings.length}</span>}
          </button>
        ))}
      </nav>

      <AnimatePresence>{reading && <ChapterViewer key={reading} id={reading} onDone={closeChapter} />}</AnimatePresence>
      <AnimatePresence>
        {arrivalFight && arrival && (
          <FightScene fight={arrivalFight} view={view} onClose={() => setArrivalFightDone(arrival.at)} />
        )}
      </AnimatePresence>

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
        {arrival && !arrivalFight && !offer && !reading && !game.fight && (
          <Modal key="arrival" onClose={() => game.act({ type: "ack_arrival" })}>
            <ArrivalCard view={view} onDone={() => game.act({ type: "ack_arrival" })} />
          </Modal>
        )}
        {letterKey && letterSeen !== letterKey && !offer && !reading && !game.fight && !arrival && (
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

/** The game HUD: who you are, and every resource in its own colour, always in the same place. */
function Hud({ view, live, onProfile, onSearch }: { view: PublicView; live: NonNullable<GameApi["live"]>; onProfile: () => void; onSearch: () => void }) {
  const heatTone = { Clean: "ok", Noticed: "warn", Wanted: "hot", "Most wanted": "hot" }[view.heatLabel];
  const ladder = view.ladder;
  const progress = ladder ? Math.round((ladder.current / ladder.ranks.length) * 100) : 0;
  const hurt = live.hospital > 0;
  // Scrolling down, the HUD tucks away its details so the screen is for the game.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    // Two thresholds, so it doesn't flicker when you stop near one.
    const on = () => setCompact((c) => (c ? window.scrollY > 40 : window.scrollY > 140));
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // The HUD floats over the page; a spacer of its full height holds its place, so shrinking it
  // never moves what's under your finger.
  const ref = useRef<HTMLElement>(null);
  const [full, setFull] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (!el.classList.contains("compact")) setFull(el.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
    <div className="hud-spacer" style={{ height: full }} aria-hidden />
    <header ref={ref} className={`hud${compact ? " compact" : ""}`}>
      <div className="hud-top">
        <button className="hud-avatar" onClick={onProfile} aria-label="Open your profile" style={{ ["--p" as string]: `${progress}%`, ["--rim" as string]: view.path ? PATH_LOOKS[view.path.id]?.rim : "#8d96a8" }}>
          <PlayerAvatar name={view.name} path={view.path?.id} photo={view.profile.photo} className="avatar-sm" />
          {ladder && <span className="hud-rank">{ladder.current}</span>}
        </button>
        <div className="hud-who">
          <b className="hud-name">{view.name}</b>
          <span className="hud-title">{view.path ? `${view.path.rank} · ${view.path.name}` : `Nobody · ${view.location.city}`}</span>
        </div>
        <button className="hud-search" onClick={onSearch} aria-label="Search and do anything (Ctrl+K)" title="Do anything (Ctrl+K)">
          <Search size={18} />
        </button>
        <SoundToggle />
        <div className="hud-cash">
          <Delta value={view.cash} prefix="$" />
          <Counter value={view.cash} className="cash" prefix="$" />
          <span className="hud-sub">
            <span title="In the bank">🏦 ${view.bank.toLocaleString()}</span>
            {view.dirty > 0 && <span className="dirty" title="Dirty money: launder it before the bank or shops will take it">💵 ${view.dirty.toLocaleString()}</span>}
          </span>
        </div>
      </div>
      <div className="hud-meters">
        <Meter tone="energy" icon={<Zap size={14} />} value={live.energy} max={view.maxEnergy}
          note={live.energy >= view.maxEnergy ? "Full" : `+1 in ${fmt(live.nextIn)} · full ${fmt(live.fullIn)}`} />
        <Meter tone="health" icon={<Heart size={14} />} value={hurt ? 0 : view.hp} max={view.maxHp}
          note={hurt ? `Clinic ${fmt(live.hospital)}` : view.hp >= view.maxHp ? "Healthy" : "Recovering"} />
      </div>
      <div className="hud-tags">
        <span className={`tag tag-heat heat-${heatTone}`}><Flame size={12} /> {view.heatLabel}</span>
        <span className="tag tag-rep"><Star size={12} /> {view.reputation} rep</span>
        {view.immuneUntil > Date.now() && (
          <span className="tag tag-good" title="You survived a fight. Nobody can attack or mug you for a while. Attacking someone ends it.">
            <ShieldCheck size={12} /> Safe {fmt(view.immuneUntil - Date.now())}
          </span>
        )}
        {view.onBail && <span className="tag tag-warn">On bail</span>}
      </div>
    </header>
    </>
  );
}

/** Sound on/off, remembered on this device. */
function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(soundOn());
    sync();
    window.addEventListener("conspira:sound", sync);
    return () => window.removeEventListener("conspira:sound", sync);
  }, []);
  return (
    <button className="hud-search hud-sound" onClick={() => { setSound(!on); if (!on) play("cash"); }} aria-label={on ? "Mute sound" : "Turn sound on"} title={on ? "Sound on" : "Sound off"}>
      {on ? <Volume2 size={17} /> : <VolumeX size={17} />}
    </button>
  );
}

/** A segmented meter with the number inside it, readable at a glance. */
function Meter({ tone, icon, value, max, note }: { tone: string; icon: React.ReactNode; value: number; max: number; note: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`meter meter-${tone}`}>
      <div className="meter-bar">
        <motion.div className="meter-fill" animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        <span className="meter-text">{icon}<b>{Math.floor(value)}</b>/{max}</span>
      </div>
      <span className="meter-note">{note}</span>
    </div>
  );
}

/** A number that floats up next to a value when it changes (+$24, -$60). */
function Delta({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [prev, setPrev] = useState(value);
  const [pops, setPops] = useState<{ id: number; d: number }[]>([]);
  useEffect(() => {
    if (value !== prev) {
      const d = value - prev;
      const id = Date.now();
      setPops((x) => [...x.slice(-2), { id, d }]);
      setPrev(value);
      const t = setTimeout(() => setPops((x) => x.filter((p) => p.id !== id)), 1600);
      return () => clearTimeout(t);
    }
  }, [value, prev]);
  return (
    <span className="deltas" aria-hidden>
      <AnimatePresence>
        {pops.map((p) => (
          <motion.span key={p.id} className={`delta ${p.d > 0 ? "up" : "down"}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: -18 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6 }}>
            {p.d > 0 ? "+" : "-"}{prefix}{Math.abs(Math.round(p.d)).toLocaleString()}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
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
  useScrollLock(true);
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
const MODE_WORDS = { bus: "bus", train: "train", plane: "flight" } as const;

function ArrivalCard({ view, onDone }: { view: PublicView; onDone: () => void }) {
  const a = view.arrival!;
  const country = view.countries.find((c) => c.id === a.to)!;
  const inc = a.incident;
  return (
    <div className="arrival" style={{ ["--path" as string]: country.color }}>
      <div className="arrival-art">
        <Skyline district={view.districts[0]?.id ?? "title"} />
        <div className="arrival-title">
          <p className="eyebrow"><MapPin size={14} /> Welcome to</p>
          <h2>{country.capital}</h2>
          <span className="path-badge">{country.name}</span>
        </div>
      </div>
      <p className="muted">{country.laws}</p>
      {inc ? (
        <p className={`arrival-incident ${inc.kind}`}>{inc.text}</p>
      ) : (
        <p className="arrival-incident safe">The {MODE_WORDS[a.mode]} was uneventful. You arrive in one piece.</p>
      )}
      <button className="btn btn-primary btn-lg" onClick={onDone}>Hit the streets</button>
    </div>
  );
}

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
  const npcId =
    fight.opponent === "Road Gang" ? "road_gang" : view.fights.find((f) => f.name === fight.opponent)?.id ?? "mugger";

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

/** Marks a place as visited once (for the first-day checklist). */
function Visited({ game, flag }: { game: GameApi; flag: string }) {
  const seen = game.view!.flags.includes(flag);
  useEffect(() => {
    if (!seen && game.view?.tutorial) game.act({ type: "flag", flag });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);
  return null;
}
