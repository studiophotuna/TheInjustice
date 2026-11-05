"use client";

import { useState } from "react";
import { CareerPortrait } from "./art/CareerPortrait";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Briefcase, Cross, Inbox, MapPin, Plane, Sparkles, Zap } from "lucide-react";
import type { CountryId, PathId } from "@/game/types";
import { PATH_LOOKS } from "./art/Portraits";
import { Scene, type CharacterKind, type SceneKind } from "./art/Scenes";
import { BackAlleyCard, JailCard, Sightings } from "./community";
import { OnlineNow } from "./online";
import { BigFish, RightNow, StreetFeed, usePulse } from "./pulse";
import { CityMap } from "./citymap";
import { TutorialCard } from "./underworld";
import { DailyCard } from "./tabs";
import { fmt, type GameApi } from "./useGame";

/** Each career has its own character art; people without one are still on the street. */
const CHARACTER_FOR: Record<PathId, CharacterKind> = {
  police: "detective",
  courts: "lawyer",
  medicine: "doctor",
  banking: "banker",
  vigilante: "vigilante",
  enforcer: "thug",
  military: "vigilante",
};

/** Each city gets its own backdrop. */
const SCENE_FOR: Record<CountryId, SceneKind> = {
  varrow: "city",
  solmarra: "solace",
  kestrova: "ironmoor",
  meridian: "halcyon",
};

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Late night" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

export function HomeTab({ game, go, onRead }: { game: GameApi; go: (target: string) => void; onRead: (id: string) => void }) {
  const view = game.view!;
  const live = game.live!;
  const best = view.jobs.find((j) => j.id === view.recommendedJobId);
  const character: CharacterKind = view.path ? CHARACTER_FOR[view.path.id] : "bum";
  // Locked up or in the clinic, the hero shows it; otherwise your career's world, or your city.
  const scene: SceneKind = view.jail ? "prison" : live.hospital > 0 ? "hospital" : SCENE_FOR[view.location.country];
  const unreadChapter = view.chapters.find((c) => c.unlocked && !c.read);
  const recent = view.inbox.items.slice(0, 3);
  const nextRank = view.ladder && view.ladder.current < view.ladder.ranks.length ? view.ladder.ranks[view.ladder.current] : null;
  const pulse = usePulse(view.location.country);

  return (
    <div className="stack home">
      <Scene kind={scene} className="home-hero" characters={[{ kind: character, x: 78, scale: 0.95 }]}>
        <CareerPortrait path={view.path?.id} rank={view.ladder?.current} name={view.name} className="hero-portrait" />
        <p className="eyebrow"><MapPin size={13} /> {view.location.city}, {view.location.countryName}</p>
        <h1 className="home-title">{greeting()}, {view.name}.</h1>
        {view.streetTitle && <p className="street-title">&ldquo;{view.streetTitle}&rdquo;</p>}
        <p className="home-sub">
          {view.jail
            ? view.jail.custodyCase ? "Behind bars, waiting for a verdict." : "Behind bars, doing your time."
            : view.travel
            ? `On the ${view.travel.mode} to ${view.travel.city}.`
            : view.threat.morgueUntil
              ? `In the morgue for ${fmt(view.threat.morgueUntil - Date.now())}. Someone put out a contract on you.`
              : live.hospital > 0
              ? `Recovering in the clinic for ${fmt(live.hospital)}.`
              : view.path
                ? `${view.path.rank} · ${view.path.name}`
                : "Nobody yet. The street is watching."}
        </p>
      </Scene>

      <StreetFeed feed={pulse?.feed} />
      <RightNow game={game} go={go} needs={pulse?.needs ?? []} onRead={onRead} />
      <TutorialCard game={game} go={go} />
      {view.event && (
        <section className="card city-event">
          <b>{view.event.name} in {view.location.city}</b>
          <span className="muted"> · {view.event.text} Until {new Date(view.event.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</span>
        </section>
      )}
      <ThreatCard game={game} />
      <JailCard game={game} />
      <BackAlleyCard game={game} />
      <Sightings game={game} compact />

      <div className="home-grid">
        <section className="card">
          <h3 className="card-title"><Briefcase size={16} /> Career</h3>
          {view.path && view.ladder ? (
            <>
              <p style={{ color: PATH_LOOKS[view.path.id]?.rim }}><b>{view.path.rank}</b> · {view.path.name}</p>
              <div className="rank-pips" style={{ ["--path" as string]: PATH_LOOKS[view.path.id]?.rim }}>
                {view.ladder.ranks.map((r, i) => <span key={r} className={i < view.ladder!.current ? "on" : ""} title={r} />)}
              </div>
              <p className="muted">{nextRank ? `Next: ${nextRank}. ${view.path.promotion ?? ""}` : "Top of the ladder."}</p>
            </>
          ) : view.application ? (
            <>
              <p>Application to <b>{view.application.schoolName}</b></p>
              <p className="muted">{view.application.status === "pending" ? `Decision in ${fmt(live.application)}.` : "A letter is waiting for you."}</p>
              <button className="btn btn-ghost btn-sm" onClick={() => go("place:academy")}>Open</button>
            </>
          ) : (
            <>
              <p className="muted">No career yet. Pay for school, get someone to vouch for you, or impress the right person on the street.</p>
              <button className="btn btn-ghost btn-sm" onClick={() => go("place:academy")}>Visit the Academy</button>
            </>
          )}
        </section>
      </div>

      <CityMap game={game} go={go} feed={pulse?.feed} />
      <BigFish game={game} heavies={pulse?.heavies} go={go} />

      <DailyCard game={game} />

      <section className="card">
        <div className="row between">
          <h3 className="card-title"><Inbox size={16} /> Inbox</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => go("tab:people")}>Open People</button>
        </div>
        {recent.length === 0 ? (
          <p className="muted">Quiet. Nobody has come looking for you. Yet.</p>
        ) : (
          <ul className="log">
            {recent.map((n) => (
              <li key={n.id} className={n.tone}>{n.text}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Someone is casing you. You never learn who, but you can do something about it. */
function ThreatCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const t = view.threat;
  const [reported, setReported] = useState(false);
  if (!t.watched && !t.bodyguardUntil && !t.lyingLowUntil) return null;
  const until = (x: number) => fmt(x - Date.now());
  return (
    <section className="card threat-card">
      <h3 className="card-title">👁️ {t.watched ? "Someone is watching you" : "Keeping safe"}</h3>
      {t.watched > 0 && (
        <p className="muted">
          {t.watched >= 3 ? "You're sure of it now. Someone knows your routine." : t.watched === 2 ? "It's happened twice. It isn't a coincidence." : "A strange feeling, like you're being followed."}
        </p>
      )}
      {t.bodyguardUntil && <p className="fine">🕴️ Bodyguards with you for {until(t.bodyguardUntil)}.</p>}
      {t.lyingLowUntil && <p className="fine">🏚️ Lying low in a safe house for {until(t.lyingLowUntil)}. No work, no fights, nobody can find you.</p>}
      <div className="row wrap">
        <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "hire_bodyguards" })}>Hire bodyguards ($2,000 / day)</button>
        <button className="btn btn-ghost btn-sm" disabled={game.busy || !t.canLieLow} title={t.canLieLow ? "" : "You can't vanish again so soon."} onClick={() => game.act({ type: "lie_low" })}>Lie low ($300, 6h)</button>
        {t.watched > 0 && (
          <button
            className="btn btn-primary btn-sm"
            disabled={game.busy || reported}
            onClick={async () => {
              if (await game.social({ op: "report_threat" }, "/api/city")) setReported(true);
            }}
          >
            {reported ? "Reported" : "Tell the police"}
          </button>
        )}
      </div>
    </section>
  );
}
