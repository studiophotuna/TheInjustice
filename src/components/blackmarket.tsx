"use client";

import { useCallback, useEffect, useState } from "react";
import { RARITY, type Rarity } from "@/game/stock";
import { ItemArt } from "./art/ItemArt";
import type { GameApi } from "./useGame";

interface MarketData {
  city: string;
  cut: number;
  listings: { id: string; itemId: string; name: string; icon: string; slot: string; rarity: Rarity; from: string | null; price: number; seller: string; mine: boolean; block: string | null }[];
  sellable: { id: string; name: string; rarity: Rarity; spares: number; shopPrice: number; min: number; max: number }[];
  mine: number;
  maxMine: number;
}

export function RarityTag({ rarity }: { rarity: Rarity }) {
  return <span className={`rarity rarity-${rarity}`}>{RARITY[rarity].name}</span>;
}

/** The back room on The Street: weapons and armor for dirty money, no receipts. */
export function BlackMarket({ game }: { game: GameApi }) {
  const view = game.view!;
  const [data, setData] = useState<MarketData | null>(null);
  const [pick, setPick] = useState("");
  const [price, setPrice] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/market", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* keep what we had */
    }
  }, []);
  useEffect(() => {
    load();
  }, [load, view.location.country]);

  const act = async (body: Record<string, unknown>) => {
    if (await game.social(body, "/api/market")) load();
  };
  if (!data) return null;
  const chosen = data.sellable.find((s) => s.id === pick) ?? null;

  return (
    <section className="card">
      <h3 className="card-title">Black market · {data.city}</h3>
      <p className="muted fine">Weapons and armor from any city, for cash or dirty money. Sellers are paid in dirty money; the fence keeps {Math.round(data.cut * 100)}%.</p>
      {data.listings.length === 0 && <p className="muted">Nothing on the table right now.</p>}
      <div className="bm-list">
        {data.listings.map((l) => (
          <article key={l.id} className="bm-row">
            <ItemArt id={l.itemId} icon={l.icon} name={l.name} className="art-xs" />
            <div className="bm-info">
              <b>{l.name}</b>
              <span className="fine muted">
                <RarityTag rarity={l.rarity} /> {l.from ? `from ${l.from} · ` : ""}{l.mine ? "yours" : l.seller}
              </span>
              {l.block && !l.mine && <span className="fine muted">{l.block}</span>}
            </div>
            {l.mine ? (
              <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => act({ op: "unlist", id: l.id })}>
                Take back
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" disabled={game.busy || !!l.block} title={l.block ?? ""} onClick={() => act({ op: "buy", id: l.id })}>
                ${l.price.toLocaleString()}
              </button>
            )}
          </article>
        ))}
      </div>

      <h4 className="bm-sub">Sell a piece</h4>
      {data.sellable.length === 0 ? (
        <p className="muted fine">Only spares and unused pieces sell. Buy a second one, or carry one in from another city.</p>
      ) : (
        <div className="bm-sell">
          <select value={pick} onChange={(e) => { setPick(e.target.value); const s = data.sellable.find((x) => x.id === e.target.value); setPrice(s ? String(s.shopPrice) : ""); }} aria-label="Piece to sell">
            <option value="">Choose a piece</option>
            {data.sellable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({RARITY[s.rarity].name}{s.spares ? `, ${s.spares} spare${s.spares === 1 ? "" : "s"}` : ""})
              </option>
            ))}
          </select>
          <input type="number" inputMode="numeric" placeholder="Your price" value={price} min={chosen?.min} max={chosen?.max} onChange={(e) => setPrice(e.target.value)} aria-label="Asking price" />
          <button
            className="btn btn-ghost btn-sm"
            disabled={game.busy || !chosen || !Number(price) || data.mine >= data.maxMine}
            title={data.mine >= data.maxMine ? `You can have ${data.maxMine} pieces on offer here.` : ""}
            onClick={() => act({ op: "list", itemId: pick, price: Number(price) }).then(() => { setPick(""); setPrice(""); })}
          >
            Put it up
          </button>
          {chosen && <p className="fine muted bm-range">Shop price ${chosen.shopPrice.toLocaleString()}. Ask ${chosen.min.toLocaleString()} to ${chosen.max.toLocaleString()}.</p>}
        </div>
      )}
    </section>
  );
}
