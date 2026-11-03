"use client";

import { motion } from "motion/react";
import { ArrowLeft, Building2, GraduationCap, HeartPulse, Landmark, Lock, Scale, Shield, Siren, Train } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { Scene, type SceneKind } from "./art/Scenes";
import { CityHall } from "./cityhall";
import { BackAlleyCard, CasesPanel, JailCard, Sightings, useHub, Yard } from "./community";
import { AcademyContent, BankAccountCard, DocMercyCard, LoansCard, StoryCard, TravelContent } from "./tabs";
import { LaunderCard, StreetMarket } from "./underworld";
import type { GameApi } from "./useGame";

export type Building = "police" | "court" | "hospital" | "bank" | "academy" | "cityhall" | "prison" | "street" | "station";

const BUILDINGS: { id: Building; name: string; scene: SceneKind; poster: string; Icon: ComponentType<{ size?: number }>; tagline: string }[] = [
  { id: "police", name: "Police Station", scene: "police", poster: "police", Icon: Siren, tagline: "Report what you saw. Case files, arrests, internal affairs." },
  { id: "court", name: "Courthouse", scene: "court", poster: "court", Icon: Scale, tagline: "Trials, bail, lawyers, the court record." },
  { id: "hospital", name: "Hospital", scene: "hospital", poster: "hospital", Icon: HeartPulse, tagline: "Patients, check-ups, and a quiet back door." },
  { id: "bank", name: "Bank", scene: "bank", poster: "bank", Icon: Landmark, tagline: "Your account, loans, and cleaning dirty money." },
  { id: "academy", name: "Academy", scene: "lab", poster: "lab", Icon: GraduationCap, tagline: "Enroll to earn the degree a career needs." },
  { id: "cityhall", name: "City Hall", scene: "city", poster: "city", Icon: Building2, tagline: "The mayor, the vote, the paper, the turf." },
  { id: "prison", name: "Prison", scene: "prison", poster: "prison", Icon: Lock, tagline: "The yard, and anyone doing time." },
  { id: "street", name: "The Street", scene: "street", poster: "street", Icon: Shield, tagline: "Dealers, rackets, contracts, cold cases." },
  { id: "station", name: "Station", scene: "highrise", poster: "highrise", Icon: Train, tagline: "Bus, train or plane to another country." },
];

/** The City tab: buildings you walk into. Each one holds everything that happens there. */
export function CityPlaces({ game, place, setPlace, onRead }: { game: GameApi; place: Building | null; setPlace: (b: Building | null) => void; onRead: (id: string) => void }) {
  const view = game.view!;
  const def = BUILDINGS.find((b) => b.id === place) ?? null;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [place]);

  if (def) {
    return (
      <div className="stack place">
        <Scene kind={def.scene} className="place-hero">
          <button className="btn btn-ghost btn-sm place-back" onClick={() => setPlace(null)}>
            <ArrowLeft size={15} /> {view.location.city}
          </button>
          <h1 className="place-title">{def.name}</h1>
          <p className="place-tagline">{def.tagline}</p>
        </Scene>
        <PlaceContent game={game} place={def.id} onRead={onRead} />
      </div>
    );
  }

  const badge = (b: Building) =>
    b === "police" ? view.sightings.length : b === "prison" && view.jail ? "you" : b === "academy" && view.application ? "!" : 0;

  return (
    <div className="stack">
      <div className="city-head">
        <p className="eyebrow">{view.location.countryName}</p>
        <h2 className="city-title">{view.location.city}</h2>
      </div>
      <div className="buildings">
        {BUILDINGS.map((b, i) => (
          <motion.button
            key={b.id}
            className="building"
            style={{ backgroundImage: `url(/scenes/${b.poster}.jpg)` }}
            onClick={() => setPlace(b.id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <span className="building-shade" />
            <span className="building-name"><b.Icon size={16} /> {b.name}</span>
            <span className="building-tag">{b.tagline}</span>
            {badge(b.id) ? <span className="badge-dot building-badge">{badge(b.id)}</span> : null}
          </motion.button>
        ))}
      </div>
      <StoryCard game={game} onRead={onRead} />
    </div>
  );
}

function PlaceContent({ game, place, onRead }: { game: GameApi; place: Building; onRead: (id: string) => void }) {
  const view = game.view!;
  const { hub, social } = useHub(game);
  switch (place) {
    case "police":
      return <CasesPanel game={game} hub={hub} place="police" />;
    case "court":
      return (
        <div className="stack">
          {view.retainer && (
            <section className="card">
              <p className="fine">⚖️ {view.retainer.name} is your lawyer on retainer until {new Date(view.retainer.until).toLocaleDateString()}.</p>
            </section>
          )}
          <CasesPanel game={game} hub={hub} place="court" />
          <p className="fine muted center">To hire a lawyer on retainer, find an attorney in People.</p>
        </div>
      );
    case "hospital":
      return (
        <div className="stack">
          <BackAlleyCard game={game} />
          <DocMercyCard game={game} />
          <CasesPanel game={game} hub={hub} place="hospital" />
        </div>
      );
    case "bank":
      return (
        <div className="stack">
          <BankAccountCard game={game} />
          <LaunderCard game={game} />
          <LoansCard game={game} />
          <CasesPanel game={game} hub={hub} place="bank" />
        </div>
      );
    case "academy":
      return <AcademyContent game={game} />;
    case "cityhall":
      return <CityHall game={game} />;
    case "prison":
      return view.jail ? (
        <div className="stack">
          <JailCard game={game} />
          <Yard game={game} hub={hub} social={social} />
        </div>
      ) : (
        <section className="card">
          <p className="muted">
            Visiting hours are over. If you end up inside, the yard is where you&apos;ll find everyone else doing time. Crews can plan to break
            their own people out from the Crew tab.
          </p>
        </section>
      );
    case "street":
      return (
        <div className="stack">
          <StreetMarket game={game} />
          <CasesPanel game={game} hub={hub} place="street" />
          <Sightings game={game} compact />
        </div>
      );
    case "station":
      return <TravelContent game={game} onRead={onRead} />;
  }
}

/** Opens a building from anywhere (toasts, Home buttons): "place:police". */
export function usePlaceState(): [Building | null, (b: Building | null) => void] {
  const [place, setPlace] = useState<Building | null>(null);
  return [place, setPlace];
}
