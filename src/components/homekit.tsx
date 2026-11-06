"use client";

// Home in the live-game style: a stories row of what's happening, a hero your character breaks
// out of, tinted tiles for the state of the city, and the big fish leaning out of his card.

import type { ReactNode } from "react";
import { CareerPortrait } from "./art/CareerPortrait";
import { cutoutFor, faceCutout } from "./art/Cutout";
import { REGULAR_LOOKS } from "@/game/content/faces";
import { nextOut, type CrewNeed, type Heavy } from "./pulse";
import { fmt, type GameApi } from "./useGame";
import { SkelCard, SkelTiles } from "./skeleton";

// ── Stories ────────────────────────────────────────────────────────────────

type Story = { key: string; label: string; img: string; fresh: boolean; sub?: string; run: () => unknown };

const NEED_ART: Record<string, string> = { ambush: "street", heist: "bank", breakout: "prison", war: "marina" };

/** Everything worth a tap right now, as a row of circles. Gold rings are new or ready. */
export function Stories({ game, go, needs, onRead, war, heavies, fires, election }: { game: GameApi; go: (t: string) => void; needs: CrewNeed[]; onRead: (id: string) => void; war?: string | null; heavies?: Heavy[]; fires?: number; election?: boolean }) {
  const view = game.view!;
  const live = game.live!;
  const s: Story[] = [];
  const scene = (n: string) => `/scenes/${n}.jpg`;
  const chapter = view.chapters.find((c) => c.unlocked && !c.read);
  // The city first: what's going on out there tonight.
  if (chapter) s.push({ key: "chapter", label: chapter.title.split(" · ")[0], img: scene("interrogation"), fresh: true, run: () => onRead(chapter.id) });
  const boss = heavies?.find((h) => h.out && h.status !== "hospital");
  if (boss?.photo) s.push({ key: "boss", label: "Big fish", img: boss.photo, fresh: true, run: () => go(`person:${boss.id}`) });
  if (fires) s.push({ key: "fire", label: "Fire!", img: scene("crimescene"), fresh: true, run: () => go("place:police") });
  if (election) s.push({ key: "election", label: "Election", img: scene("cityhall"), fresh: false, run: () => go("place:cityhall") });
  if (war) s.push({ key: "war", label: "Turf war", img: scene("marina"), fresh: true, run: () => go("place:cityhall") });
  for (const n of needs) s.push({ key: `need-${n.kind}`, label: n.cta, img: scene(NEED_ART[n.kind] ?? "street"), fresh: true, run: () => go(n.go) });
  if (view.daily.canClaim) s.push({ key: "daily", label: "Daily reward", img: scene("exchange"), fresh: true, run: () => game.act({ type: "claim_daily" }) });
  const unread = view.inbox.items.filter((i) => !i.read).length;
  if (unread) s.push({ key: "inbox", label: `${unread} message${unread > 1 ? "s" : ""}`, img: scene("police"), fresh: true, run: () => go("people:inbox") });
  const risky = view.dirty > 0 || view.stash.drugs.some((d) => d.onYou > 0);
  if (risky && view.stash.spot && !view.travel && !view.jail) s.push({ key: "stash", label: "Hide it", img: scene("southside"), fresh: true, run: () => game.act({ type: "stash", op: "put_all" }) });
  const dog = view.dog.dog;
  if (dog && dog.state === "hungry" && !view.travel) s.push({ key: "dog", label: `Feed ${dog.name}`, img: scene("southside"), fresh: true, run: () => game.act({ type: "dog_feed" }) });
  const medic = view.specialties.find((x) => x.id === "combat_medic" && x.tier > 0);
  if (medic?.ready && view.hp < view.maxHp) s.push({ key: "dressing", label: "Patch up", img: scene("hospital"), fresh: true, run: () => game.act({ type: "field_dressing" }) });
  if (live.full === 0 && live.energy < view.maxEnergy) s.push({ key: "food", label: "Eat", img: scene("oldmarket"), fresh: true, run: () => go("tab:shop") });
  if (view.event) s.push({ key: "event", label: view.event.name, img: scene("city"), fresh: false, run: () => go("tab:city") });
  // Timers: grey rings with the time left.
  if (live.fullIn > 0) s.push({ key: "energy", label: "Energy full", sub: fmt(live.fullIn), img: scene("ironrow"), fresh: false, run: () => go("tab:jobs") });
  if (live.hospital > 0) s.push({ key: "clinic", label: "Clinic", sub: fmt(live.hospital), img: scene("hospital"), fresh: false, run: () => undefined });
  if (view.travel) s.push({ key: "travel", label: view.travel.city, sub: fmt(live.travel), img: scene("station"), fresh: false, run: () => undefined });
  if (!s.length) return null;
  return (
    <div className="stories" role="list" aria-label="What's happening">
      {s.map((x) => (
        <button key={x.key} role="listitem" className={`story ${x.fresh ? "fresh" : ""}`} onClick={() => x.run()} disabled={game.busy}>
          <span className="story-ring"><img src={x.img} alt="" /></span>
          <span className="story-label">{x.label}</span>
          {x.sub && <span className="story-sub">{x.sub}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────

/** Your character, cut out and standing in front of the city. Falls back to the framed portrait. */
export function Hero({ game, scene, title, sub, quote, action, kicker }: { game: GameApi; scene: string; title: string; sub: string; quote?: string | null; action?: ReactNode; kicker?: string }) {
  const view = game.view!;
  const cut = cutoutFor(view.path?.id, view.ladder?.current);
  return (
    <section className={`hero2 ${cut ? "has-cut" : ""}`}>
      <div className="hero2-bg"><img src={`/scenes/${scene}.jpg`} alt="" /></div>
      {cut ? (
        <img className="hero2-cut" src={cut} alt="" />
      ) : (
        <CareerPortrait path={view.path?.id} rank={view.ladder?.current} name={view.name} className="hero2-frame" />
      )}
      <div className="hero2-copy">
        <p className="kicker">{kicker ?? `${view.location.city} · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}</p>
        <h1 className="hero2-title">{title}</h1>
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
    { n: stats.fires, label: stats.fires === 1 ? "Fire" : "Fires", tone: "orange", to: "place:police" },
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
          <button className="btn btn-red" disabled={game.busy} onClick={() => confirm(`Take on ${h.name} alone? Heavies don't go down easy.`) && game.social({ op: "attack", targetId: h.id })}>
            Take {them} on
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => go("people:crew")}>Bring a crew</button>
      </div>
    </article>
  );
}
