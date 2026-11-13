"use client";

// Home in the live-game style: a stories row of what's happening, a hero your character breaks
// out of, tinted tiles for the state of the city, and the big fish leaning out of his card.

import { useEffect, useState, type ReactNode } from "react";
import { Zap } from "lucide-react";
import { CareerPortrait } from "./art/CareerPortrait";
import { FxName, NAME_FX, type NameFxKind } from "./art/FxRing";
import { cutoutFor, faceCutout } from "./art/Cutout";
import { REGULAR_LOOKS } from "@/game/content/faces";
import { nextOut, type CrewNeed, type Heavy } from "./pulse";
import { fmt, type GameApi } from "./useGame";
import { SkelCard, SkelTiles } from "./skeleton";
import { askThen } from "./ask";

// ── Stories ────────────────────────────────────────────────────────────────

/** A photo for each city event. */
const EVENT_SCENE: Record<string, string> = { heatwave: "foundry", festival: "boardwalk", blackout: "undercity", storm: "street", payday: "exchange" };

/** What a city event is and what it changes, with a clock until it ends. */
function EventSheet({ game, go, close }: { game: GameApi; go: (t: string) => void; close: () => void }) {
  const e = game.view!.event;
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!e) return null;
  const left = Math.max(0, e.endsAt - Date.now());
  return (
    <div className="tryon-backdrop" onClick={close} role="dialog" aria-modal="true" aria-label={e.name}>
      <div className="tryon event-sheet" onClick={(x) => x.stopPropagation()}>
        <div className="event-hero">
          <img src={`/scenes/${EVENT_SCENE[e.id] ?? "city"}.jpg`} alt="" />
          <div>
            <span className="kicker">{game.view!.location.city} · ends in {fmt(left)}</span>
            <b>{e.name}</b>
          </div>
        </div>
        <p className="event-text">{e.text}</p>
        {e.effects.length > 0 && (
          <ul className="event-effects">
            {e.effects.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
        <p className="fine muted">Every city gets an event now and then, for about an hour. Everyone in {game.view!.location.city} feels it.</p>
        <div className="tryon-acts">
          <button className="btn btn-ghost" onClick={close}>Close</button>
          <button className="btn btn-red" onClick={() => { close(); go("tab:jobs"); }}>Go to work</button>
        </div>
      </div>
    </div>
  );
}

type Story = {
  key: string; label: string; img: string; fresh: boolean; sub?: string; run: () => unknown;
  /** The Up next card: a tag, a title, one line and a button. Stories without a cta stay off the rail. */
  tag?: string; title?: string; line?: string; cta?: ReactNode; tone?: "go" | "fight" | "ghost";
};

const NEED_ART: Record<string, string> = { ambush: "street", heist: "bank", breakout: "prison", war: "street" };
/** District photos whose file name differs from the district id. */
const DISTRICT_ART: Record<string, string> = { precinct_square: "precinct", casino_strip: "casino", checkpoint_row: "checkpoint", glass_quarter: "highrise" };

/** Everything worth a tap right now, as a row of circles. Gold rings are new or ready. */
export function Stories({ game, go, needs, onRead, war, heavies, fires, election, rail = false }: { game: GameApi; go: (t: string) => void; needs: CrewNeed[]; onRead: (id: string) => void; war?: string | null; heavies?: Heavy[]; fires?: number; election?: boolean; rail?: boolean }) {
  const view = game.view!;
  const live = game.live!;
  const [showEvent, setShowEvent] = useState(false);
  const s: Story[] = [];
  const scene = (n: string) => `/scenes/${n}.jpg`;
  const chapter = view.chapters.find((c) => c.unlocked && !c.read);
  // The city first: what's going on out there tonight.
  if (chapter) s.push({ key: "chapter", label: chapter.title.split(" · ")[0], img: scene("interrogation"), fresh: true, run: () => onRead(chapter.id), tag: "New chapter", title: chapter.title.split(" · ").slice(-1)[0], line: chapter.title.split(" · ")[0], cta: "Read" });
  const boss = heavies?.find((h) => h.out && h.status !== "hospital");
  if (boss?.photo) s.push({ key: "boss", label: "Big fish", img: boss.photo, fresh: true, run: () => go(`person:${boss.id}`), tag: "Out now", title: boss.name, line: `Runs the street · ${boss.title}`, cta: "Take him on", tone: "fight" });
  // The best work going, one tap (the Go button does your career's work).
  const best = view.jobs.find((j) => j.id === view.recommendedJobId && !j.locked);
  if (best && rail && !view.jail && !view.travel && live.hospital === 0) s.push({ key: "best", label: best.name, img: scene(DISTRICT_ART[best.district] ?? best.district.replace(/_/g, "")), fresh: true, run: () => game.act({ type: "job", jobId: best.id }), tag: "Best now", title: best.name, line: `$${best.pay[0]}–${best.pay[1]} · ${view.districts.find((d) => d.id === best.district)?.name ?? ""}`, cta: <><Zap size={13} strokeWidth={2.6} fill="currentColor" />{best.energy}</> });
  if (fires) s.push({ key: "fire", label: "Fire!", img: "/portraits/fire-7.jpg", fresh: true, run: () => go("place:firehouse"), tag: "Fire", title: fires === 1 ? "A fire in the city" : `${fires} fires in the city`, line: "Someone's livelihood is burning.", cta: "Go", tone: "fight" });
  if (election) s.push({ key: "election", label: "Election", img: scene("cityhall"), fresh: false, run: () => go("place:cityhall"), tag: "Election", title: "City Hall is voting", line: "Vote, or run yourself.", cta: "City Hall", tone: "ghost" });
  if (war) s.push({ key: "war", label: "Turf war", img: scene("street"), fresh: true, run: () => go("place:cityhall"), tag: "Turf war", title: "Crews at war", line: "Settled when the clock runs out.", cta: "Watch", tone: "fight" });
  for (const n of needs) s.push({ key: `need-${n.kind}`, label: n.cta, img: scene(NEED_ART[n.kind] ?? "street"), fresh: true, run: () => go(n.go), tag: "Your crew", title: n.cta, cta: "Go" });
  // No "Daily reward" bubble: the Daily card further down Home already has the button.
  const unread = view.inbox.items.filter((i) => !i.read).length;
  if (unread) s.push({ key: "inbox", label: `${unread} message${unread > 1 ? "s" : ""}`, img: scene("city"), fresh: true, run: () => go("people:inbox"), tag: "Inbox", title: `${unread} new message${unread > 1 ? "s" : ""}`, line: "Who's been asking about you.", cta: "Read", tone: "ghost" });
  const risky = view.dirty > 0 || view.stash.drugs.some((d) => d.onYou > 0);
  if (risky && view.stash.spot && !view.travel && !view.jail) s.push({ key: "stash", label: "Hide it", img: scene("highrise"), fresh: true, run: () => game.act({ type: "stash", op: "put_all" }), tag: "On you", title: "Hide what you're carrying", line: "Dirty money and drugs go in your stash.", cta: "Hide it", tone: "ghost" });
  const dog = view.dog.dog;
  if (dog && dog.state === "hungry" && !view.travel) s.push({ key: "dog", label: `Feed ${dog.name}`, img: scene("highrise"), fresh: true, run: () => game.act({ type: "dog_feed" }), tag: "Your dog", title: `${dog.name} is hungry`, cta: "Feed", tone: "ghost" });
  const medic = view.specialties.find((x) => x.id === "combat_medic" && x.tier > 0);
  if (medic?.ready && view.hp < view.maxHp) s.push({ key: "dressing", label: "Patch up", img: scene("hospital"), fresh: true, run: () => game.act({ type: "field_dressing" }) });
  if (live.full === 0 && live.energy < view.maxEnergy) s.push({ key: "food", label: "Eat", img: scene("oldmarket"), fresh: true, run: () => go("tab:shop") });
  if (view.event) s.push({ key: "event", label: view.event.name, img: scene(EVENT_SCENE[view.event.id] ?? "city"), fresh: true, run: () => setShowEvent(true), tag: "Today", title: view.event.name, cta: "What's on", tone: "ghost" });
  // Timers: grey rings with the time left.
  if (live.fullIn > 0) s.push({ key: "energy", label: "Energy full", sub: fmt(live.fullIn), img: scene("ironrow"), fresh: false, run: () => go("tab:jobs") });
  if (live.hospital > 0) s.push({ key: "clinic", label: "Clinic", sub: fmt(live.hospital), img: scene("hospital"), fresh: false, run: () => undefined });
  if (view.travel) s.push({ key: "travel", label: view.travel.city, sub: fmt(live.travel), img: scene("station"), fresh: false, run: () => undefined });
  if (rail) {
    const cards = s.filter((x) => x.cta);
    if (!cards.length) return null;
    return (
      <section className="upnext">
        {showEvent && <EventSheet game={game} go={go} close={() => setShowEvent(false)} />}
        <div className="sec-head"><h2>Up next</h2></div>
        <div className="upnext-rail" role="list">
          {cards.map((x) => (
            <article key={x.key} role="listitem" className="upnext-card" style={{ backgroundImage: `url(${x.img})` }}>
              <span className={`upnext-tag tone-${x.tone ?? "go"}`}>{x.tag}</span>
              <h3>{x.title}</h3>
              {x.line && <p>{x.line}</p>}
              <button className={`btn btn-sm ${x.tone === "fight" ? "btn-danger" : x.tone === "ghost" ? "btn-ghost" : "btn-primary"}`} disabled={game.busy} onClick={() => x.run()}>{x.cta}</button>
            </article>
          ))}
        </div>
      </section>
    );
  }
  if (!s.length) return null;
  return (
    <>
    {showEvent && <EventSheet game={game} go={go} close={() => setShowEvent(false)} />}
    <div className="stories" role="list" aria-label="What's happening">
      {s.map((x) => (
        <button key={x.key} role="listitem" className={`story ${x.fresh ? "fresh" : ""}`} onClick={() => x.run()} disabled={game.busy}>
          <span className="story-ring"><img src={x.img} alt="" /></span>
          <span className="story-label">{x.label}</span>
          {x.sub && <span className="story-sub">{x.sub}</span>}
        </button>
      ))}
    </div>
    </>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────

/** Your character, cut out and standing in front of the city. Falls back to the framed portrait. */
export function Hero({ game, scene, title, sub, quote, action, kicker, titleFx }: { game: GameApi; scene: string; title: string; sub: string; quote?: string | null; action?: ReactNode; kicker?: string; titleFx?: string | null }) {
  const view = game.view!;
  const cut = cutoutFor(view.path?.id, view.ladder?.current);
  return (
    <section className={`hero2 ${cut ? "has-cut" : ""}`}>
      <div className="hero2-bg"><img src={scene.startsWith("/") ? scene : `/scenes/${scene}.jpg`} alt="" /></div>
      {cut ? (
        <img className="hero2-cut" src={cut} alt="" />
      ) : (
        <CareerPortrait path={view.path?.id} rank={view.ladder?.current} name={view.name} className="hero2-frame" />
      )}
      <div className="hero2-copy">
        <p className="kicker">{kicker ?? `${view.location.city} · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}</p>
        <h1 className="hero2-title">{title}{titleFx && NAME_FX.has(titleFx) && <FxName key={titleFx} kind={titleFx as NameFxKind} />}</h1>
        <p className="hero2-sub">{sub}</p>
        {quote && <p className="hero2-quote">&ldquo;{quote}&rdquo;</p>}
        {action}
      </div>
    </section>
  );
}

// ── City tiles ─────────────────────────────────────────────────────────────

export type CityStats = { out: number; crews: number; wanted: number; fires: number };

export function CityTiles({ stats, city, go }: { stats: CityStats | undefined; city: string; go: (t: string) => void }) {
  if (!stats) return <SkelTiles />;
  const tiles = [
    { n: stats.out, label: "Out on the street", tone: "teal", to: "tab:people" },
    { n: stats.crews, label: stats.crews === 1 ? "Crew" : "Crews", tone: "violet", to: "people:crew" },
    { n: stats.wanted, label: "Wanted", tone: "red", to: "place:police" },
    { n: stats.fires, label: stats.fires === 1 ? "Fire" : "Fires", tone: "orange", to: "place:firehouse" },
  ];
  return (
    <section>
      <div className="sec-head"><h2>Tonight in {city}</h2></div>
      <div className="tiles">
        {tiles.map((t) => (
          <button key={t.label} className={`tile tone-${t.tone}`} onClick={() => go(t.to)}>
            <b>{t.n}</b>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Big fish ───────────────────────────────────────────────────────────────

/** The people who run the streets, each leaning out of his own card. */
export function BigFish2({ game, heavies, go }: { game: GameApi; heavies: Heavy[] | undefined; go: (t: string) => void }) {
  if (!heavies) return <SkelCard lines={2} className="boss-one" />;
  if (!heavies.length) return null;
  // One boss at a time, the one who's out if anyone is: a single big card, like a fight poster.
  const h = heavies.find((x) => x.out && x.status !== "hospital") ?? heavies.find((x) => x.out) ?? heavies[0];
  const cut = faceCutout(h.photo);
  const g = REGULAR_LOOKS[h.id.split("-").slice(2).join("-")]?.g;
  const them = g === "f" ? "her" : g === "m" ? "him" : "them";
  return (
    <article className={`boss boss-one ${h.out ? "out" : ""} ${cut ? "" : "framed"}`}>
      {cut ? <img className="boss-cut" src={cut} alt="" /> : <img className="boss-frame" src={h.photo ?? ""} alt="" />}
      <div className="boss-who">
        <span className="kicker">&#9819; Big fish{heavies.length > 1 ? ` · 1 of ${heavies.length}` : ""}</span>
        <h3>{h.name}</h3>
        <span className={`status ${h.status === "hospital" ? "away" : h.out ? "on" : ""}`}>
          {h.status === "hospital" ? "In the clinic" : h.out ? `Out now · ${h.title}` : `Out at ${nextOut(h.hours)}`}
        </span>
        {h.tie && <span className={`tie-badge tie-${h.tie.tone}`}>{h.tie.label}</span>}
      </div>
      <div className="boss-acts">
        {h.out && !h.canAttack && (
          <button className="btn btn-red" disabled={game.busy} onClick={() => askThen({ title: `Take on ${h.name} alone?`, note: h.title, body: "Heavies don't go down easy. If it goes wrong you wake up in the clinic, lighter in the pocket. A crew splits the risk.", photo: h.photo, yes: `Take ${them} on`, no: "Back off", tone: "danger" }, () => game.social({ op: "attack", targetId: h.id }))}>
            Take {them} on
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => go("people:crew")}>Bring a crew</button>
      </div>
    </article>
  );
}
