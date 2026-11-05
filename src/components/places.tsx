"use client";

import { motion } from "motion/react";
import { Anchor, ArrowLeft, BedDouble, BookUser, Building2, GraduationCap, HeartPulse, Landmark, Lock, Scale, Shield, Siren, Train } from "lucide-react";
import { Docks } from "./docks";
import { DogCard, StashCard } from "./stash";
import { BreakIns } from "./property";
import { Directory } from "./directory";
import { CustomsCard } from "./customs";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Scene, type SceneKind } from "./art/Scenes";
import { CityHall } from "./cityhall";
import { BackAlleyCard, CasesPanel, JailCard, Sightings, useHub, Yard } from "./community";
import { AcademyContent, BankAccountCard, DocMercyCard, LoansCard, Statement, TravelContent } from "./tabs";
import { ConspiracyBoard } from "./board";
import { ItemArt } from "./art/ItemArt";
import { LaunderCard, StreetMarket } from "./underworld";
import type { GameApi } from "./useGame";

export type Building = "police" | "court" | "hospital" | "bank" | "academy" | "cityhall" | "prison" | "street" | "station" | "docks" | "home" | "directory";

const BUILDINGS: { id: Building; name: string; scene: SceneKind; poster: string; Icon: ComponentType<{ size?: number }>; tagline: string }[] = [
  { id: "directory", name: "The Directory", scene: "city", poster: "city", Icon: BookUser, tagline: "Who in town launders, defends, patches up, repairs or sells, and for how much." },
  { id: "home", name: "Your Place", scene: "southside", poster: "southside", Icon: BedDouble, tagline: "Where you sleep, and where you hide what can't go in a bank." },
  { id: "police", name: "Police Station", scene: "police", poster: "police", Icon: Siren, tagline: "Report what you saw. Case files, arrests, internal affairs." },
  { id: "court", name: "Courthouse", scene: "court", poster: "court", Icon: Scale, tagline: "Trials, bail, lawyers, the court record." },
  { id: "hospital", name: "Hospital", scene: "hospital", poster: "hospital", Icon: HeartPulse, tagline: "Patients, check-ups, and a quiet back door." },
  { id: "bank", name: "Bank", scene: "bank", poster: "bank", Icon: Landmark, tagline: "Your account, loans, and cleaning dirty money." },
  { id: "academy", name: "Academy", scene: "academy", poster: "academy", Icon: GraduationCap, tagline: "Enroll to earn the degree a career needs." },
  { id: "cityhall", name: "City Hall", scene: "cityhall", poster: "cityhall", Icon: Building2, tagline: "The mayor, the vote, the paper, the turf." },
  { id: "prison", name: "Prison", scene: "prison", poster: "prison", Icon: Lock, tagline: "The yard, and anyone doing time." },
  { id: "street", name: "The Street", scene: "street", poster: "street", Icon: Shield, tagline: "Dealers, rackets, contracts, break-ins, cold cases." },
  { id: "station", name: "Station", scene: "station", poster: "station", Icon: Train, tagline: "Bus, train or plane to another country. Or drive." },
  { id: "docks", name: "The Docks", scene: "marina", poster: "marina", Icon: Anchor, tagline: "Your cars, the lot, and fences who move cargo between cities." },
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
      <ConspiracyBoard game={game} onRead={onRead} />
    </div>
  );
}

function PlaceContent({ game, place, onRead }: { game: GameApi; place: Building; onRead: (id: string) => void }) {
  const view = game.view!;
  const { hub, social } = useHub(game);
  switch (place) {
    case "police":
      return (
        <div className="stack">
          <ThreatReports game={game} />
          <CasesPanel game={game} hub={hub} place="police" />
        </div>
      );
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
          <Statement game={game} />
          <GuardCard game={game} />
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
          <GunOffers game={game} />
          <StreetMarket game={game} />
          <BreakIns game={game} />
          <CasesPanel game={game} hub={hub} place="street" />
          <Sightings game={game} compact />
        </div>
      );
    case "station":
      return (
        <div className="stack">
          <CustomsCard game={game} />
          <TravelContent game={game} onRead={onRead} />
        </div>
      );
    case "directory":
      return <Directory />;
    case "home":
      return (
        <div className="stack">
          <StashCard game={game} />
          <DogCard game={game} />
        </div>
      );
    case "docks":
      return <Docks game={game} go={(to) => window.dispatchEvent(new CustomEvent("injustice:go", { detail: to }))} />;
  }
}

/** People who think they're being followed. A detective can sit outside and wait. */
function ThreatReports({ game }: { game: GameApi }) {
  const [threats, setThreats] = useState<{ id: string; targetName: string; at: number }[]>([]);
  const load = useCallback(async () => {
    const res = await fetch("/api/city", { cache: "no-store" });
    if (res.ok) setThreats((await res.json()).threats ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  if (!threats.length) return null;
  return (
    <section className="card">
      <h3 className="card-title">👁️ Threat reports</h3>
      <p className="muted fine">People who think someone is casing them. Sit outside their place: if the hitman shows and you spot them, you stop a murder.</p>
      <ul className="officials">
        {threats.map((t) => (
          <li key={t.id}>
            <span>{t.targetName} <span className="muted">· reported {Math.max(1, Math.round((Date.now() - t.at) / 3_600_000))}h ago</span></span>
            <button className="btn btn-primary btn-xs" disabled={game.busy} onClick={async () => { if (await game.social({ op: "stakeout", threatId: t.id }, "/api/city")) load(); }}>
              Stake out (20 energy)
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Stolen army gear a soldier offered you. */
function GunOffers({ game }: { game: GameApi }) {
  const view = game.view!;
  if (!view.gunOffers.length) return null;
  return (
    <section className="card">
      <h3 className="card-title">🪖 Black market</h3>
      <p className="muted fine">Army gear, off the back of a truck. Paid in dirty money first.</p>
      <ul className="officials">
        {view.gunOffers.map((o) => (
          <li key={o.id}>
            <span className="inv-name"><ItemArt id={o.itemId} icon={o.icon} name={o.itemName} className="art-xs" /> {o.itemName} from <b>{o.sellerName}</b> · ${o.price}</span>
            <span className="row">
              <button className="btn btn-primary btn-xs" disabled={game.busy} onClick={() => game.social({ op: "gun_buy", offerId: o.id, sellerId: o.sellerId })}>Buy</button>
              <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.social({ op: "gun_decline", offerId: o.id })}>Pass</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Soldiers on guard outside the bank: every one makes a bank job here harder. */
function GuardCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const [info, setInfo] = useState<{ guards: number; canGuard: string | null } | null>(null);
  const load = useCallback(async () => {
    const res = await fetch("/api/city", { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setInfo({ guards: d.city.guards ?? 0, canGuard: d.city.canGuard ?? null });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const soldier = view.path?.id === "military";
  if (!info || (!soldier && info.guards === 0)) return null;
  return (
    <section className="card">
      <h3 className="card-title"><Shield size={16} /> Guard post</h3>
      <p className="muted">
        {info.guards ? `${info.guards} soldier${info.guards === 1 ? "" : "s"} on guard outside the bank right now. Bank jobs in this city are harder while they're here.` : "Nobody is on guard at the bank."}
      </p>
      {soldier && (
        <>
          <button
            className="btn btn-primary btn-sm"
            disabled={game.busy || !!info.canGuard}
            onClick={async () => {
              if (await game.social({ op: "guard_bank" }, "/api/city")) load();
            }}
          >
            <Shield size={14} /> Stand guard (1 hour, 15 energy)
          </button>
          {info.canGuard && <p className="fine muted">{info.canGuard}</p>}
        </>
      )}
    </section>
  );
}

/** Opens a building from anywhere (toasts, Home buttons): "place:police". */
export function usePlaceState(): [Building | null, (b: Building | null) => void] {
  const [place, setPlace] = useState<Building | null>(null);
  return [place, setPlace];
}
