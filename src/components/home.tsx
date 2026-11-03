"use client";

import { motion } from "motion/react";
import { ArrowRight, BookOpen, Briefcase, Cross, Inbox, MapPin, Plane, Sparkles, Zap } from "lucide-react";
import type { CountryId, PathId } from "@/game/types";
import { PATH_LOOKS } from "./art/Portraits";
import { Scene, type CharacterKind, type SceneKind } from "./art/Scenes";
import { JailCard, Sightings } from "./community";
import { OnlineNow } from "./online";
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
};

/** Each city gets its own backdrop. */
const SCENE_FOR: Record<CountryId, SceneKind> = {
  varrow: "street",
  solmarra: "city",
  kestrova: "police",
  meridian: "highrise",
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
  const scene: SceneKind = view.path?.id === "police" ? "police" : view.path?.id === "medicine" ? "hospital" : SCENE_FOR[view.location.country];
  const unreadChapter = view.chapters.find((c) => c.unlocked && !c.read);
  const recent = view.inbox.items.slice(0, 3);
  const nextRank = view.ladder && view.ladder.current < view.ladder.ranks.length ? view.ladder.ranks[view.ladder.current] : null;

  return (
    <div className="stack home">
      <Scene kind={scene} className="home-hero" characters={[{ kind: character, x: 78, scale: 0.95 }]}>
        <p className="eyebrow"><MapPin size={13} /> {view.location.city}, {view.location.countryName}</p>
        <h1 className="home-title">{greeting()}, {view.name}.</h1>
        {view.streetTitle && <p className="street-title">&ldquo;{view.streetTitle}&rdquo;</p>}
        <p className="home-sub">
          {view.jail
            ? view.jail.custodyCase ? "Behind bars, waiting for a verdict." : "Behind bars, doing your time."
            : view.travel
            ? `On the ${view.travel.mode} to ${view.travel.city}.`
            : live.hospital > 0
              ? `Recovering in the clinic for ${fmt(live.hospital)}.`
              : view.path
                ? `${view.path.rank} · ${view.path.name}`
                : "Nobody yet. The street is watching."}
        </p>
      </Scene>

      {view.event && (
        <section className="card city-event">
          <b>{view.event.name} in {view.location.city}</b>
          <span className="muted"> · {view.event.text} Until {new Date(view.event.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</span>
        </section>
      )}
      <JailCard game={game} />
      <Sightings game={game} compact />

      <div className="home-grid">
        <section className="card next-move">
          <h3 className="card-title"><Sparkles size={16} /> Your next move</h3>
          {view.jail ? (
            <p className="muted">You&apos;re behind bars. Nothing to do but wait{view.jail.custodyCase ? " for the verdict" : ""}.</p>
          ) : view.travel ? (
            <p><Plane size={14} /> Arriving in {fmt(live.travel)}. Sit tight.</p>
          ) : live.hospital > 0 ? (
            <p><Cross size={14} /> Rest up. Medkits cut the stay in half.</p>
          ) : best ? (
            <>
              <p className="next-job"><b>{best.name}</b> <span className="muted">· ${best.pay[0]}–{best.pay[1]} · ⚡{best.energy}</span></p>
              <motion.button whileTap={{ scale: 0.95 }} className="btn btn-primary" onClick={() => go(`job:${best.id}`)}>
                <Briefcase size={15} /> Go to work <ArrowRight size={15} />
              </motion.button>
            </>
          ) : (
            <p className="muted"><Zap size={14} /> Out of energy. Full in {fmt(live.fullIn)}. Eat something, or train later.</p>
          )}
        </section>

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
              <button className="btn btn-ghost btn-sm" onClick={() => go("tab:profile")}>Open</button>
            </>
          ) : (
            <>
              <p className="muted">No career yet. Pay for school, get someone to vouch for you, or impress the right person on the street.</p>
              <button className="btn btn-ghost btn-sm" onClick={() => go("tab:profile")}>See careers</button>
            </>
          )}
        </section>
      </div>

      <OnlineNow game={game} limit={4} />

      <DailyCard game={game} />

      {unreadChapter && (
        <button className="card story-nudge" onClick={() => onRead(unreadChapter.id)}>
          <BookOpen size={18} />
          <span><b>New chapter:</b> {unreadChapter.title}</span>
          <ArrowRight size={16} />
        </button>
      )}

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
