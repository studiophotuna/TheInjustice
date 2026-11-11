"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Zap } from "lucide-react";
import type { GameApi } from "./useGame";
import { askThen } from "./ask";

type CustomsData = {
  onDuty: number;
  officers: string[];
  forSale: { id: string; name: string; price: number; paid: boolean; until: number }[];
  mine: number | null;
  myPrice: number | null;
  myPasses: number;
  eligible: boolean;
  block: string | null;
  seizures: number;
  shiftMinutes: number;
  energy: number;
  bountyPct: number;
};

/** Who's on customs duty in this city (from City Hall's data). */
export function useCustoms() {
  const [data, setData] = useState<CustomsData | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/city", { cache: "no-store" });
      if (res.ok) setData((await res.json()).customs ?? null);
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

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** A heads-up for anyone about to travel with something to hide, and who can be persuaded. */
export function CustomsLine({ game }: { game: GameApi }) {
  const d = useCustoms();
  if (!d) return null;
  return (
    <div className="customs-block">
      <p className={`fine customs-line ${d.onDuty ? "manned" : ""}`}>
        <ShieldCheck size={13} />{" "}
        {d.onDuty
          ? `Customs is on duty: ${d.officers.join(", ")}. More stops, and real eyes doing the searching.`
          : "Nobody is on customs duty right now. Just the usual guards."}
      </p>
      {d.forSale.length > 0 && (
        <ul className="officials bribe-list">
          {d.forSale.map((o) => (
            <li key={o.id}>
              <span className="fine">
                {o.paid ? (
                  <><b>{o.name}</b> will wave you through until {time(o.until)}.</>
                ) : (
                  <>Word is <b>{o.name}</b> doesn&apos;t look in trunks for <b>${o.price.toLocaleString()}</b>.</>
                )}
              </span>
              {!o.paid && (
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={game.busy || game.view!.dirty + game.view!.cash < o.price}
                  title="Dirty money first, then cash. Good for the rest of their shift."
                  onClick={() => askThen({ title: `Slip ${o.name} $${o.price.toLocaleString()} to look the other way?`, tone: "danger" }, () => game.social({ op: "customs_bribe", playerId: o.id }, "/api/city"))}
                >
                  Slip an envelope
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** An officer on duty: take money to look the other way, or don't. */
function PriceControl({ game, d }: { game: GameApi; d: CustomsData }) {
  const [price, setPrice] = useState(String(d.myPrice ?? 500));
  return (
    <div className="bribe-control">
      {d.myPrice ? (
        <p className="fine text-red">
          You&apos;re waving people through for ${d.myPrice.toLocaleString()}{d.myPasses ? ` (${d.myPasses} paid so far)` : ""}. Internal affairs can find every envelope.
        </p>
      ) : (
        <p className="fine muted">Some officers take envelopes to look the other way. It pays well, until internal affairs comes asking.</p>
      )}
      <div className="row wrap">
        <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} aria-label="Your price" />
        <button className="btn btn-ghost btn-xs" disabled={game.busy || !Number(price)} onClick={() => game.social({ op: "customs_price", price: Number(price) }, "/api/city")}>
          {d.myPrice ? "Change price" : "Take envelopes"}
        </button>
        {d.myPrice && (
          <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.social({ op: "customs_price", price: null }, "/api/city")}>Stay clean</button>
        )}
      </div>
    </div>
  );
}

/** The Station: officers take a customs shift here. Everyone sees whether it's manned. */
export function CustomsCard({ game }: { game: GameApi }) {
  const d = useCustoms();
  if (!d) return null;
  if (!d.eligible) return <CustomsLine game={game} />;
  return (
    <section className="card customs-card">
      <h3 className="card-title"><ShieldCheck size={16} /> Customs desk</h3>
      <p className="muted fine">
        Take a {d.shiftMinutes}-minute shift on the checkpoints out of the city. While you're on duty, more drivers get stopped, you do the searching
        (sharp eyes find more), and the station checks more bags. You keep a {d.bountyPct}% bounty on every seizure, and it counts toward your next
        promotion.
      </p>
      <p className="fine">
        {d.onDuty ? `On duty now: ${d.officers.join(", ")}.` : "Nobody is on duty right now."} {d.seizures ? `Your seizures so far: ${d.seizures}.` : ""}
      </p>
      {d.mine ? (
        <>
          <div className="row wrap">
            <span className="chip chip-green">On duty until {time(d.mine)}</span>
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.social({ op: "customs_off" }, "/api/city")}>End shift</button>
          </div>
          <PriceControl game={game} d={d} />
        </>
      ) : (
        <button className="btn btn-primary btn-sm" disabled={game.busy || !!d.block} title={d.block ?? ""} onClick={() => game.social({ op: "customs_duty" }, "/api/city")}>
          Take a shift · <Zap size={13} className="zap-inline" />{d.energy}
        </button>
      )}
    </section>
  );
}
