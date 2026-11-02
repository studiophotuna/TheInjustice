"use client";

import { motion } from "motion/react";
import {
  Backpack,
  Bell,
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
import { useState, type ComponentType } from "react";
import type { JobView, PublicView } from "@/game/view";
import { Skyline } from "./art/Skyline";
import { NpcPortrait, PATH_LOOKS, PlayerAvatar } from "./art/Portraits";

/** Vague hints only: what kind of person each contact is looking for. */
const CAREER_HINTS = [
  { id: "police", name: "Police", side: "Law", contact: "reyes", hint: "Work nights, keep your record clean, and get a real address." },
  { id: "courts", name: "Courts", side: "Law", contact: "marsh", hint: "Spend time on Courthouse Hill, and read what everyone else ignores." },
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
};

const list = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// ─── Jobs ──────────────────────────────────────────────────────────────────

export function JobsTab({ game, highlight }: { game: GameApi; highlight: string | null }) {
  const view = game.view!;
  const energy = game.live!.energy;
  const blocked = game.busy || game.live!.hospital > 0;
  // The district holding most of your career's jobs comes first.
  const pathJobs = (id: string) => view.jobs.filter((j) => j.pathJob && j.district === id).length;
  const districts = [...view.districts].sort((a, b) => pathJobs(b.id) - pathJobs(a.id));

  return (
    <div className="stack">
      {districts.map((d) => {
        const jobs = view.jobs
          .filter((j) => j.district === d.id && (!d.locked || j.pathJob))
          .sort((x, y) => Number(y.pathJob) - Number(x.pathJob));
        return (
          <section key={d.id} className={`district ${d.locked && !jobs.length ? "is-locked" : ""}`}>
            <div className="district-hero">
              <Skyline district={d.id} rain={d.id === "gutter"} />
              <div className="district-title">
                <h2>{d.name}</h2>
                <p>{d.locked && !jobs.length ? <><Lock size={13} /> {d.locked}</> : d.tagline}</p>
              </div>
            </div>
            {jobs.length > 0 && (
              <motion.div className="job-grid" variants={list} initial="hidden" animate="show">
                {jobs.map((j) => (
                  <JobCard key={j.id} job={j} energy={energy} blocked={blocked} best={j.id === view.recommendedJobId} flash={j.id === highlight} onWork={() => game.act({ type: "job", jobId: j.id })} />
                ))}
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
          <p className="muted">{view.path ? `${view.path.rank} · ${view.path.name}` : "Bum · The Gutter"}{view.deaths ? ` · Life #${view.deaths + 1}` : ""}</p>
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

      {view.path && (
        <section className="card">
          <h3 className="card-title"><ShieldAlert size={16} /> Career</h3>
          <div className="row">
            <NpcPortrait id={view.path.contactId} className="avatar-sm" />
            <p>{view.path.name} path · answers to {view.path.contact}</p>
          </div>
          {view.path.promotion && <p className="muted">{view.path.promotion}</p>}
        </section>
      )}

      {!view.path && (
        <section className="card">
          <h3 className="card-title"><ShieldAlert size={16} /> Careers</h3>
          <p className="muted">Nobody hands you a career. Someone has to notice you first.</p>
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
      )}

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
          <div className="row between">
            <p>Logged in as <b>{game.account.username}</b></p>
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.auth("logout")}><LogOut size={14} /> Log out</button>
          </div>
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
