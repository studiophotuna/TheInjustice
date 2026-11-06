"use client";

import { useCallback, useEffect, useState } from "react";
import { Store } from "lucide-react";
import type { GameApi } from "./useGame";

export interface ShopRow {
  kind: "guns" | "armor" | "diner" | "pharmacy" | "realty";
  name: string;
  icon: string;
  sells: string;
  license: number;
  owner: { id: string; name: string; idle: boolean; since: number } | null;
  markup: number;
  mine: boolean;
  till: number | null;
  sales: number | null;
  earned: number | null;
  lastSaleAt: number | null;
  offers: { fromId: string; fromName: string; amount: number; at: number }[];
  myOffer: number | null;
  buyback: number;
}

export interface ShopsData {
  city: string;
  shops: ShopRow[];
  owned: number;
  maxOwned: number;
  range: { min: number; max: number };
  costShare: number;
  elsewhere: { country: string; city: string; kind: string; name: string; icon: string; till: number; offers: number }[];
}

/** The city's storefronts. Reloads whenever anything changes in the game. */
export function useShops() {
  const [data, setData] = useState<ShopsData | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/shops", { cache: "no-store" });
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
  return { data, load };
}

const pct = (m: number) => Math.round((m - 1) * 100);
const money = (n: number) => `$${n.toLocaleString()}`;

/** Price on the shelf for this player: owners pay the usual price in their own shop. */
export function shelfPrice(local: number, row: ShopRow | undefined): number {
  if (!row?.owner || row.mine) return local;
  return Math.round(local * row.markup);
}

export function shopFor(data: ShopsData | null, itemKind: string): ShopRow | undefined {
  return data?.shops.find((s) => s.sells === itemKind);
}

function PriceTag({ m }: { m: number }) {
  const p = pct(m);
  if (p === 0) return <span className="price-tag even">usual prices</span>;
  return <span className={`price-tag ${p > 0 ? "up" : "down"}`}>prices {p > 0 ? "+" : ""}{p}%</span>;
}

/** A cover photo for each kind of shop, instead of an icon. */
const SHOP_ART: Record<string, string> = { guns: "ironrow", armor: "checkpoint", diner: "oldmarket", pharmacy: "hospital", realty: "highrise" };
const shopArt = (kind: string) => `/scenes/${SHOP_ART[kind] ?? "street"}.jpg`;

/** One line above a shop category: who runs the counter and what that does to prices. */
export function ShopOwnerStrip({ row, onManage }: { row: ShopRow; onManage: () => void }) {
  return (
    <div className={`shop-strip ${row.mine ? "mine" : row.owner ? "run" : ""}`}>
      <img className="shop-strip-icon" src={shopArt(row.kind)} alt="" />
      <span className="shop-strip-text">
        <b>{row.name}</b>
        {row.mine ? (
          <> · <span className="text-green">yours</span>{row.till ? <> · {money(row.till)} in the till</> : null}</>
        ) : row.owner ? (
          <> · run by {row.owner.name} · <PriceTag m={row.markup} /></>
        ) : (
          <> · run by city hall · usual prices</>
        )}
      </span>
      <button className="btn btn-ghost btn-xs" onClick={onManage}>
        {row.mine ? "Manage" : row.owner ? "Details" : "Take it over"}
      </button>
    </div>
  );
}

/** Businesses tab: run a city shop, or bid for one. */
export function CityShops({ game, data, reload }: { game: GameApi; data: ShopsData | null; reload: () => void }) {
  const view = game.view!;
  if (!data) return null;
  const call = async (body: Record<string, unknown>) => {
    const out = await game.social(body, "/api/shops");
    reload();
    return out;
  };
  return (
    <section className="card city-shops" id="city-shops">
      <h3 className="card-title"><Store size={16} /> Shops in {data.city}</h3>
      <p className="muted">
        Every counter in town can be run by a player. The owner sets the prices and keeps what's left after stock
        (about {Math.round((1 - data.costShare) * 100)}% of a sale at usual prices). You run {data.owned} of {data.maxOwned}.
      </p>
      {data.elsewhere.length > 0 && (
        <p className="fine muted">
          Also yours:{" "}
          {data.elsewhere.map((e) => `${e.name} in ${e.city} (${money(e.till)} waiting${e.offers ? `, ${e.offers} offer${e.offers > 1 ? "s" : ""}` : ""})`).join(" · ")}. Travel there to manage it.
        </p>
      )}
      <div className="city-shop-list">
        {data.shops.map((s) => (
          <ShopCard key={s.kind} s={s} data={data} busy={game.busy} bank={view.bank} hasBank={view.hasBankAccount} call={call} />
        ))}
      </div>
    </section>
  );
}

function ShopCard({
  s,
  data,
  busy,
  bank,
  hasBank,
  call,
}: {
  s: ShopRow;
  data: ShopsData;
  busy: boolean;
  bank: number;
  hasBank: boolean;
  call: (b: Record<string, unknown>) => Promise<unknown>;
}) {
  const [markup, setMarkup] = useState(s.markup);
  const [offer, setOffer] = useState(String(Math.round(s.license * 1.2)));
  useEffect(() => setMarkup(s.markup), [s.markup]);
  const kind = s.kind;
  const full = data.owned >= data.maxOwned;

  return (
    <article className={`city-shop ${s.mine ? "mine" : ""}`}>
      <header>
        <img className="city-shop-icon" src={shopArt(s.kind)} alt="" />
        <div>
          <h4>{s.name}</h4>
          <p className="fine muted">
            {s.mine ? "You run it" : s.owner ? <>Run by <b>{s.owner.name}</b>{s.owner.idle ? " · not seen in a week" : ""}</> : "Run by city hall"}
            {s.owner && !s.mine && <> · <PriceTag m={s.markup} /></>}
          </p>
        </div>
      </header>

      {s.mine ? (
        <>
          <div className="till-row">
            <div>
              <span className="crime-label">In the till</span>
              <b className="till-amount">{money(s.till ?? 0)}</b>
              <span className="fine muted">{s.sales ?? 0} sales · {money(s.earned ?? 0)} since you took over</span>
            </div>
            <button className="btn btn-primary btn-sm" disabled={busy || !s.till} onClick={() => call({ op: "collect", kind })}>
              Collect
            </button>
          </div>
          <label className="markup-row">
            <span className="crime-label">Your prices</span>
            <input
              type="range"
              min={Math.round(data.range.min * 100)}
              max={Math.round(data.range.max * 100)}
              step={5}
              value={Math.round(markup * 100)}
              onChange={(e) => setMarkup(Number(e.target.value) / 100)}
              aria-label="Price level"
            />
            <span className="markup-read"><PriceTag m={markup} /></span>
          </label>
          <p className="fine muted">
            {markup < 1
              ? "Undercutting: a thinner margin, but you're the friendly shop in town."
              : markup > 1.25
                ? "Steep. People will grumble, and someone may offer to take it off your hands."
                : "Every sale pays you the difference between the shelf price and the stock cost."}
          </p>
          {markup !== s.markup && (
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => call({ op: "markup", kind, markup })}>
              Set prices
            </button>
          )}
          {s.offers.length > 0 && (
            <ul className="officials offers">
              {s.offers.map((o) => (
                <li key={o.fromId}>
                  <span><b>{o.fromName}</b> offers {money(o.amount)}</span>
                  <span className="row">
                    <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => confirm(`Sell the ${s.name.toLowerCase()} to ${o.fromName} for ${money(o.amount)}?`) && call({ op: "accept", kind, playerId: o.fromId })}>
                      Sell
                    </button>
                    <button className="btn btn-ghost btn-xs" disabled={busy} onClick={() => call({ op: "decline", kind, playerId: o.fromId })}>
                      No
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            className="btn btn-ghost btn-xs city-shop-sell"
            disabled={busy}
            onClick={() => confirm(`Hand the licence back to city hall for ${money(s.buyback)}? Anyone can take it after.`) && call({ op: "sell", kind })}
          >
            Sell back to city hall · {money(s.buyback)}
          </button>
        </>
      ) : !s.owner || s.owner.idle ? (
        <div className="city-shop-actions">
          <p className="fine muted">
            Licence {money(s.license)} from your bank{s.owner?.idle ? `. ${s.owner.name} hasn't been around, so city hall will reassign it` : ""}.
          </p>
          <button
            className="btn btn-primary btn-sm"
            disabled={busy || full || !hasBank || bank < s.license}
            title={full ? `You already run ${data.maxOwned} shops.` : !hasBank ? "Open a bank account first." : bank < s.license ? "Not enough in the bank." : ""}
            onClick={() => call({ op: "buy", kind })}
          >
            Take it over · {money(s.license)}
          </button>
        </div>
      ) : (
        <div className="city-shop-actions">
          {s.myOffer ? (
            <p className="fine">
              Your offer: <b>{money(s.myOffer)}</b>, waiting on {s.owner.name}.{" "}
              <button className="link" disabled={busy} onClick={() => call({ op: "withdraw", kind })}>Withdraw</button>
            </p>
          ) : (
            <p className="fine muted">Want it? Make {s.owner.name} an offer. The money stays in your bank until they say yes.</p>
          )}
          <div className="row offer-row">
            <input inputMode="numeric" value={offer} onChange={(e) => setOffer(e.target.value.replace(/[^0-9]/g, ""))} aria-label="Offer amount" />
            <button
              className="btn btn-ghost btn-sm"
              disabled={busy || full || !hasBank || !Number(offer) || Number(offer) > bank}
              title={full ? `You already run ${data.maxOwned} shops.` : Number(offer) > bank ? "You need that much in the bank." : ""}
              onClick={() => call({ op: "offer", kind, amount: Number(offer) })}
            >
              {s.myOffer ? "Change offer" : "Make offer"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
