"use client";

import { motionChoice, setMotion } from "./motion";
import { GEAR_HOME, rarityOf, soldIn } from "@/game/stock";
import { RarityTag } from "./blackmarket";
import { GEAR } from "@/game/gear";
import { careerStill } from "./art/Cutout";
import { CarPhoto } from "./art/CarPhoto";
import { DeleteAccount, HelpLinks } from "./legal";
import { AlertsCard } from "./alerts";
import { StyleShop } from "./style";
import { StoryLine } from "./storyline";
import { Hero } from "./homekit";
import { ItemArt } from "./art/ItemArt";
import { ProfileEditor } from "./ProfileEditor";
import { CityHall } from "./cityhall";
import { CityShops, ShopOwnerStrip, shelfPrice, shopFor, useShops } from "./shops";
import { motion } from "motion/react";
import {
  Clock,
  GraduationCap,
  Globe2,
  MailOpen,
  MapPin,
  Building,
  KeyRound,
  Home,
  Flame,
  Gift,
  ClipboardCheck,
  Dumbbell as DumbbellIcon,
  Shield,
  Wind,
  BookOpen,
  Dumbbell,
  Eye,
  Landmark,
  Lock,
  LogOut,
  Skull,
  Sparkles,
  Stethoscope,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { JobView, PublicView } from "@/game/view";
import { Skyline } from "./art/Skyline";
import { Scene, type CharacterKind, type SceneKind } from "./art/Scenes";

/** Districts drawn as full illustrated scenes (the rest use their animated skyline). */
const DISTRICT_SCENES: Partial<Record<string, { scene: SceneKind; chars: { kind: CharacterKind; x: number; scale?: number }[] }>> = {
  // Every district has its own footage, never shared with a building or another district.
  gutter: { scene: "gutter", chars: [] },
  old_market: { scene: "oldmarket", chars: [] },
  southside: { scene: "southside", chars: [] },
  iron_row: { scene: "ironrow", chars: [] },
  precinct_square: { scene: "precinct", chars: [] },
  st_brigids: { scene: "stbrigids", chars: [] },
  courthouse_hill: { scene: "courthousehill", chars: [] },
  boardwalk: { scene: "boardwalk", chars: [] },
  casino_strip: { scene: "casino", chars: [] },
  marina: { scene: "marina", chars: [] },
  exchange: { scene: "exchange", chars: [] },
  rail_yards: { scene: "railyards", chars: [] },
  checkpoint_row: { scene: "checkpoint", chars: [] },
  foundry: { scene: "foundry", chars: [] },
  undercity: { scene: "undercity", chars: [] },
  glass_quarter: { scene: "highrise", chars: [] },
  tech_park: { scene: "techpark", chars: [] },
};
import { Vehicle } from "./art/Vehicles";
import { NpcPortrait, PATH_LOOKS, PlayerAvatar } from "./art/Portraits";

/** Vague hints only: what kind of person each contact is looking for. */
const CAREER_HINTS = [
  { id: "vigilante", name: "Vigilante", side: "Law", contact: "silas", hint: "Look out for the people of Southside, and keep your conscience clean." },
  { id: "enforcer", name: "Mafia", side: "Street", contact: "kozak", hint: "Do muscle work for shady people. Win some fights." },
  { id: "mechanic", name: "Mechanic", side: "Law", contact: "dobrev", hint: "Lend a hand at Dobrev's garage in Iron Row, Grayhaven. Good hands get noticed." },
];
import { AuthForm } from "./screens";
import { fmt, type GameApi } from "./useGame";
import { SkelCard } from "./skeleton";
import { askNumberThen, askThen } from "./ask";

const list = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// ─── Jobs ──────────────────────────────────────────────────────────────────

export function JobsTab({ game, highlight }: { game: GameApi; highlight: string | null }) {
  const view = game.view!;
  const energy = game.live!.energy;
  const blocked = game.busy || game.live!.hospital > 0 || !!view.travel;
  const careerJobs = view.jobs.filter((j) => j.pathJob);
  // One district at a time keeps the page short; default to the best open one.
  const [district, setDistrict] = useState<string | null>(null);
  const best = view.jobs.find((j) => j.id === view.recommendedJobId)?.district;
  const shown =
    view.districts.find((d) => d.id === district) ??
    view.districts.find((d) => d.id === best && !d.locked) ??
    view.districts.find((d) => !d.locked) ??
    view.districts[0];
  // A job deep link (pop-up "Go") opens its district.
  useEffect(() => {
    const target = highlight ? view.jobs.find((j) => j.id === highlight) : null;
    if (target && !target.pathJob) setDistrict(target.district);
  }, [highlight, view.jobs]);

  return (
    <div className="stack">
      {view.path && careerJobs.length > 0 && (
        <>
          <CareerTrack game={game} />
          <motion.div className="cover-grid" variants={list} initial="hidden" animate="show">
            {withCovers(careerJobs.sort((a, b) => Number(!!a.locked) - Number(!!b.locked) || b.pay[1] - a.pay[1]), view.path?.id).map(([j, cover], i) => (
              <JobCard key={j.id} job={j} cover={cover} big={i === 0 && !j.locked} energy={energy} blocked={blocked} best={j.id === view.recommendedJobId} flash={j.id === highlight} onWork={() => game.act({ type: "job", jobId: j.id })} />
            ))}
          </motion.div>
        </>
      )}
      <ServiceCard game={game} />
      <div className="district-chips" role="tablist">
        {view.districts.map((d) => (
          <button key={d.id} role="tab" aria-selected={d.id === shown?.id} className={`chip-btn ${d.id === shown?.id ? "on" : ""}`} onClick={() => setDistrict(d.id)}>
            {d.locked && <Lock size={11} />} {d.name}
          </button>
        ))}
      </div>
      {shown && [shown].map((d) => {
        const jobs = view.jobs.filter((j) => j.district === d.id && !j.pathJob && !d.locked);
        return (
          <section key={d.id} className={`district ${d.locked ? "is-locked" : ""}`}>
            <div className="district-hero">
              {DISTRICT_SCENES[d.id] ? (
                <Scene kind={DISTRICT_SCENES[d.id]!.scene} characters={DISTRICT_SCENES[d.id]!.chars} />
              ) : (
                <Skyline district={d.id} rain={d.id === "gutter" || d.id === "rail_yards"} />
              )}
              <div className="district-title">
                <h2>{d.name}</h2>
                <p>{d.locked ? <><Lock size={13} /> {d.locked}</> : d.tagline}</p>
              </div>
            </div>
            {jobs.length > 0 && (
              <motion.div className="cover-grid" variants={list} initial="hidden" animate="show">
                {withCovers(jobs, view.path?.id).map(([j, cover]) => (
                  <JobCard key={j.id} job={j} cover={cover} big={false} energy={energy} blocked={blocked} best={j.id === view.recommendedJobId} flash={j.id === highlight} onWork={() => game.act({ type: "job", jobId: j.id })} />
                ))}
              </motion.div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** District photo behind each job, where the file name differs from the district id. */
const DISTRICT_SCENE: Record<string, string> = { precinct_square: "precinct", casino_strip: "casino", checkpoint_row: "checkpoint", glass_quarter: "highrise" };

/**
 * Cover art for a job, until each job has its own. Career work shows that career at the job's
 * rank (so the picture also says how senior the work is); street work shows a scene for the kind
 * of work. Stand-ins from the existing licensed library, see docs and the art matrix.
 */
const TAG_SCENES: Record<string, string[]> = {
  Crime: ["gutter", "ironrow", "street"], Corrupt: ["exchange", "casino", "court"], Hustle: ["oldmarket", "casino", "street"],
  Muscle: ["street", "undercity", "railyards"], Action: ["street", "undercity", "railyards"], Pressure: ["ironrow", "gutter", "casino"],
  Study: ["academy", "techpark", "court"], Training: ["academy", "checkpoint", "foundry"], Watch: ["city", "station", "highrise"],
  Legwork: ["city", "station", "oldmarket"], Patrol: ["precinct", "city", "street"], Investigation: ["crimescene", "precinct", "interrogation"],
  Work: ["oldmarket", "foundry", "railyards"], Labor: ["foundry", "railyards", "marina"], Scavenging: ["gutter", "railyards", "undercity"],
  Talk: ["oldmarket", "exchange", "casino"], Errand: ["exchange", "city", "oldmarket"], Care: ["hospital", "stbrigids"], Medicine: ["hospital", "stbrigids"],
  Finance: ["exchange", "bank"], Tech: ["techpark"], Garage: ["foundry", "marina"], Security: ["checkpoint", "bank"], Rescue: ["foundry"],
  Command: ["checkpoint", "highrise"], Lead: ["highrise", "exchange"], Operations: ["checkpoint"], Law: ["court", "courthousehill"], "Street justice": ["undercity", "gutter"],
};
const hashOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function coverOptions(j: JobView, path: string | null | undefined): string[] {
  if (j.pathJob && path) {
    const own = careerStill(path, j.level);
    const next = careerStill(path, Math.min(8, j.level + 1));
    const prev = careerStill(path, Math.max(1, j.level - 1));
    return [own, next, prev].filter((x): x is string => !!x);
  }
  const district = `/scenes/${DISTRICT_SCENE[j.district] ?? j.district.replace(/_/g, "")}.jpg`;
  const pool = (TAG_SCENES[j.tag.split(" · ")[0]] ?? []).map((s) => `/scenes/${s}.jpg`);
  const start = hashOf(j.id) % Math.max(1, pool.length);
  return [...pool.slice(start), ...pool.slice(0, start), district];
}

/** Each job with its cover, never the same picture as the card before it. */
function withCovers(jobs: JobView[], path: string | null | undefined): [JobView, string][] {
  const out: [JobView, string][] = [];
  for (const j of jobs) {
    const opts = coverOptions(j, path);
    const prev = out.length ? out[out.length - 1][1] : null;
    out.push([j, opts.find((o) => o !== prev) ?? opts[0]]);
  }
  return out;
}

/** The career track: where you stand, your rank photo, and the road to the top. (Direction B.) */
function CareerTrack({ game }: { game: GameApi }) {
  const view = game.view!;
  const path = view.path!;
  const ladder = view.ladder;
  const photo = view.profile.photo ?? careerStill(path.id, ladder?.current);
  return (
    <section className="card track" style={{ ["--path" as string]: PATH_LOOKS[path.id].rim }}>
      <div className="track-art" style={{ backgroundImage: `url(/scenes/${ME_SCENE[path.id] ?? "street"}.jpg)` }}>
        <div className="track-rank">
          <span className="label tone-amber-t">{path.name}{ladder ? ` · rank ${ladder.current} of ${ladder.ranks.length}` : ""}</span>
          <h2>{path.rank}</h2>
        </div>
        {photo && <div className="track-photo"><img src={photo} alt="" /></div>}
      </div>
      <div className="track-body">
        {ladder && (
          <div className="track-steps">
            {ladder.ranks.map((r, i) => (
              <span key={r} className={i + 1 < ladder.current ? "done" : i + 1 === ladder.current ? "now" : ""}>{r}</span>
            ))}
          </div>
        )}
        {path.promotion && <p className="track-note">{path.promotion}</p>}
        <PromoBar game={game} />
      </div>
    </section>
  );
}

function JobCard({ job, cover, big, energy, blocked, best, flash, onWork }: {
  job: JobView; cover: string; big: boolean; energy: number; blocked: boolean; best: boolean; flash: boolean; onWork: () => void;
}) {
  const tired = energy < job.energy;
  const marks = [job.grade, job.risky && !job.grade ? "Risky" : null, job.crime ? "Shady" : null].filter(Boolean).join(" · ");
  return (
    <motion.article id={`job-${job.id}`} variants={item} className={`jcard ${big ? "big" : ""} ${job.pathJob ? "job-path" : ""} ${flash ? "flash" : ""} ${job.locked ? "job-locked" : ""}`}>
      <div className="jcard-art" style={{ backgroundImage: `url(${cover})` }}>
        <div className="jcard-tags">
          {marks && <span className={`jcard-tag ${job.crime ? "shady" : "risky"}`}>{marks}</span>}
          {best && <span className="jcard-tag best">Best now</span>}
          {job.fresh && <span className="jcard-tag new">New</span>}
        </div>
        <h3>{job.name}</h3>
      </div>
      <div className="jcard-foot">
        {big && <span className="jcard-kind">{job.tag}</span>}
        <span className="job-pay">${job.pay[0]}–{job.pay[1]}</span>
        <motion.button whileTap={{ scale: 0.92 }} className="btn btn-primary btn-sm jcard-go" disabled={blocked || tired || !!job.locked} onClick={onWork} aria-label={`${job.name}: ${job.energy} energy`}>
          <Zap size={13} /> {job.energy}
        </motion.button>
      </div>
      {job.locked && <p className="job-lock jcard-lock"><Lock size={12} /> {job.locked}</p>}
    </motion.article>
  );
}

// ─── Fight ─────────────────────────────────────────────────────────────────

export function FightTab({ game }: { game: GameApi }) {
  const view = game.view!;
  const blocked = game.busy || game.live!.hospital > 0;
  return (
    <div className="stack">
      <GymCard game={game} />
      <div className="callout glass">
        <Eye size={18} />
        <p>
          Nobody wears their strength on their sleeve. Size them up from who they are and what they do.{" "}
          <b className="text-red">Losing badly to someone far stronger can kill you.</b>
        </p>
      </div>
      <motion.div className="fight-grid" variants={list} initial="hidden" animate="show">
        {view.fights.map((n) => (
          <motion.article key={n.id} variants={item} className={`fighter ${n.locked ? "is-locked" : ""}`}>
            <NpcPortrait id={n.id} className="fighter-portrait" />
            <div className="fighter-body">
              <h3>{n.name}</h3>
              <p className="muted">{n.description}</p>
              {n.locked ? (
                <p className="job-lock"><Lock size={12} /> {n.locked}</p>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  className="btn btn-danger btn-sm"
                  disabled={blocked || game.live!.energy < view.fightEnergy || view.hp < 20}
                  onClick={() => game.act({ type: "fight", npcId: n.id })}
                >
                  <Swords size={14} /> {view.hp < 20 ? "Too hurt" : `Fight · ${view.fightEnergy} energy`}
                </motion.button>
              )}
            </div>
          </motion.article>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Shop ──────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = { food: "Food", housing: "Housing", weapon: "Weapon", armor: "Armor", medical: "Medical" };

const SHOP_CATS = [
  { id: "supplies", label: "Supplies", kinds: ["food", "medical"] },
  { id: "weapon", label: "Weapons", kinds: ["weapon"] },
  { id: "armor", label: "Armor", kinds: ["armor"] },
  { id: "housing", label: "Housing", kinds: ["housing"] },
  { id: "business", label: "Businesses", kinds: [] },
  { id: "style", label: "Style", kinds: [] },
] as const;

/** A Shop category asked for by a link ("shop:housing"), picked up when the Shop opens. */
let wantedShopCat: string | null = null;
export function requestShopCat(id: string) {
  wantedShopCat = id;
  window.dispatchEvent(new CustomEvent("conspira:shopcat", { detail: id }));
}

export function ShopTab({ game }: { game: GameApi }) {
  const view = game.view!;
  const [cat, setCat] = useState<(typeof SHOP_CATS)[number]["id"]>(() => {
    const want = wantedShopCat;
    wantedShopCat = null;
    return (SHOP_CATS.find((c) => c.id === want)?.id ?? "supplies") as (typeof SHOP_CATS)[number]["id"];
  });
  useEffect(() => {
    const on = (e: Event) => {
      const want = (e as CustomEvent<string>).detail;
      if (SHOP_CATS.some((c) => c.id === want)) {
        wantedShopCat = null;
        setCat(want as (typeof SHOP_CATS)[number]["id"]);
      }
    };
    window.addEventListener("conspira:shopcat", on);
    return () => window.removeEventListener("conspira:shopcat", on);
  }, []);
  const kinds = SHOP_CATS.find((c) => c.id === cat)!.kinds as readonly string[];
  const shops = useShops();
  const mineWaiting = shops.data?.shops.some((s) => s.mine && ((s.till ?? 0) > 0 || s.offers.length > 0)) ?? false;
  const waiting = view.properties.some((p) => p.owned && p.waiting >= 1) || mineWaiting;
  const counters = (shops.data?.shops ?? []).filter((s) => kinds.includes(s.sells));
  const manage = () => {
    setCat("business");
    setTimeout(() => document.getElementById("city-shops")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  return (
    <div className="stack">
      <div className="segmented shop-cats" role="tablist">
        {SHOP_CATS.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
            {c.label}
            {c.id === "business" && waiting && <span className="badge-dot" />}
          </button>
        ))}
      </div>
      {cat === "style" && <StyleShop game={game} />}
      {cat === "business" && <CityShops game={game} data={shops.data} reload={shops.load} />}
      {cat !== "business" && cat !== "style" && counters.length > 0 && (
        <div className="shop-strips">
          {counters.map((s) => <ShopOwnerStrip key={s.kind} row={s} onManage={manage} />)}
        </div>
      )}
      {cat === "business" && (
      <section className="card">
        <h3 className="card-title"><Building size={16} /> Businesses</h3>
        <p className="muted">Buy a business with money from your bank. It earns every hour (up to a day's worth waits for you). You must be in its country to buy it.</p>
        <div className="properties">
          {view.properties.map((pr) => (
            <article key={pr.id} className={`property ${pr.owned ? "owned" : ""}`}>
              <ItemArt id={pr.id} icon={pr.icon} name={pr.name} price={pr.price} className="shop-art" />
              <div className="shop-body">
                <span className="chip">{pr.city}</span>
                <h3>{pr.name}</h3>
                <p className="muted">{pr.description}</p>
                <p className="property-income">≈ ${pr.incomePerHour}/hour</p>
              </div>
              {pr.owned && pr.closedUntil ? (
                <p className="fine text-red">Burned out. Reopens in {Math.ceil((pr.closedUntil - Date.now()) / 3_600_000)}h.</p>
              ) : pr.owned ? (
                <button className="btn btn-primary btn-sm" disabled={game.busy || pr.waiting < 1} onClick={() => game.act({ type: "collect_property", id: pr.id })}>
                  Collect ${pr.waiting}
                </button>
              ) : (
                <button className="btn btn-ghost btn-sm" disabled={game.busy || !pr.buyable || view.bank < pr.price} onClick={() => game.act({ type: "buy_property", id: pr.id })}>
                  Buy · ${pr.price.toLocaleString()}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
      )}
      {cat !== "business" && (
    <motion.div key={cat} className="shop-grid" variants={list} initial="hidden" animate="show">
      {view.shop.filter((i) => kinds.includes(i.kind) && (!GEAR_HOME[i.id] || GEAR_HOME[i.id] === view.location.country)).map((i) => {
        const row = shopFor(shops.data, i.kind);
        const price = shelfPrice(i.price, row);
        // In your own shop you pay the usual price; your customers pay yours.
        const theirs = row?.mine && row.markup !== 1 ? Math.round(i.price * row.markup) : null;
        // Weapons and armor: each city sells its own, in limited stock.
        const home = GEAR_HOME[i.id];
        const away = home && home !== view.location.country ? soldIn(i.id) : null;
        const left = home && !away ? (shops.data?.stock?.[i.id] ?? null) : null;
        const soldOut = left === 0;
        return (
        <motion.article key={i.id} variants={item} className={`shop-item ${i.owned ? "owned" : ""}`}>
          <ItemArt id={i.id} icon={i.icon} name={i.name} price={price} className="shop-art" />
          <div className="shop-body">
            {home ? <RarityTag rarity={rarityOf(i.id)} /> : <span className="chip">{KIND_LABEL[i.kind]}</span>}
            <h3>{i.name}</h3>
            <p className="muted">{i.description}</p>
            {left !== null && <p className={`fine stock-note ${soldOut ? "out" : ""}`}>In stock: {left}{soldOut ? " · next shipment soon" : ""}</p>}
            {i.have > 0 && <p className="fine muted">You own {i.have} of {GEAR.maxOwned}</p>}
            {theirs !== null && <p className="fine shop-theirs">Your customers pay ${theirs.toLocaleString()}</p>}
          </div>
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="btn btn-primary btn-sm"
            disabled={game.busy || i.owned || view.cash < price || !!away || soldOut}
            onClick={() => game.act({ type: "buy", itemId: i.id, maxPrice: price }).then(() => shops.load())}
          >
            {i.owned ? (i.have ? "Full" : "Owned") : away ? "Elsewhere" : soldOut ? "Sold out" : view.gear.some((g) => g.id === i.id && g.broken) ? `Replace $${price.toLocaleString()}` : `$${price.toLocaleString()}`}
          </motion.button>
        </motion.article>
        );
      })}
    </motion.div>
      )}
      </div>
  );
}

// ─── Gear ──────────────────────────────────────────────────────────────────

/** Weapon and armor slots: only what's equipped counts, and it wears out with every fight. */
export function GearCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const go = (to: string) => window.dispatchEvent(new CustomEvent("injustice:go", { detail: to }));
  // What's carried and worn first, then the rest.
  const gear = [...view.gear].sort((a, b) => Number(b.equipped) - Number(a.equipped));
  return (
    <section className="card gear loadout">
      <h3 className="card-title">Loadout<span className="title-aside">What counts in a fight</span></h3>
      {gear.length === 0 ? (
        <p className="muted fine">Nothing yet. Fists and luck. Only what you carry and wear counts in a fight, and nothing gets repaired.</p>
      ) : (
        <div className="slot-list">
          {gear.map((g) => (
            <div key={g.id} className={`slot-tile ${g.broken ? "broken" : ""}`}>
              <ItemArt id={g.id} icon={g.icon} name={g.name} className="slot-art" />
              <div className="slot-body">
                <b>{g.name}</b>
                <div className="slot-meta">
                  {!g.issued && GEAR_HOME[g.id] && <RarityTag rarity={rarityOf(g.id)} />}
                  {g.equipped && !g.broken && <i className="slot-bar"><span style={{ width: `${g.condition}%` }} className={g.condition <= 25 ? "low" : ""} /></i>}
                  <span>{g.broken ? "Broken" : `${g.condition}% condition`}{g.spares ? ` · ${g.spares} spare${g.spares === 1 ? "" : "s"}` : ""}{g.issued ? " · issued" : ""}</span>
                </div>
              </div>
              {g.issued && g.broken ? (
                <button className="btn btn-primary btn-xs" disabled={game.busy || !g.canReissue} onClick={() => game.act({ type: "reissue", itemId: g.id })}>
                  {g.canReissue ? "Armory: new one" : "Armory: tomorrow"}
                </button>
              ) : g.equipped ? (
                <button className="slot-state" disabled={game.busy} title="Take it off" onClick={() => game.act({ type: "unequip", slot: g.slot })}>{g.slot === "weapon" ? "Carried" : "Worn"}</button>
              ) : (
                <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "equip", itemId: g.id })}>Equip</button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="loadout-acts">
        <button className="btn btn-ghost btn-sm" onClick={() => go("tab:shop")}>Gun shop</button>
        <button className="btn btn-ghost btn-sm bm-link" onClick={() => go("place:street")}>Black market</button>
      </div>
    </section>
  );
}

/** Reputation and record side by side, then where the money is: bank, cash and dirty. */
function Dossier({ game }: { game: GameApi }) {
  const view = game.view!;
  const tone = { Clean: "green", Noticed: "amber", Wanted: "red", "Most wanted": "red" }[view.heatLabel] ?? "green";
  return (
    <section className="card dossier">
      <div className="dossier-duo">
        <div className="dossier-tile">
          <span className="label">Reputation</span>
          <b className="tone-amber-t">{view.reputation.toLocaleString()}</b>
        </div>
        <div className="dossier-tile">
          <span className="label">Record</span>
          <b className={`tone-${tone}-t`}>{view.heatLabel}</b>
        </div>
      </div>
      <div className="dossier-money">
        <span className="label">Where the money is</span>
        <div className="money-cols">
          <div><span className="label">Bank</span><b>{view.hasBankAccount ? `$${view.bank.toLocaleString()}` : "No account"}</b></div>
          <div><span className="label tone-green-t">Cash</span><b className="tone-green-t">${view.cash.toLocaleString()}</b></div>
          <div><span className="label tone-red-t">Dirty</span><b className="tone-red-t">${view.dirty.toLocaleString()}</b></div>
        </div>
      </div>
    </section>
  );
}

/** The career as a bar: one segment per rank, the current one lit. */
function RankBar({ ranks, current }: { ranks: string[]; current: number }) {
  const next = ranks[current] ?? null;
  return (
    <div className="rankbar">
      <div className="rankbar-row">
        <b>{ranks[current - 1]}</b>
        {next && <span className="muted fine">Next: {next}</span>}
      </div>
      <div className="rankbar-track" aria-label={`Rank ${current} of ${ranks.length}`}>
        {ranks.map((r, i) => (
          <i key={r} title={r} className={i + 1 < current ? "on" : i + 1 === current ? "now" : ""} />
        ))}
      </div>
    </div>
  );
}

// ─── Me ────────────────────────────────────────────────────────────────────

/** Animations follow the phone's Reduce Motion setting unless the player turns them on here. */
function MotionSetting() {
  const [choice, setChoice] = useState<"auto" | "on">("auto");
  const [deviceReduces, setDeviceReduces] = useState(false);
  useEffect(() => {
    setChoice(motionChoice());
    setDeviceReduces(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);
  const pick = (c: "auto" | "on") => {
    setMotion(c);
    setChoice(c);
    if (c === "on" && deviceReduces) window.location.reload();
  };
  return (
    <section className="card">
      <h3 className="card-title">Motion</h3>
      <div className="segmented motion-pick">
        <button className={choice === "auto" ? "on" : ""} onClick={() => pick("auto")}>Follow my phone</button>
        <button className={choice === "on" ? "on" : ""} onClick={() => pick("on")}>Always animate</button>
      </div>
      {deviceReduces && choice === "auto" && <p className="fine muted">Your phone has Reduce Motion on, so frames, names and scenes stand still.</p>}
    </section>
  );
}

/** The photo behind the Me hero: where each career works. */
const ME_SCENE: Record<string, string> = {
  police: "police", enforcer: "ironrow", courts: "court", vigilante: "undercity", medicine: "hospital",
  banking: "bank", military: "checkpoint", mechanic: "foundry", hacker: "techpark", fire: "foundry",
};

export function ProfileTab({ game }: { game: GameApi }) {
  const view = game.view!;
  const [editing, setEditing] = useState(false);
  const [allLog, setAllLog] = useState(false);

  return (
    <div className="profile">
      <div className={`me-top${view.look?.color ? ` name-${view.look.color}-title` : ""}`}>
        <Hero
          game={game}
          scene={view.look?.banner ? (view.look.banner.startsWith("u-") ? `/api/upload/${view.look.banner.slice(2)}` : view.look.banner) : view.path ? (ME_SCENE[view.path.id] ?? "street") : "gutter"}
          kicker={view.deaths ? `Life #${view.deaths + 1}` : view.location.city}
          titleFx={view.look?.color}
          title={view.name}
          sub={view.path ? `${view.path.rank} · ${view.path.name}` : "No career yet"}
          quote={view.profile.bio || view.feel.conscience}
          action={<button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>{view.profile.bio ? "Edit profile" : "Add an introduction"}</button>}
        />
        <Dossier game={game} />
        <section className="card gut">
          <h3 className="card-title">Gut read<span className="title-aside">How people see you</span></h3>
          <div className="gut-groups">
            <div className="gut-group">
              <span className="label">Body</span>
              <p className="gut-row">Build <b className="tone-amber-t">{view.feel.body}</b></p>
              <p className="gut-row">Reflexes <b>{view.feel.reflexes}</b></p>
            </div>
            <div className="gut-group">
              <span className="label">Mind</span>
              <p className="gut-row">Street smarts <b>{view.feel.smarts}</b></p>
              <p className="gut-row">Presence <b className="tone-green-t">{view.feel.presence}</b></p>
            </div>
          </div>
          {view.woundHint && <p className="fine wound-hint">{view.woundHint}</p>}
        </section>
      </div>
      {editing && <ProfileEditor game={game} onClose={() => setEditing(false)} />}

      <PromoChoice game={game} />
      <Specialties game={game} />

      {view.path && view.ladder && (
        <section className="card">
          <h3 className="card-title">Career<span className="title-aside">{view.path.name} · rank {view.ladder.current} of {view.ladder.ranks.length}</span></h3>
          <div className="row">
            <NpcPortrait id={view.path.contactId} className="avatar-sm" />
            <p>{view.path.name} · answers to {view.path.contact}</p>
          </div>
          <RankBar ranks={view.ladder.ranks} current={view.ladder.current} />
          {view.path.promotion && <p className="muted">{view.path.promotion}</p>}
          {view.path.id === "medicine" && (
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.social({ op: "back_alley_toggle", open: !view.backAlley })}>
              {view.backAlley ? "Stop taking back-alley patients" : "Take back-alley patients (cash, no paperwork)"}
            </button>
          )}
          {view.path.id === "medicine" && view.ladder.current >= 3 && (
            <div className="row">
              <span className="muted">{view.surgeryFee ? `Operating on old wounds for $${view.surgeryFee}.` : "Not taking surgery patients."}</span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={game.busy}
                onClick={() => {
                  askNumberThen(
                    { title: "Your fee for surgery", body: "What a patient pays you to operate on their old wounds.", yes: view.surgeryFee ? "Change fee" : "Start operating", input: { value: view.surgeryFee ?? 3000, min: 1000, max: 20000, unit: "$", label: "Fee" } },
                    (fee) => game.social({ op: "surgery_fee", fee }),
                  );
                }}
              >
                {view.surgeryFee ? "Change fee" : "Offer surgery"}
              </button>
              {!!view.surgeryFee && (
                <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.social({ op: "surgery_fee", fee: null })}>Stop</button>
              )}
            </div>
          )}
          {view.careerRecord.veteran && <p className="fine">Veteran: you've held higher ranks here before, so promotions come twice as fast until you're back.</p>}
        </section>
      )}

      <CareerRecord game={game} />

      {!view.path && (
        <section className="card">
          <h3 className="card-title"><GraduationCap size={16} /> No career yet</h3>
          <p className="muted">Law careers start at the Academy (City → Academy). Street careers find you, when the right person notices.</p>
          {view.application && <p className="fine">Your application to {view.application.schoolName} is {view.application.status === "pending" ? "under review" : "decided: check the Academy"}.</p>}
        </section>
      )}

      <GearCard game={game} />
      <SeasonBoard game={game} />
      <StoryLine game={game} />

      <section className="card">
        <h3 className="card-title">What happened</h3>
        <ul className="log">
          {(allLog ? view.log : view.log.slice(0, 6)).map((e, i) => (
            <li key={i} className={`log-${e.tone}`}>{e.text.replace(/\p{Extended_Pictographic}\uFE0F?\s*/gu, "")}</li>
          ))}
        </ul>
        {view.log.length > 6 && <button className="btn btn-ghost btn-sm" onClick={() => setAllLog(!allLog)}>{allLog ? "Show less" : `Show all ${view.log.length}`}</button>}
      </section>

      {(view.inventory.length > 0 || game.live!.full > 0) && (
      <section className="card">
        <h3 className="card-title">Pockets</h3>
        {view.inventory.map((i) => (
          <div key={i.id} className="row between inv-row">
            <span className="inv-name"><ItemArt id={i.id} icon={i.icon} name={i.name} className="art-xs" /> {i.name} <span className="muted">×{i.count}</span></span>
            {i.usable && <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "use", itemId: i.id })}>Use</button>}
          </div>
        ))}
        {game.live!.full > 0 && <p className="muted">Still full for {fmt(game.live!.full)}.</p>}
      </section>
      )}

      <MotionSetting />

      <AlertsCard game={game} />

      <section className="card">
        <h3 className="card-title">Account</h3>
        {game.account ? (
          <>
          <div className="row between">
            <p>Logged in as <b>{game.account.username}</b></p>
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.auth("logout")}><LogOut size={14} /> Log out</button>
          </div>
          <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.auth("new_recovery")}>
            <KeyRound size={14} /> New recovery code
          </button>
          <p className="fine">A recovery code lets you reset your password. Getting a new one cancels the old one.</p>
          <ModeratorLink />
          </>
        ) : (
          <>
            <p className="muted">You&apos;re playing as a guest. Create an account to keep this character on any device.</p>
            <AuthForm game={game} onDone={(claimed) => game.pushToasts([{ tone: "good", text: claimed ? "Character saved to your account." : "Logged in." }])} />
          </>
        )}
        <DeleteAccount hasAccount={!!game.account} />
      </section>

      <HelpLinks />
    </div>
  );
}

// ─── City ──────────────────────────────────────────────────────────────────

/** The Ledger: chapters of your story, unlocked as you play. */
export function StoryCard({ game, onRead }: { game: GameApi; onRead: (id: string) => void }) {
  const view = game.view!;
  return (
    <section className="card">
      <h3 className="card-title"><BookOpen size={16} /> The Ledger · Your story</h3>
      <div className="chapters">
        {view.chapters.filter((c) => c.unlocked).map((c) => (
          <button key={c.id} className={`chapter ${c.unlocked ? "" : "locked"} ${c.unlocked && !c.read ? "unread" : ""}`} disabled={!c.unlocked} onClick={() => onRead(c.id)}>
            <span className="chapter-title">{c.unlocked ? c.title : "Locked chapter"}</span>
            <span className="chapter-teaser">{c.unlocked ? c.teaser : "Keep working, or follow a career, to uncover this."}</span>
            {c.unlocked && !c.read && <span className="chip chip-green">New</span>}
            {!c.unlocked && <Lock size={14} />}
          </button>
        ))}
      </div>
      {view.chapters.some((c) => !c.unlocked) && (
        <p className="fine"><Lock size={12} /> {view.chapters.filter((c) => !c.unlocked).length} more chapters locked. Keep working, or follow a career, to uncover them.</p>
      )}
    </section>
  );
}

/** The station: travel between countries. */
export function TravelContent({ game }: { game: GameApi; onRead?: (id: string) => void }) {
  return <WorldCard game={game} />;
}

/** Your bank account (the Bank building). */
export function BankAccountCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const [amount, setAmount] = useState("");
  return (
    <section className="card">
        <h3 className="card-title"><Landmark size={16} /> Old Market Credit Union</h3>
        {view.hasBankAccount ? (
          <>
            <p className="big-number">${view.bank.toLocaleString()}</p>
            <p className="muted">Safe from muggers, and it survives death.</p>
            <div className="row">
              <input inputMode="numeric" placeholder="Amount" title="Leave it blank to move all of it" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
              <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => game.act({ type: "bank", op: "deposit", amount: Number(amount || view.cash) }).then(() => setAmount(""))}>Deposit</button>
              <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "bank", op: "withdraw", amount: Number(amount || 0) }).then(() => setAmount(""))}>Withdraw</button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">Muggers can&apos;t take what&apos;s in the bank, and savings survive death. Opening costs $20.</p>
            <button className="btn btn-primary btn-sm" disabled={game.busy || view.cash < 20} onClick={() => game.act({ type: "bank", op: "open" })}>Open account</button>
          </>
        )}
      </section>
  );
}

/** Doc Mercy's check-up (the Hospital). */
export function DocMercyCard({ game }: { game: GameApi }) {
  const view = game.view!;
  return (
      <section className="card">
        <h3 className="card-title"><Stethoscope size={16} /> Doc Mercy</h3>
        <p className="muted">{view.assessment.reason}</p>
        <button className="btn btn-ghost btn-sm" disabled={game.busy || !view.assessment.available} onClick={() => game.act({ type: "assess" })}>Get checked</button>
      </section>
  );
}

/** The Academy: schools, applications, the dean's letter, and your progress as a student. */
export function AcademyContent({ game }: { game: GameApi }) {
  const view = game.view!;
  const student = view.path && view.ladder && view.ladder.graduationRank && view.ladder.current < view.ladder.graduationRank;
  return (
    <div className="stack">
      {student && (
        <section className="card">
          <h3 className="card-title"><GraduationCap size={16} /> Enrolled · {view.path!.name}</h3>
          <p>You&apos;re a {view.path!.rank}. Graduate to earn your degree and your first real rank.</p>
          <p className="muted">{view.path!.promotion ?? "Keep doing your coursework (your career jobs) to graduate."}</p>
          <button className="btn btn-primary btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("injustice:go", { detail: "tab:jobs" }))}>Go to coursework</button>
        </section>
      )}
      {view.path && !student && (
        <section className="card">
          <h3 className="card-title"><GraduationCap size={16} /> Alumni</h3>
          <p className="muted">You already have a career: {view.path.rank} · {view.path.name}. The Academy has nothing more to teach you.</p>
        </section>
      )}
      {!view.path && !view.application && (
        <section className="card">
          <h3 className="card-title"><GraduationCap size={16} /> How the Academy works</h3>
          <ol className="steps">
            <li><b>Enroll</b> at a school: pay tuition from your bank, or get someone respected to vouch for you.</li>
            <li><b>The dean decides.</b> Admissions take a little while. Your record matters.</li>
            <li><b>Study.</b> As a student you do your coursework (career jobs in the Jobs tab).</li>
            <li><b>Graduate</b> to earn your degree, and your first real rank in that career.</li>
          </ol>
        </section>
      )}
      {view.application && <ApplicationCard game={game} />}
      <CareersCard game={game} />
    </div>
  );
}

// ─── Careers, schools & applications ───────────────────────────────────────

function CareerLadder({ ranks, current, graduation, color }: { ranks: string[]; current: number; graduation: number | null; color: string }) {
  return (
    <ol className="ladder" style={{ ["--path" as string]: color }}>
      {ranks.map((r, i) => {
        const n = i + 1;
        return (
          <li key={r} className={n < current ? "done" : n === current ? "now" : ""}>
            <span className="rung">{n === graduation ? <GraduationCap size={12} /> : n}</span>
            <span className="rung-name">{r}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CareersCard({ game }: { game: GameApi }) {
  const view = game.view!;
  return (
    <section className="card">
      <h3 className="card-title"><GraduationCap size={16} /> Schools</h3>
      <p className="muted">Law careers need a degree. Each school trains one career, and you enroll in person in its city.</p>
      {[true, false].map((local) => {
        const list = view.schools.filter((sc) => sc.here === local);
        if (!list.length) return null;
        return (
          <div key={String(local)}>
            <h4 className="subhead">{local ? `In ${view.location.city}` : "In other cities"}</h4>
      <div className="schools">
        {list.map((sc) => (
          <article key={sc.id} className="school" style={{ ["--path" as string]: PATH_LOOKS[sc.path].rim }}>
            <div className="school-head">
              <span className="school-crest"><GraduationCap size={20} /></span>
              <div>
                <h4>{sc.name}</h4>
                <p className="muted">{sc.city}, {sc.country} · trains <b>{sc.pathName}</b></p>
              </div>
            </div>
            <p className="school-desc">{sc.description}</p>
            <div className="school-meta">
              <span className="chip">Tuition ${sc.tuition}</span>
              <span className="chip">Dean: {sc.dean}</span>
            </div>
            {sc.vouchedBy && <p className="vouch">✓ {sc.vouchedBy} will vouch for you. No tuition.</p>}
            {sc.locked ? (
              <p className="job-lock"><Lock size={12} /> {sc.locked}</p>
            ) : (
              <motion.button whileTap={{ scale: 0.95 }} className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => game.act({ type: "apply", school: sc.id })}>
                {sc.vouchedBy ? "Enroll free (vouched)" : `Enroll · $${sc.tuition} from bank`}
              </motion.button>
            )}
          </article>
        ))}
      </div>
          </div>
        );
      })}
      <h4 className="subhead">No school: by invitation only</h4>
      <p className="fine">Street careers have no degree. Someone has to notice you.</p>
      <div className="careers">
        {CAREER_HINTS.map((c) => (
          <div key={c.id} className="career" style={{ ["--path" as string]: PATH_LOOKS[c.id].rim }}>
            <NpcPortrait id={c.contact} className="career-portrait" />
            <div>
              <b>{c.name}</b> <span className="path-side">{c.side}</span>
              <p className="muted">{c.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ApplicationCard({ game }: { game: GameApi }) {
  const app = game.view!.application!;
  if (app.status === "pending") {
    return (
      <section className="card application">
        <h3 className="card-title"><Clock size={16} /> Application under review</h3>
        <p><b>{app.schoolName}</b> · {app.pathName}</p>
        <p className="muted">{app.dean} is reviewing your file{app.vouchedBy ? `, with a recommendation from ${app.vouchedBy}` : ""}.</p>
        <p className="big-number countdown">{fmt(game.live!.application)}</p>
      </section>
    );
  }
  return <DeanLetter game={game} />;
}

/** The dean's decision, written as a letter. */
export function DeanLetter({ game, onClose }: { game: GameApi; onClose?: () => void }) {
  const app = game.view!.application!;
  const accepted = app.status === "accepted";
  return (
    <section className={`letter ${accepted ? "accepted" : "rejected"}`}>
      <p className="eyebrow"><MailOpen size={14} /> From the office of {app.dean}</p>
      <h3>{app.schoolName}</h3>
      {accepted ? (
        <p>
          We are pleased to offer you a place in our {app.pathName} program
          {app.vouchedBy ? `. ${app.vouchedBy} spoke highly of you. Do not prove them wrong.` : ". Classes begin immediately."}
        </p>
      ) : (
        <p>We regret to inform you that your application was not successful. {app.reason}</p>
      )}
      <div className="row">
        {accepted ? (
          <button className="btn btn-primary" disabled={game.busy} onClick={() => game.act({ type: "enroll" }).then(() => onClose?.())}>
            <GraduationCap size={16} /> Enroll
          </button>
        ) : (
          <button className="btn btn-ghost" disabled={game.busy} onClick={() => game.act({ type: "dismiss_application" }).then(() => onClose?.())}>
            Fold the letter away
          </button>
        )}
      </div>
    </section>
  );
}

export function WorldCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const blocked = game.busy || !!view.travel || game.live!.hospital > 0;
  return (
    <section className="card">
      <h3 className="card-title"><Globe2 size={16} /> The world · Travel</h3>
      <p className="muted">Every country is open. Each has its own laws, jobs and schools. Getting there takes time, and every way of travelling has its own danger.</p>
      <div className="world">
        {view.countries.map((c) => (
          <article key={c.id} className={`country ${c.here ? "here" : ""}`} style={{ ["--path" as string]: c.color }}>
            <div className="country-head">
              <h4>{c.name}</h4>
              {c.here ? <span className="chip chip-green"><MapPin size={12} /> You live here</span> : <span className="chip">{c.capital}</span>}
            </div>
            <p className="muted">{c.capital} · {c.mood}</p>
            <p className="laws">{c.laws}</p>
            <p className="home-line"><Home size={12} /> Your home here: <b>{c.home}</b></p>
            <ul>
              {c.schools.map((sc) => (
                <li key={sc.name} className={sc.open ? "" : "soon"}>
                  <GraduationCap size={12} /> {sc.name} <em>{sc.open ? sc.career : `${sc.career} · soon`}</em>
                </li>
              ))}
            </ul>
            {c.routes.length > 0 && (
              <div className="routes">
                {c.routes.map((r) => (
                  <button
                    key={r.mode}
                    className="route"
                    disabled={blocked || view.cash < r.cost}
                    title={r.risk}
                    onClick={() => game.act({ type: "travel", to: c.id, mode: r.mode })}
                  >
                    <Vehicle mode={r.mode} />
                    <span className="route-name">{r.name}</span>
                    <span className="route-meta">${r.cost} · {r.minutes} min</span>
                    <span className="route-risk">{r.risk}</span>
                  </button>
                ))}
                {c.drives.map((r) => (
                  <button
                    key={r.carId}
                    className="route drive"
                    disabled={blocked || !r.canDrive || view.cash < r.fuel}
                    title={r.canDrive ? "Your own car. Highway checkpoints search cars." : "Needs a mechanic first (the Docks)."}
                    onClick={() => game.act({ type: "drive", to: c.id, carId: r.carId })}
                  >
                    <CarPhoto model={r.model} className="route-car" />
                    <span className="route-name">Drive · {r.name}</span>
                    <span className="route-meta">${r.fuel} fuel · {r.minutes} min</span>
                    <span className="route-risk">
                      {!r.canDrive ? "Won't make it. Get it repaired at the Docks." : r.cargo ? `${r.cargo} units in the trunk. Checkpoints search cars.` : "Your own wheels. Checkpoints on the highway."}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      <p className="fine">Tickets and fuel are paid in cash. Buy a car at the Docks to drive yourself. Times are shortened for testing.</p>
    </section>
  );
}

// ─── Daily reward & contracts ──────────────────────────────────────────────

export function DailyCard({ game }: { game: GameApi }) {
  const d = game.view!.daily;
  return (
    <section className="card daily">
      <div className="daily-head">
        <h3 className="card-title"><Gift size={16} /> Daily</h3>
        <span className="streak"><Flame size={14} /> {d.streak} day{d.streak === 1 ? "" : "s"}</span>
      </div>
      <div className="streak-track">
        {Array.from({ length: 7 }, (_, i) => {
          const day = i + 1;
          const filled = d.canClaim ? day < d.nextDay : day <= d.nextDay;
          const next = d.canClaim && day === d.nextDay;
          return (
            <span key={day} className={`streak-day ${filled ? "done" : ""} ${next ? "next" : ""} ${day === 3 || day === 7 ? "bonus" : ""}`}>
              <b>${15 * day}</b>
              <em>{day === 3 ? "+meal" : day === 7 ? "+medkit" : `Day ${day}`}</em>
            </span>
          );
        })}
      </div>
      <motion.button whileTap={{ scale: 0.95 }} className={`btn btn-primary btn-sm ${d.canClaim ? "pulse" : ""}`} disabled={game.busy || !d.canClaim} onClick={() => game.act({ type: "claim_daily" })}>
        {d.canClaim ? `Collect day ${d.nextDay}` : "Come back tomorrow"}
      </motion.button>
      <h4 className="subhead"><ClipboardCheck size={13} /> Today's contracts</h4>
      <div className="contracts">
        {d.contracts.map((c) => {
          const done = c.progress >= c.target;
          return (
            <div key={c.id} className={`contract ${c.claimed ? "claimed" : done ? "ready" : ""}`}>
              <div className="contract-top">
                <span>{c.label}</span>
                <b>${c.reward}</b>
              </div>
              <div className="bar-track"><motion.div className="contract-fill" animate={{ width: `${(c.progress / c.target) * 100}%` }} /></div>
              <div className="contract-foot">
                <span className="muted">{c.progress}/{c.target}</span>
                {c.claimed ? (
                  <span className="text-green">Collected</span>
                ) : (
                  <button className="btn btn-ghost btn-sm" disabled={game.busy || !done} onClick={() => game.act({ type: "claim_contract", id: c.id })}>Collect</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Gym ───────────────────────────────────────────────────────────────────

const EXERCISES = [
  { stat: "strength", name: "Lift weights", Icon: DumbbellIcon },
  { stat: "toughness", name: "Spar & condition", Icon: Shield },
  { stat: "agility", name: "Footwork drills", Icon: Wind },
] as const;

function GymCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const blocked = game.busy || game.live!.hospital > 0 || !!view.travel;
  return (
    <section className="card gym">
      <h3 className="card-title"><DumbbellIcon size={16} /> {view.location.city} boxing gym</h3>
      <p className="muted">Pick what to train. You won&apos;t see numbers, but you&apos;ll feel it. ${view.gym.fee} and <Zap size={13} className="zap-inline" />{view.gym.energy} a session.</p>
      <div className="exercises">
        {EXERCISES.map(({ stat, name, Icon }) => (
          <motion.button
            key={stat}
            whileTap={{ scale: 0.94 }}
            className="exercise"
            disabled={blocked || game.live!.energy < view.gym.energy || view.cash < view.gym.fee}
            onClick={() => game.act({ type: "train", stat })}
          >
            <Icon size={22} />
            <b>{name}</b>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

type Board = { id: string; label: string; top: { place: number; who: string; value: number }[]; you: { place: number; value: number } | null };

/** This month's leaderboards. Anonymous: a public list of names would put targets on backs. */
type TrophyRow = { season: number; seasonName: string; label: string; place: number; prize?: number };
type SeasonData = {
  season: string;
  boards: Board[];
  last: { name: string; canClaim: boolean; finishes: TrophyRow[] };
  trophies: TrophyRow[];
  trophiesPublic: boolean;
};

function SeasonBoard({ game }: { game: GameApi }) {
  const [data, setData] = useState<SeasonData | null>(null);
  const [tab, setTab] = useState(0);
  const load = useCallback(() => {
    fetch("/api/season", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);
  const post = async (body: Record<string, unknown>) => {
    await game.social(body, "/api/season");
    load();
  };
  if (!data) return <SkelCard lines={4} />;
  const b = data.boards[tab];
  const fmtValue = (v: number) => (b.id === "earned" ? `$${v.toLocaleString()}` : v.toLocaleString());
  return (
    <section className="card season">
      <h3 className="card-title"><Trophy size={16} /> Season · {data.season}</h3>
            <div className="chips-row">
        {data.boards.map((x, i) => (
          <button key={x.id} className={`chip-btn ${i === tab ? "on" : ""}`} onClick={() => setTab(i)}>{x.label}</button>
        ))}
      </div>
      {b.top.length === 0 ? (
        <p className="muted">Nobody on the board yet this month.</p>
      ) : (
        <ol className="leaders">
          {b.top.map((l) => (
            <li key={l.place} className={l.who === "You" ? "me" : ""}>
              <span className={`rank r${l.place}`}>{l.place}</span>
              <span className="leader-name">{l.who}</span>
              <b>{fmtValue(l.value)}</b>
            </li>
          ))}
        </ol>
      )}
      <p className="fine">{b.you ? `Your place: #${b.you.place} (${fmtValue(b.you.value)}).` : "You're not on this board yet."}</p>

      {data.last.canClaim && data.last.finishes.length > 0 && (
        <div className="trophy-claim">
          <p>
            <b>{data.last.name} is over.</b> You finished{" "}
            {data.last.finishes.map((t) => `#${t.place} in ${t.label.toLowerCase()}`).join(", ")}.
          </p>
          <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => post({ op: "claim" })}>
            <Trophy size={14} /> Claim ${data.last.finishes.reduce((s, t) => s + (t.prize ?? 0), 0)} and your trophies
          </button>
        </div>
      )}
      {data.trophies.length > 0 && (
        <>
          <h4 className="subhead">Your trophy shelf</h4>
          <div className="trophies">
            {data.trophies.map((t, i) => (
              <span key={i} className={`trophy t${t.place}`}>
                <Trophy size={14} /> #{t.place} {t.label} <small>{t.seasonName}</small>
              </span>
            ))}
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={data.trophiesPublic} disabled={game.busy} onChange={(e) => post({ op: "show", on: e.target.checked })} />
            <span>Show my trophies to other players. <span className="muted">Bragging rights, and a target on your back.</span></span>
          </label>
        </>
      )}
    </section>
  );
}

/** Loan offers, debts you owe, and money you lent out. */
export function LoansCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const offers = view.loanOffers;
  const owed = view.loans.filter((l) => l.borrowerId === view.id);
  const lent = view.loans.filter((l) => l.lenderId === view.id);
  if (!offers.length && !owed.length && !lent.length) return null;
  const due = (t: number) => (t <= Date.now() ? "overdue" : `due in ${Math.ceil((t - Date.now()) / 3_600_000)}h`);
  return (
    <section className="card">
      <h3 className="card-title">Loans</h3>
      <ul className="officials">
        {offers.map((o) => (
          <li key={o.id}>
            <span>{o.lenderName} offers <b>${o.amount}</b> at {Math.round(o.rate * 100)}%{o.kind === "shark" ? " (loan shark)" : ""}</span>
            <span className="row">
              <button className="btn btn-primary btn-xs" disabled={game.busy} onClick={() => game.social({ op: "loan_accept", offerId: o.id, lenderId: o.lenderId })}>Take it</button>
              <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.social({ op: "loan_decline", offerId: o.id })}>No</button>
            </span>
          </li>
        ))}
        {owed.map((l) => (
          <li key={l.id}>
            <span>You owe {l.lenderName} <b>${l.owed}</b>, {due(l.due)}{l.kind === "shark" ? ". They will come for it." : ""}</span>
            <button className="btn btn-primary btn-xs" disabled={game.busy} onClick={() => game.social({ op: "loan_repay", loanId: l.id, lenderId: l.lenderId })}>Pay back</button>
          </li>
        ))}
        {lent.map((l) => (
          <li key={l.id}>
            <span>{l.borrowerName} owes you <b>${l.owed}</b>, {due(l.due)}</span>
            {l.due <= Date.now() && (
              <button className="btn btn-danger btn-xs" disabled={game.busy} onClick={() => game.social({ op: "loan_collect", loanId: l.id, borrowerId: l.borrowerId })}>
                {l.kind === "bank" ? "Seize their savings" : "Send the muscle"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Shown only to moderator accounts. */
function ModeratorLink() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fetch("/api/admin?probe=1", { cache: "no-store" }).then((r) => setOk(r.ok)).catch(() => undefined);
  }, []);
  if (!ok) return null;
  return <a className="btn btn-primary btn-sm" href="/admin">Moderation</a>;
}

/** Past careers, legacies, and walking away from the current one. */
function CareerRecord({ game }: { game: GameApi }) {
  const view = game.view!;
  const r = view.careerRecord;
  if (!view.path && !r.history.length) return null;
  return (
    <section className="card">
      <h3 className="card-title"><BookOpen size={16} /> Career record</h3>
      {r.legacy.length > 0 && (
        <p className="fine">
          {r.legacy.map((l) => <span key={l} className="chip chip-gold">{l}</span>)} <span className="muted">+{r.legacyBonus}% pay on every job</span>
        </p>
      )}
      {r.history.length > 0 ? (
        <ul className="officials">
          {r.history.map((h, i) => (
            <li key={i}>
              <span>{h.title} · {h.name}</span>
              <span className="muted fine">{h.finished ? "retired at the top" : "left"} · {new Date(h.at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted fine">Reach the top rank and leave to keep a legacy for good.</p>
      )}
      {r.gap && <p className="fine muted">{r.gap}</p>}
      {view.path && r.exit && <GettingOut game={game} />}
      {view.path && (!r.exit || r.exit.ready) && (
        <>
          <button
            className={`btn btn-sm ${r.exit?.ready ? "btn-primary" : "btn-ghost"}`}
            disabled={game.busy || !!r.canLeave}
            title={r.canLeave ?? ""}
            onClick={() =>
              askThen({ title: `Leave the ${view.path!.name}? You keep everything you've learned (your hidden strengths), but you lose your rank, your issued gear${view.path!.id === "enforcer" ? ", and your made status" : ""}. Coming back later is faster for veterans.`, tone: "danger" }, () => game.act({ type: "leave_career" }))
            }
          >
            Leave this career
          </button>
          {r.canLeave && !r.exit && <p className="fine muted">{r.canLeave}</p>}
        </>
      )}
    </section>
  );
}

/** Getting out of a dirty career: a checklist that fills in as you live straight. */
function GettingOut({ game }: { game: GameApi }) {
  const view = game.view!;
  const exit = view.careerRecord.exit!;
  const mafia = view.path?.id === "enforcer";
  if (!exit.started) {
    return (
      <div className="getting-out">
        <b className="go-title">{mafia ? "Nobody just walks out of the family" : "Your record is dirty"}</b>
        <p className="fine muted">
          {mafia
            ? "To leave, you have to get clean first: honest work (more the higher you've climbed), no heat, no dirty money, a clear conscience, no case pending and no crew."
            : "A clean record lets you resign any time. Yours isn't clean, so you'll have to straighten out first."}
        </p>
        <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => game.act({ type: "start_exit" })}>Start getting out</button>
      </div>
    );
  }
  const done = exit.items.filter((i) => i.done).length;
  return (
    <div className="getting-out on">
      <div className="row between">
        <b className="go-title">Getting out</b>
        <span className="go-count">{done}/{exit.items.length}</span>
      </div>
      <div className="go-bar"><span style={{ width: `${(done / exit.items.length) * 100}%` }} /></div>
      <ul className="go-list">
        {exit.items.map((i) => (
          <li key={i.id} className={i.done ? "done" : ""}>
            <span className="go-check" aria-hidden>{i.done ? "✓" : ""}</span>
            <span>
              <b>{i.label}</b>
              <small>{i.detail}</small>
            </span>
          </li>
        ))}
      </ul>
      {exit.ready ? (
        <p className="fine" style={{ color: "var(--cash)" }}>You're clean. You can walk away now.</p>
      ) : (
        <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "abandon_exit" })}>Change your mind</button>
      )}
    </div>
  );
}

/** A promotion asks how the job changed you. */
export function PromoChoice({ game }: { game: GameApi }) {
  const c = game.view!.promoChoice;
  if (!c) return null;
  return (
    <section className="card promo-choice">
      <h3 className="card-title"><Sparkles size={16} /> {c.title}: how did it change you?</h3>
      <div className="promo-options">
        {c.options.map((o) => (
          <button key={o.id} className="promo-option" disabled={game.busy} onClick={() => game.act({ type: "promo_choice", pick: o.id })}>
            <b>{o.label}</b>
            <span>{o.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

const ROMAN = ["", "I", "II", "III"];

/** Lasting skills from everything you've done, in every career. */
function Specialties({ game }: { game: GameApi }) {
  const view = game.view!;
  const [open, setOpen] = useState<string | null>(null);
  // What you have, nothing about how close you are or how to get more.
  const list = view.specialties.filter((s) => s.tier > 0).sort((a, b) => b.tier - a.tier);
  return (
    <section className="card specialties">
      <h3 className="card-title">Specialties</h3>
      {list.length === 0 && <p className="fine muted">Nothing yet. Some things only come with time.</p>}
      <ul className="spec-grid">
        {list.map((s) => {
          const isOpen = open === s.id;
          return (
            <li key={s.id} className={`has ${isOpen ? "open" : ""}`}>
              <button className="spec-tile" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                <b className="spec-name">{s.name}<span className="spec-tier"> {ROMAN[s.tier]}</span></b>
                {s.mastered && <span className="spec-count">Mastered</span>}
              </button>
              {isOpen && s.perk && (
                <div className="spec-more">
                  <p className="fine spec-perk">{s.perk}</p>
                </div>
              )}
              {s.id === "combat_medic" && s.tier > 0 && (
                <button className="btn btn-primary btn-xs" disabled={game.busy || !s.ready || view.hp >= view.maxHp} onClick={() => game.act({ type: "field_dressing" })}>
                  {s.ready ? "Field dressing" : "Restocking your kit"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Work done toward your next rank. Stats stay words: you're told when they're the hold-up. */
export function PromoBar({ game }: { game: GameApi }) {
  const p = game.view!.promo;
  if (!p) return null;
  if (!p.next) return <p className="fine muted promo-bar-top">Top of the ladder.</p>;
  return (
    <div className="promo-bar">
      <div className="row between">
        <span className="fine">Next: <b>{p.next}</b></span>
        <span className="fine promo-pct">{p.work}% of the work</span>
      </div>
      <div className="promo-track"><span style={{ width: `${p.work}%` }} /></div>
      {p.statsHint && p.work >= 60 && <p className="fine promo-hint">{p.statsHint}</p>}
    </div>
  );
}

// ── 4. Community service ──

const SERVICE_LIST = [
  { id: "graffiti", name: "Scrub graffiti off the underpass" },
  { id: "park", name: "Weed the flowerbeds in the park" },
  { id: "crossing", name: "Crossing guard at the school" },
  { id: "kitchen", name: "Serve at the soup kitchen" },
  { id: "dogs", name: "Walk the shelter dogs" },
];

/** Unpaid good deeds: they cool your record and lighten your conscience. */
function ServiceCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const [open, setOpen] = useState(false);
  const blocked = game.busy || game.live!.hospital > 0 || !!view.travel || !!view.jail || game.live!.energy < 8;
  const exiting = !!view.careerRecord.exit?.started;
  return (
    <section className={`card service${open || exiting ? " open" : ""}`}>
      <button className="service-head" onClick={() => setOpen(!open)} aria-expanded={open || exiting}>
        <span>
          <b>Community service</b>
          <small>No pay. Cools your record and lightens your conscience.{exiting ? " Counts toward getting out." : ""}</small>
        </span>
        <span className="service-cost"><Zap size={12} /> 8</span>
      </button>
      {(open || exiting) && (
        <div className="service-list">
          {SERVICE_LIST.map((s) => (
            <button key={s.id} className="btn btn-ghost btn-sm" disabled={blocked} onClick={() => game.act({ type: "community_service", task: s.id })}>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ── 5. Bank statement ──

/** Where your money went: newest first. */
export function Statement({ game }: { game: GameApi }) {
  const [all, setAll] = useState(false);
  const ledger = game.view!.ledger.filter((l) => l.cash || l.bank || l.dirty);
  if (!ledger.length) return null;
  const fmtD = (n: number) => (n > 0 ? `+$${n.toLocaleString("en")}` : `-$${Math.abs(n).toLocaleString("en")}`);
  const shown = all ? ledger : ledger.slice(0, 8);
  return (
    <section className="card statement">
      <h3 className="card-title">Statement</h3>
      <ul className="stmt">
        {shown.map((l, i) => (
          <li key={i}>
            <div className="stmt-what">
              <b>{l.label.replace(/ \(.*\)$/, "")}</b>
              <time>{new Date(l.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
            </div>
            <div className="stmt-amts">
              {!!l.cash && <span className={l.cash > 0 ? "up" : "down"}>{fmtD(l.cash)} <small>cash</small></span>}
              {!!l.bank && <span className={l.bank > 0 ? "up" : "down"}>{fmtD(l.bank)} <small>bank</small></span>}
              {!!l.dirty && <span className={l.dirty > 0 ? "dirty-up" : "down"}>{fmtD(l.dirty)} <small>dirty</small></span>}
            </div>
          </li>
        ))}
      </ul>
      {ledger.length > 8 && <button className="btn btn-ghost btn-sm" onClick={() => setAll(!all)}>{all ? "Show less" : `Show all ${ledger.length}`}</button>}
    </section>
  );
}
