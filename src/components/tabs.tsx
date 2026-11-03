"use client";

import { motion } from "motion/react";
import {
  Backpack,
  Bell,
  Clock,
  Crown,
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
  HeartPulse,
  BookOpen,
  Brain,
  Crosshair,
  Dumbbell,
  Eye,
  Footprints,
  Hammer,
  Hand,
  Landmark,
  Lock,
  LogOut,
  Megaphone,
  MessageCircle,
  Newspaper,
  Search,
  ShieldAlert,
  Siren,
  Skull,
  Sparkles,
  Stethoscope,
  Swords,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import type { JobView, PublicView } from "@/game/view";
import { Skyline } from "./art/Skyline";
import { Scene, type CharacterKind, type SceneKind } from "./art/Scenes";

/** Districts drawn as full illustrated scenes (the rest use their animated skyline). */
const DISTRICT_SCENES: Partial<Record<string, { scene: SceneKind; chars: { kind: CharacterKind; x: number; scale?: number }[] }>> = {
  gutter: { scene: "street", chars: [{ kind: "bum", x: 82, scale: 0.8 }] },
  southside: { scene: "street", chars: [{ kind: "thug", x: 70 }, { kind: "thug", x: 86, scale: 0.9 }] },
  precinct_square: { scene: "police", chars: [{ kind: "detective", x: 16 }] },
  st_brigids: { scene: "hospital", chars: [{ kind: "doctor", x: 14 }] },
  glass_quarter: { scene: "highrise", chars: [{ kind: "banker", x: 84 }] },
  exchange: { scene: "highrise", chars: [{ kind: "banker", x: 18 }] },
  courthouse_hill: { scene: "city", chars: [{ kind: "lawyer", x: 84 }] },
};
import { Vehicle } from "./art/Vehicles";
import { NpcPortrait, PATH_LOOKS, PlayerAvatar } from "./art/Portraits";

/** Vague hints only: what kind of person each contact is looking for. */
const CAREER_HINTS = [
  { id: "vigilante", name: "Vigilante", side: "Law", contact: "silas", hint: "Look out for the people of Southside, and keep your conscience clean." },
  { id: "enforcer", name: "Enforcer", side: "Street", contact: "kozak", hint: "Do muscle work for shady people. Win some fights." },
];
import { AuthForm } from "./screens";
import { fmt, type GameApi } from "./useGame";

type IconT = ComponentType<{ size?: number; className?: string }>;

const TAG_ICONS: Record<string, IconT> = {
  Legwork: Footprints,
  Talk: MessageCircle,
  Scavenging: Search,
  Hustle: Sparkles,
  Crime: Hand,
  Muscle: Dumbbell,
  Watch: Eye,
  "Muscle · Shady": Dumbbell,
  Training: Dumbbell,
  Study: BookOpen,
  Patrol: Footprints,
  Action: Siren,
  Corrupt: Hand,
  Pressure: Megaphone,
  Investigation: Search,
  Command: Crown,
  Labor: Hammer,
  Care: HeartPulse,
};

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
  const card = (j: JobView) => (
    <JobCard key={j.id} job={j} energy={energy} blocked={blocked} best={j.id === view.recommendedJobId} flash={j.id === highlight} onWork={() => game.act({ type: "job", jobId: j.id })} />
  );

  return (
    <div className="stack">
      {view.path && careerJobs.length > 0 && (
        <section className="district career-jobs" style={{ ["--path" as string]: PATH_LOOKS[view.path.id].rim }}>
          <div className="career-head">
            <NpcPortrait id={view.path.contactId} className="avatar-sm" />
            <div>
              <h2>{view.path.rank}</h2>
              <p className="muted">{view.path.name} · your career goes with you, wherever you live</p>
            </div>
          </div>
          <motion.div className="job-grid" variants={list} initial="hidden" animate="show">
            {careerJobs.sort((a, b) => Number(!!a.locked) - Number(!!b.locked)).map(card)}
          </motion.div>
        </section>
      )}
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
              <motion.div className="job-grid" variants={list} initial="hidden" animate="show">
                {jobs.map(card)}
              </motion.div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function JobCard({ job, energy, blocked, best, flash, onWork }: {
  job: JobView; energy: number; blocked: boolean; best: boolean; flash: boolean; onWork: () => void;
}) {
  const Icon = TAG_ICONS[job.tag] ?? Hammer;
  const tired = energy < job.energy;
  return (
    <motion.article id={`job-${job.id}`} variants={item} className={`job ${job.pathJob ? "job-path" : ""} ${flash ? "flash" : ""} ${job.locked ? "job-locked" : ""}`}>
      <div className="job-icon"><Icon size={20} /></div>
      <div className="job-body">
        <div className="job-head">
          <h3>{job.name}</h3>
          {best && <span className="chip chip-green">Best now</span>}
        </div>
        <div className="job-meta">
          <span className="chip">{job.tag}</span>
          {job.risky && <span className="chip chip-amber">Risky</span>}
          {job.crime && <span className="chip chip-red">Shady</span>}
        </div>
        {job.locked && <p className="job-lock"><Lock size={12} /> {job.locked}</p>}
      </div>
      <div className="job-side">
        <span className="job-pay">${job.pay[0]}–{job.pay[1]}</span>
        <motion.button whileTap={{ scale: 0.92 }} className="btn btn-primary btn-sm" disabled={blocked || tired || !!job.locked} onClick={onWork}>
          <Zap size={14} /> {job.energy}
        </motion.button>
      </div>
    </motion.article>
  );
}

// ─── Fight ─────────────────────────────────────────────────────────────────

const DANGER = ["Easy", "Favorable", "Even", "Risky", "Deadly"];

export function FightTab({ game }: { game: GameApi }) {
  const view = game.view!;
  const blocked = game.busy || game.live!.hospital > 0;
  return (
    <div className="stack">
      <GymCard game={game} />
      <div className="callout glass">
        <Eye size={18} />
        <p>
          You never see the numbers. Trust your gut. It gets sharper the more you notice things.{" "}
          <b className="text-red">Losing badly to someone far stronger can kill you.</b>
        </p>
      </div>
      <motion.div className="fight-grid" variants={list} initial="hidden" animate="show">
        {view.fights.map((n) => (
          <motion.article key={n.id} variants={item} className={`fighter ${n.locked ? "is-locked" : ""} danger-${n.danger}`}>
            <NpcPortrait id={n.id} className="fighter-portrait" />
            <div className="fighter-body">
              <h3>{n.name}</h3>
              <p className="muted">{n.description}</p>
              <div className="gut">
                <span className={`danger-pill d${n.danger}`}>{n.danger >= 4 && <Skull size={12} />} {DANGER[n.danger]}</span>
                <span className="muted">“{n.read}”</span>
              </div>
              {n.locked ? (
                <p className="job-lock"><Lock size={12} /> {n.locked}</p>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  className="btn btn-danger btn-sm"
                  disabled={blocked || game.live!.energy < view.fightEnergy || view.hp < 20}
                  onClick={() => game.act({ type: "fight", npcId: n.id })}
                >
                  <Swords size={14} /> {view.hp < 20 ? "Too hurt" : `Fight · ⚡${view.fightEnergy}`}
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

export function ShopTab({ game }: { game: GameApi }) {
  const view = game.view!;
  return (
    <div className="stack">
      <section className="card">
        <h3 className="card-title"><Building size={16} /> Businesses</h3>
        <p className="muted">Buy a business with money from your bank. It earns every hour (up to a day's worth waits for you). You must be in its country to buy it.</p>
        <div className="properties">
          {view.properties.map((pr) => (
            <article key={pr.id} className={`property ${pr.owned ? "owned" : ""}`}>
              <div className="shop-emoji">{pr.icon}</div>
              <div className="shop-body">
                <span className="chip">{pr.city}</span>
                <h3>{pr.name}</h3>
                <p className="muted">{pr.description}</p>
                <p className="property-income">≈ ${pr.incomePerHour}/hour</p>
              </div>
              {pr.owned ? (
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
      <h3 className="subhead">Supplies</h3>
    <motion.div className="shop-grid" variants={list} initial="hidden" animate="show">
      {view.shop.map((i) => (
        <motion.article key={i.id} variants={item} className={`shop-item ${i.owned ? "owned" : ""}`}>
          <div className="shop-emoji">{i.icon}</div>
          <div className="shop-body">
            <span className="chip">{KIND_LABEL[i.kind]}</span>
            <h3>{i.name}</h3>
            <p className="muted">{i.description}</p>
          </div>
          <motion.button whileTap={{ scale: 0.94 }} className="btn btn-primary btn-sm" disabled={game.busy || i.owned || view.cash < i.price} onClick={() => game.act({ type: "buy", itemId: i.id })}>
            {i.owned ? "Owned" : `$${i.price}`}
          </motion.button>
        </motion.article>
      ))}
    </motion.div>
      </div>
  );
}

// ─── Me ────────────────────────────────────────────────────────────────────

export function ProfileTab({ game }: { game: GameApi }) {
  const view = game.view!;
  const [amount, setAmount] = useState("");
  const [perm, setPerm] = useState<string>(typeof Notification === "undefined" ? "unsupported" : Notification.permission);

  return (
    <div className="profile">
      <section className="card profile-hero">
        <PlayerAvatar name={view.name} path={view.path?.id} className="avatar-xl" />
        <div>
          <h2>{view.name}</h2>
          <p className="muted">{view.path ? `${view.path.rank} · ${view.path.name}` : `Bum · ${view.location.city}`}{view.deaths ? ` · Life #${view.deaths + 1}` : ""}</p>
          <p className="quote">“{view.feel.conscience}”</p>
        </div>
      </section>

      <section className="card">
        <h3 className="card-title"><Brain size={16} /> How you feel</h3>
        <div className="feel-grid">
          {([["Body", view.feel.body], ["Reflexes", view.feel.reflexes], ["Street smarts", view.feel.smarts], ["Presence", view.feel.presence]] as const).map(([k, v]) => (
            <div key={k} className="feel">
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      </section>

      {view.path && view.ladder && (
        <section className="card">
          <h3 className="card-title"><ShieldAlert size={16} /> Career</h3>
          <div className="row">
            <NpcPortrait id={view.path.contactId} className="avatar-sm" />
            <p>{view.path.name} · answers to {view.path.contact}</p>
          </div>
          <CareerLadder ranks={view.ladder.ranks} current={view.ladder.current} graduation={view.ladder.graduationRank} color={PATH_LOOKS[view.path.id].rim} />
          {view.path.promotion && <p className="muted">{view.path.promotion}</p>}
        </section>
      )}

      {view.application && <ApplicationCard game={game} />}

      {!view.path && <CareersCard game={game} />}

      <section className="card">
        <h3 className="card-title"><Landmark size={16} /> Old Market Credit Union</h3>
        {view.hasBankAccount ? (
          <>
            <p className="big-number">${view.bank.toLocaleString()}</p>
            <p className="muted">Safe from muggers, and it survives death.</p>
            <div className="row">
              <input inputMode="numeric" placeholder="Amount (empty = all cash)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
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

      <section className="card">
        <h3 className="card-title"><Backpack size={16} /> Pockets</h3>
        {view.inventory.length === 0 && <p className="muted">Empty. Like your stomach.</p>}
        {view.inventory.map((i) => (
          <div key={i.id} className="row between inv-row">
            <span>{i.icon} {i.name} <span className="muted">×{i.count}</span></span>
            {i.usable && <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "use", itemId: i.id })}>Use</button>}
          </div>
        ))}
        {game.live!.full > 0 && <p className="muted">Still full for {fmt(game.live!.full)}.</p>}
      </section>

      <section className="card">
        <h3 className="card-title"><Stethoscope size={16} /> Doc Mercy</h3>
        <p className="muted">{view.assessment.reason}</p>
        <button className="btn btn-ghost btn-sm" disabled={game.busy || !view.assessment.available} onClick={() => game.act({ type: "assess" })}>Get checked</button>
      </section>

      <section className="card">
        <h3 className="card-title"><Bell size={16} /> Alerts</h3>
        <p className="muted">A notification when your energy is full or you&apos;re out of the clinic.</p>
        {perm === "granted" ? (
          <p className="text-green">Alerts are on.</p>
        ) : perm === "unsupported" ? (
          <p className="muted">Not supported here. On iPhone, add the game to your Home Screen first.</p>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => Notification.requestPermission().then(setPerm)}>Turn on alerts</button>
        )}
      </section>

      <section className="card">
        <h3 className="card-title"><UserRound size={16} /> Account</h3>
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
          </>
        ) : (
          <>
            <p className="muted">You&apos;re playing as a guest. Create an account to keep this character on any device.</p>
            <AuthForm game={game} onDone={(claimed) => game.pushToasts([{ tone: "good", text: claimed ? "Character saved to your account." : "Logged in." }])} />
          </>
        )}
      </section>
    </div>
  );
}

// ─── City ──────────────────────────────────────────────────────────────────

export function CityTab({ game, onRead }: { game: GameApi; onRead: (id: string) => void }) {
  const view = game.view!;
  return (
    <div className="stack">
      <section className="card">
        <h3 className="card-title"><BookOpen size={16} /> The Ledger · Your story</h3>
        <div className="chapters">
          {view.chapters.map((c) => (
            <button key={c.id} className={`chapter ${c.unlocked ? "" : "locked"} ${c.unlocked && !c.read ? "unread" : ""}`} disabled={!c.unlocked} onClick={() => onRead(c.id)}>
              <span className="chapter-title">{c.unlocked ? c.title : "Locked chapter"}</span>
              <span className="chapter-teaser">{c.unlocked ? c.teaser : "Keep working, or follow a career, to uncover this."}</span>
              {c.unlocked && !c.read && <span className="chip chip-green">New</span>}
              {!c.unlocked && <Lock size={14} />}
            </button>
          ))}
        </div>
      </section>
      <WorldCard game={game} />
      <section className="card">
        <h3 className="card-title"><Trophy size={16} /> Most respected in Grayhaven</h3>
        <ol className="leaders">
          {game.leaders.map((l, i) => (
            <li key={i} className={l.name === view.name ? "me" : ""}>
              <span className={`rank r${i + 1}`}>{i + 1}</span>
              <span className="leader-name">{l.name}<em>{l.title}</em></span>
              <b>★ {l.reputation}</b>
            </li>
          ))}
        </ol>
      </section>
      <section className="card">
        <h3 className="card-title"><Newspaper size={16} /> What happened</h3>
        <ul className="log">
          {view.log.map((e, i) => (
            <li key={i} className={e.tone}>
              <Crosshair size={12} /> {e.text}
            </li>
          ))}
        </ul>
      </section>
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
      <h3 className="card-title"><GraduationCap size={16} /> Careers &amp; schools</h3>
      <p className="muted">
        Law careers start at school: pay tuition, or get someone respected to vouch for you. The dean has the final say.
        Street careers have no school. Someone has to notice you.
      </p>
      <div className="schools">
        {view.schools.map((sc) => (
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
                {sc.vouchedBy ? "Apply free (vouched)" : `Apply · $${sc.tuition} from bank`}
              </motion.button>
            )}
          </article>
        ))}
      </div>
      <h4 className="subhead">By invitation only</h4>
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
              </div>
            )}
          </article>
        ))}
      </div>
      <p className="fine">Tickets are paid in cash. Times are shortened for testing.</p>
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
  { stat: "strength", name: "Lift weights", note: "Hit harder", Icon: DumbbellIcon },
  { stat: "toughness", name: "Spar & condition", note: "Take more hits", Icon: Shield },
  { stat: "agility", name: "Footwork drills", note: "Dodge and strike first", Icon: Wind },
] as const;

function GymCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const blocked = game.busy || game.live!.hospital > 0 || !!view.travel;
  return (
    <section className="card gym">
      <h3 className="card-title"><DumbbellIcon size={16} /> {view.location.city} boxing gym</h3>
      <p className="muted">Pick what to train. You won&apos;t see numbers, but you&apos;ll feel it. ${view.gym.fee} and ⚡{view.gym.energy} a session.</p>
      <div className="exercises">
        {EXERCISES.map(({ stat, name, note, Icon }) => (
          <motion.button
            key={stat}
            whileTap={{ scale: 0.94 }}
            className="exercise"
            disabled={blocked || game.live!.energy < view.gym.energy || view.cash < view.gym.fee}
            onClick={() => game.act({ type: "train", stat })}
          >
            <Icon size={22} />
            <b>{name}</b>
            <span>{note}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
