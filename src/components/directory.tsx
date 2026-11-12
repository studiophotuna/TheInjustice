"use client";

import { useCallback, useEffect, useState } from "react";
import { BookUser, Flame, Landmark, Scale, ShieldCheck, Stethoscope, Store, Terminal, Wrench } from "lucide-react";
import { PROPERTY_BY_ID } from "@/game/content/properties";
import type { GameApi } from "./useGame";
import { SkelCard, SkelRows } from "./skeleton";

type Base = { id: string; name: string; photo: string | null; online: boolean; away: string | null };
export type MechanicRow = Base & { title: string; rate: number; services: ("repair" | "floor" | "alarm" | "rebuild")[]; jobs: number; block: string | null };
type DirectoryData = {
  city: string;
  bankers: (Base & { fee: number })[];
  lawyers: (Base & { title: string; fee: number })[];
  doctors: (Base & { fee: number })[];
  mechanics: MechanicRow[];
  hackers: (Base & { title: string; fee: number; heat: number; jobs: number; block: string | null })[];
  watchers: (Base & { title: string; fee: number; jobs: number; block: string | null })[];
  inspectors: (Base & { title: string; fee: number; jobs: number; targets: { id: string; block: string | null }[] })[];
  shops: { kind: string; shop: string; icon: string; id: string; name: string; markup: number; online: boolean }[];
};

/** Every player service in this city. Reloads when anything changes. */
export function useDirectory() {
  const [data, setData] = useState<DirectoryData | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/community?directory=1", { cache: "no-store" });
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

const go = (to: string) => window.dispatchEvent(new CustomEvent("injustice:go", { detail: to }));
const pct = (r: number) => {
  const p = Math.round((r - 1) * 100);
  return p === 0 ? "dealer prices" : `${Math.abs(p)}% ${p < 0 ? "under" : "over"} the dealer`;
};
const SERVICE_NAMES = { repair: "repairs", floor: "false floors", alarm: "alarms", rebuild: "rebuilds after fires" };

function Who({ r }: { r: Base }) {
  return (
    <span className="dir-who">
      <span className={`dot ${r.online ? "on" : ""}`} aria-label={r.online ? "Online" : "Offline"} />
      <button className="link" onClick={() => go(`person:${r.id}`)}>{r.name}</button>
      {r.away && <span className="fine muted"> · {r.away}</span>}
    </span>
  );
}

function Section({ icon, title, empty, children, count }: { icon: React.ReactNode; title: string; empty: string; children: React.ReactNode; count: number }) {
  return (
    <section className="card dir-section">
      <h3 className="card-title">{icon} {title}</h3>
      {count ? <ul className="officials dir-list">{children}</ul> : <p className="fine muted">{empty}</p>}
    </section>
  );
}

/** The Directory: who in town will launder, defend, patch up, repair or sell to you. */
export function Directory({ game }: { game: GameApi }) {
  const d = useDirectory();
  if (!d) return <><SkelCard lines={3} /><SkelRows rows={4} /></>;
  return (
    <div className="stack directory">
      <p className="muted fine dir-intro">
        <BookUser size={14} /> Everyone in {d.city} who offers a service, and what they charge. Tap a name to open their file.
      </p>
      <Section icon={<Wrench size={16} />} title="Mechanics" count={d.mechanics.length} empty="No garage open in this city yet. Mechanics open theirs from the Docks.">
        {d.mechanics.map((m) => (
          <li key={m.id}>
            <span className="dir-row">
              <Who r={m} />
              <span className="fine muted">{m.title} · {pct(m.rate)} · {m.services.map((s) => SERVICE_NAMES[s]).join(", ")}{m.jobs ? ` · ${m.jobs} jobs done` : ""}</span>
            </span>
            <button className="btn btn-ghost btn-xs" onClick={() => go("place:docks")}>At the Docks</button>
          </li>
        ))}
      </Section>
      <MyScrub game={game} />
      <Section icon={<Terminal size={16} />} title="Hackers" count={d.hackers.length} empty="No hacker here is taking clients. Pen Testers and up can offer it from the Directory.">
        {d.hackers.map((h) => (
          <li key={h.id}>
            <span className="dir-row">
              <Who r={h} />
              <span className="fine muted">{h.title} · takes {h.heat} heat off your record for ${h.fee.toLocaleString()}{h.jobs ? ` · ${h.jobs} clients` : ""}</span>
            </span>
            <button
              className="btn btn-ghost btn-xs"
              disabled={game.busy || !!h.block}
              title={h.block ?? "Dirty money first, then cash."}
              onClick={() => game.social({ op: "hire_scrub", hackerId: h.id })}
            >
              Scrub my record
            </button>
          </li>
        ))}
      </Section>
      <MyProtect game={game} kind="watch" />
      <Section icon={<ShieldCheck size={16} />} title="Night watch" count={d.watchers.length} empty="No vigilante here is watching homes right now. Vigilantes from rank 2 offer it from the Directory.">
        {d.watchers.map((w) => (
          <li key={w.id}>
            <span className="dir-row">
              <Who r={w} />
              <span className="fine muted">{w.title} · watches your place overnight for ${w.fee.toLocaleString()}: break-ins are harder{w.jobs ? ` · ${w.jobs} night${w.jobs === 1 ? "" : "s"}` : ""}</span>
            </span>
            <button className="btn btn-ghost btn-xs" disabled={game.busy || !!w.block} title={w.block ?? "Cash."} onClick={() => game.social({ op: "hire_watch", vigilanteId: w.id })}>
              Watch my place
            </button>
          </li>
        ))}
      </Section>
      <MyProtect game={game} kind="inspect" />
      <Section icon={<Flame size={16} />} title="Fire inspections" count={d.inspectors.length} empty="No firefighter here is inspecting businesses right now. Firefighters from rank 2 offer it from the Directory.">
        {d.inspectors.map((f) => (
          <li key={f.id}>
            <span className="dir-row">
              <Who r={f} />
              <span className="fine muted">{f.title} · ${f.fee.toLocaleString()} a business: a week of being much harder to set on fire{f.jobs ? ` · ${f.jobs} inspection${f.jobs === 1 ? "" : "s"}` : ""}</span>
            </span>
            {f.targets.length ? (
              <span className="row wrap">
                {f.targets.map((t) => (
                  <button key={t.id} className="btn btn-ghost btn-xs" disabled={game.busy || !!t.block} title={t.block ?? "Cash."} onClick={() => game.social({ op: "hire_inspection", firefighterId: f.id, propertyId: t.id })}>
                    Inspect {PROPERTY_BY_ID[t.id]?.name.toLowerCase() ?? "it"}
                  </button>
                ))}
              </span>
            ) : (
              <span className="fine muted">Nothing of yours here needs it.</span>
            )}
          </li>
        ))}
      </Section>
      <Section icon={<Landmark size={16} />} title="Bankers who launder" count={d.bankers.length} empty="No banker in this city launders for clients right now. Bankers offer it from the Bank.">
        {d.bankers.map((b) => (
          <li key={b.id}>
            <span className="dir-row">
              <Who r={b} />
              <span className="fine muted">Cleans dirty money for a {Math.round(b.fee * 100)}% fee</span>
            </span>
            <button className="btn btn-ghost btn-xs" onClick={() => go("place:bank")}>At the Bank</button>
          </li>
        ))}
      </Section>
      <Section icon={<Scale size={16} />} title="Lawyers" count={d.lawyers.length} empty="No attorneys in this city right now.">
        {d.lawyers.map((l) => (
          <li key={l.id}>
            <span className="dir-row">
              <Who r={l} />
              <span className="fine muted">{l.title} · on retainer for ${l.fee.toLocaleString()} a week</span>
            </span>
            <button className="btn btn-ghost btn-xs" onClick={() => go(`person:${l.id}`)}>Hire</button>
          </li>
        ))}
      </Section>
      <Section icon={<Stethoscope size={16} />} title="Back-alley doctors" count={d.doctors.length} empty="No doctor here treats patients off the books right now.">
        {d.doctors.map((x) => (
          <li key={x.id}>
            <span className="dir-row">
              <Who r={x} />
              <span className="fine muted">Gets you out of the clinic early for ${x.fee.toLocaleString()}, no records</span>
            </span>
            <button className="btn btn-ghost btn-xs" onClick={() => go("place:hospital")}>At the Hospital</button>
          </li>
        ))}
      </Section>
      <Section icon={<Store size={16} />} title="Shops" count={d.shops.length} empty="Every counter in town is still run by city hall. Anyone can take one over from Shop → Businesses.">
        {d.shops.map((s) => {
          const p = Math.round((s.markup - 1) * 100);
          return (
            <li key={s.kind}>
              <span className="dir-row">
                <span className="dir-who">
                  <span className={`dot ${s.online ? "on" : ""}`} /> <b>{s.shop}</b>
                </span>
                <span className="fine muted">Run by {s.name} · {p === 0 ? "usual prices" : `prices ${p > 0 ? "+" : ""}${p}%`}</span>
              </span>
              <button className="btn btn-ghost btn-xs" onClick={() => go("tab:shop")}>Shop</button>
            </li>
          );
        })}
      </Section>
    </div>
  );
}

/** Hackers (Pen Tester and up): offer record scrubs to clients. */
function MyScrub({ game }: { game: GameApi }) {
  const s = game.view!.scrub;
  const [fee, setFee] = useState(String(s?.fee ?? 500));
  if (!s) return null;
  return (
    <section className="card my-scrub">
      <h3 className="card-title"><Terminal size={16} /> Your services</h3>
      <p className="muted fine">Clients pay you to make heat disappear from their police file. You keep the fee (dirty money), and every client counts toward your next promotion.</p>
      <div className="row wrap">
        <input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))} aria-label="Your fee" />
        <button className="btn btn-primary btn-sm" disabled={game.busy || !Number(fee)} onClick={() => game.act({ type: "scrub_set", open: true, fee: Number(fee) })}>
          {s.open ? "Update fee" : "Take clients"}
        </button>
        {s.open && (
          <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "scrub_set", open: false, fee: Number(fee) })}>Stop</button>
        )}
      </div>
      <p className="fine">{s.open ? `Taking clients at $${s.fee.toLocaleString()}.` : "Not taking clients."} {s.jobs} clients so far.</p>
    </section>
  );
}

/** Vigilantes (rank 2+) watch homes; firefighters (rank 2+) inspect businesses. Set a fee, take clients. */
function MyProtect({ game, kind }: { game: GameApi; kind: "watch" | "inspect" }) {
  const view = game.view!;
  const s = kind === "watch" ? view.watchService : view.inspectService;
  const [fee, setFee] = useState(String(s?.fee ?? (kind === "watch" ? 250 : 300)));
  if (!s) return null;
  const type = kind === "watch" ? "watch_set" : "inspect_set";
  return (
    <section className="card my-scrub">
      <h3 className="card-title">{kind === "watch" ? <ShieldCheck size={16} /> : <Flame size={16} />} Your services</h3>
      <p className="muted fine">
        {kind === "watch"
          ? "Homeowners pay you to watch their place overnight: break-ins there are harder for 10 hours. Every night counts toward your next promotion."
          : "Business owners pay you to inspect a business: for a week it's much harder to set on fire. Every inspection counts toward your next promotion."}
      </p>
      <div className="row wrap">
        <input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))} aria-label="Your fee" />
        <button className="btn btn-primary btn-sm" disabled={game.busy || !Number(fee)} onClick={() => game.act({ type, open: true, fee: Number(fee) })}>
          {s.open ? "Update fee" : "Take clients"}
        </button>
        {s.open && (
          <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type, open: false, fee: Number(fee) })}>Stop</button>
        )}
      </div>
      <p className="fine">{s.open ? `Taking clients at $${s.fee.toLocaleString()}${kind === "inspect" ? " a business" : " a night"}.` : "Not taking clients."} {s.jobs} {kind === "watch" ? (s.jobs === 1 ? "night" : "nights") : s.jobs === 1 ? "inspection" : "inspections"} so far.</p>
    </section>
  );
}
