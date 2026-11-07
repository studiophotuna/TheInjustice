"use client";

import { useCallback, useEffect, useState } from "react";
import { CarPhoto } from "./art/CarPhoto";
import { CarFront, DoorOpen } from "lucide-react";
import type { GameApi } from "./useGame";

type HomeRow = { id: string; name: string; photo: string | null; home: string; tier: number; alarm: boolean; dog: boolean; inTown: boolean; block: string | null; crewJob: string | null };
type CarRow = { ownerId: string; ownerName: string; carId: string; model: string; name: string; color: string; block: string | null };

/** Homes and parked cars in this city that belong to someone else. */
function useProperty() {
  const [data, setData] = useState<{ homes: HomeRow[]; cars: CarRow[]; crewLeader: boolean } | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/community?property=1", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* keep what we had */
    }
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("conspira:changed", load);
    return () => window.removeEventListener("conspira:changed", load);
  }, [load]);
  return data;
}

/** The Street: other people's homes. Best hit when they're out of town. */
export function BreakIns({ game }: { game: GameApi }) {
  const data = useProperty();
  const view = game.view!;
  if (!data) return null;
  return (
    <section className="card breakins">
      <h3 className="card-title"><DoorOpen size={16} /> Homes in {view.location.city}</h3>
      <p className="muted fine">
        Whatever people hide at home is there for the taking, if you get in. Bigger places have better locks, an alarm sticker means a camera, a dog means noise,
        and someone who&apos;s home will see your face. A break-in opens a case file like any other crime. Crew leaders can plan a crew job on the big places.
      </p>
      {data.homes.length === 0 ? (
        <p className="fine muted">Nobody else keeps a place in this city yet.</p>
      ) : (
        <ul className="officials home-list">
          {data.homes.map((h) => (
            <li key={h.id}>
              <span className="home-row">
                <b>{h.name}</b>
                <span className="fine muted">
                  {h.home}
                  {h.alarm ? " · alarm sticker" : ""}
                  {h.dog ? " · a dog behind the door" : ""} · {h.inTown ? "lights on" : "dark windows"}
                </span>
              </span>
              <span className="row">
                {data.crewLeader && h.tier >= 3 && (
                  <button
                    className="btn btn-danger btn-xs"
                    disabled={game.busy || !!h.crewJob}
                    title={h.crewJob ?? "Plan a crew job: roles, a bigger haul, and a crew to watch your back."}
                    onClick={async () => {
                      await game.social({ op: "heist_plan", targetId: h.id });
                      window.dispatchEvent(new CustomEvent("injustice:go", { detail: "people:crew" }));
                    }}
                  >
                    Crew job
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={game.busy || !!h.block}
                  title={h.block ?? ""}
                  onClick={() => game.social({ op: "burgle", targetId: h.id })}
                >
                  Break in
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The Docks: other people's cars parked in this city. */
export function ParkedCars({ game }: { game: GameApi }) {
  const data = useProperty();
  if (!data) return null;
  return (
    <section className="card">
      <h3 className="card-title"><CarFront size={16} /> Parked around town</h3>
      <p className="muted fine">
        Cars other people left here, and whatever is in their trunks. A stolen car comes with hot plates: change them before a checkpoint runs
        them, or sell it to the chop shop.
      </p>
      {data.cars.length === 0 ? (
        <p className="fine muted">No one else has a car parked in this city.</p>
      ) : (
        <div className="lot">
          {data.cars.map((c) => (
            <article key={c.carId} className="lot-car">
              <CarPhoto model={c.model} className="garage-art" />
              <div>
                <b>{c.name}</b>
                <p className="fine muted">{c.ownerName}&apos;s</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                disabled={game.busy || !!c.block}
                title={c.block ?? ""}
                onClick={() => game.social({ op: "steal_car", targetId: c.ownerId, carId: c.carId })}
              >
                Steal
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
