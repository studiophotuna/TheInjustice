"use client";

import { useState } from "react";
import { CareerPortrait } from "./art/CareerPortrait";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Briefcase, Cross, Inbox, MapPin, Plane, Sparkles, Zap } from "lucide-react";
import type { CountryId, PathId } from "@/game/types";
import { PATH_LOOKS } from "./art/Portraits";
import { Scene, type CharacterKind, type SceneKind } from "./art/Scenes";
import { BackAlleyCard, JailCard, Sightings } from "./community";
import { DisposalCard, RightNow, usePulse } from "./pulse";
import { BigFish2, CityTiles, Hero, Stories } from "./homekit";
import { CityMap } from "./citymap";
import { TutorialCard } from "./underworld";
import { DailyCard } from "./tabs";
import { fmt, type GameApi } from "./useGame";
import { OnTheRun } from "./fugitives";

/** Each career has its own character art; people without one are still on the street. */
const CHARACTER_FOR: Record<PathId, CharacterKind> = {
  police: "detective",
  courts: "lawyer",
  medicine: "doctor",
  banking: "banker",
  vigilante: "vigilante",
  enforcer: "thug",
  military: "vigilante",
  mechanic: "bum",
  hacker: "banker",
  fire: "vigilante",
};

/** The photo behind the hero for each scene. */
const sceneFile = (s: SceneKind) => (s === "city" ? "street" : s);

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

  const sub = view.jail
            ? view.jail.custodyCase ? "Behind bars, waiting for a verdict." : "Behind bars, doing your time."
            : view.travel
            ? `${view.travel.mode === "car" ? "Driving" : `On the ${view.travel.mode}`} to ${view.travel.city}.`
            : view.threat.morgueUntil
              ? `In the morgue for ${fmt(view.threat.morgueUntil - Date.now())}. Someone put out a contract on you.`
              : live.hospital > 0
              ? `Recovering in the clinic for ${fmt(live.hospital)}.`
              : view.path
                ? `${view.path.rank} · ${view.path.name}`
                : "Nobody yet. The street is watching.";
  const busyElsewhere = !!view.jail || !!view.travel || live.hospital > 0;

  return (
    <div className="stack home">
      <Stories game={game} go={go} needs={pulse?.needs ?? []} onRead={onRead} />
      <Hero
        game={game}
        scene={sceneFile(scene)}
        title={`${greeting()}, ${view.name.split(" ")[0]}`}
        sub={sub}
        quote={view.streetTitle}
        action={
          !busyElsewhere && best ? (
            <button className="btn btn-red" disabled={game.busy || !!best.locked} onClick={() => game.act({ type: "job", jobId: best.id })}>
              {best.name} <small>${best.pay[0]}–{best.pay[1]}</small>
            </button>
          ) : null
        }
      />

      <DisposalCard game={game} />
      <OnTheRun game={game} />
      <JailCard game={game} />
      <RightNow game={game} go={go} needs={pulse?.needs ?? []} onRead={onRead} />
      <TutorialCard game={game} go={go} />
      <OldLife game={game} go={go} />
      <ThreatCard game={game} />
      <BackAlleyCard game={game} />
      <Sightings game={game} compact />

      <CityTiles stats={pulse?.stats} city={view.location.city} go={go} />
      <div className="home-pair">
        <BigFish2 game={game} heavies={pulse?.heavies} go={go} />
        <CityMap game={game} go={go} feed={pulse?.feed} />
      </div>

      <DailyCard game={game} />
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

/** Until a career finds them: who they were, and the work that gets them noticed. */
function OldLife({ game, go }: { game: GameApi; go: (t: string) => void }) {
  const b = game.view!.background;
  if (!b?.show) return null;
  return (
    <section className="card old-life">
      <p className="eyebrow">Your old life · {b.name}</p>
      <p className="fine">Before the judge put you away, you {b.story}</p>
      <p className="fine muted">
        {b.career} fits you. {b.jobId ? <>Start with <b>&ldquo;{b.job}&rdquo;</b> ({b.where})</> : <>{b.job}</>} and {b.contact} will notice. You still need to be good at it.
      </p>
      {b.jobId && b.here && (
        <button className="btn btn-ghost btn-sm" onClick={() => go(`job:${b.jobId}`)}>Show me the job</button>
      )}
      {b.jobId && !b.here && (
        <button className="btn btn-ghost btn-sm" onClick={() => go("place:station")}>That's in another city · Travel</button>
      )}
      {!b.jobId && (
        <button className="btn btn-ghost btn-sm" onClick={() => go("tab:fight")}>To the gym</button>
      )}
    </section>
  );
}
