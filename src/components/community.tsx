"use client";

import { ReportButton } from "./ReportButton";
import { AnimatePresence, motion } from "motion/react";
import { Ban, Crown, Eye, EyeOff, ShieldAlert, ShieldCheck, FileSearch, Footprints, Gavel, Flame, Hand, Handshake, Landmark, MessagesSquare, Moon, Stethoscope, Inbox, Lock, MessageSquare, Search, Send, Shield, Siren, Swords, UserCheck, Users, Vault } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PATH_LOOKS, PlayerAvatar } from "./art/Portraits";
import { OnlineNow } from "./online";
import { StreetFeed, takePeopleSection, usePulse } from "./pulse";
import { Scene } from "./art/Scenes";
import type { GameApi } from "./useGame";

type Profile = {
  id: string;
  name: string;
  title: string;
  path: string | null;
  reputation: number;
  city: string;
  status: "ok" | "hospital" | "traveling" | "dead";
  crewTag: string | null;
  protected: boolean;
  read: string;
  danger: number;
  lastSeen: number;
  canAttack: string | null;
  canVouch: string | null;
  canInvite: boolean;
  canForum?: boolean;
  canCourtMartial?: string | null;
  canSellGun?: boolean;
  torch?: { id: string; name: string; odds: number; block: string | null }[];
  contract?: { cost: number; block: string | null } | null;
  ambush?: string | null;
  surgery?: { fee: number; block: string | null } | null;
  regular?: { out: boolean; line: string | null };
  hire?: ("attacker" | "driver" | "lookout")[];
  rat?: boolean;
  streetTitle: string | null;
  bio?: string | null;
  photo?: string | null;
  canCrime: Record<CrimeKind, string | null>;
  bounty: number;
  trophies?: { label: string; place: number; seasonName: string }[];
  lawyerFee: number | null;
  canFrisk: string | null;
};
type CrimeKind = "pickpocket" | "snatch" | "mug";
const CRIME_BUTTONS: { id: CrimeKind; label: string; Icon: typeof Hand; note: string }[] = [
  { id: "pickpocket", label: "Pickpocket", Icon: Hand, note: "Quiet and small" },
  { id: "snatch", label: "Snatch", Icon: Footprints, note: "Grab and run" },
  { id: "mug", label: "Mug", Icon: Swords, note: "Can turn into a fight" },
];
type CaseCard = {
  id: string;
  crime: string;
  district: string;
  at: number;
  victimName: string;
  amount: number;
  open: boolean;
  tips: { id: string; source: "witness" | "victim" | "bystander" | "detective" | "doctor" | "bank"; text: string; at: number }[];
  canInvestigate: string | null;
  suspects: { id: string; name: string; matches: number }[] | null;
  arrested: { suspectName: string; officerName: string } | null;
  witnessStatements: number;
  protectedBy: string | null;
  searches: { name: string; found: boolean }[];
  searchedByYou: boolean;
};
type TrialCard = {
  caseId: string;
  crime: string;
  district: string;
  victimName: string;
  amount: number;
  suspectName: string;
  officerName: string;
  at: number;
  deadline: number;
  prosecutor: string | null;
  defender: string | null;
  strength: number | null;
  clues: string[];
  verdict: "guilty" | "not_guilty" | null;
  decidedBy: string | null;
  decidedAt: number | null;
  sentenceMin: number | null;
  restitution: number | null;
  envelope: number;
  canProsecute: string | null;
  canDefend: string | null;
  canJudge: string | null;
  overdue: boolean;
  bail: { payerName: string; amount: number } | null;
  bailAmount: number;
  canBail: string | null;
};
type Patient = { caseId: string; crime: string; victimName: string; district: string; at: number; canExamine: string | null };
type Deposit = { caseId: string; account: string; amount: number; at: number; minutesAfter: number; crime: string; district: string; canReview: string | null };
type ColdCase = {
  caseId: string;
  crime: string;
  victimName: string;
  district: string;
  at: number;
  amount: number;
  clues: string[];
  suspects: { id: string; name: string; matches: number }[];
  canHunt: string | null;
  hunt: { hunterName: string; suspectName: string; won: boolean } | null;
};
type ContractCard = { caseId: string; crime: string; district: string; victimName: string; reward: number; clues: string[]; canTake: string | null };
type Robbery = { caseId: string; amount: number; district: string; at: number; contract: { reward: number; done: boolean } | null; closed: boolean };
type JusticeData = {
  labTips: { crewId: string; district: string; heat: number }[];
  launderFlags: { id: string; amount: number; method: string; at: number; canProbe: string | null }[];
  contracts: ContractCard[];
  robbed: Robbery[];
  cases: CaseCard[];
  court: TrialCard[];
  block: string | null;
  detective: boolean;
  lawyer: boolean;
  judge: boolean;
  canProtect: boolean;
  roles: { medic: boolean; banker: boolean; vigilante: boolean };
  patients: Patient[];
  deposits: Deposit[];
  coldCases: ColdCase[];
  racket: {
    myCases: {
      caseId: string;
      crime: string;
      district: string;
      victimName: string;
      at: number;
      status: string;
      clues: number | null;
      statements: number | null;
      canIntimidate: string | null;
      canPayoff: string | null;
      payoff: { copName: string; amount: number; status: string } | null;
      payoffAllowed: boolean;
      protectedWitnesses: boolean;
    }[];
    cops: { id: string; name: string; title: string }[];
  } | null;
  envelopes: { caseId: string; amount: number; crime: string; district: string; victimName: string }[];
  officials: { id: string; name: string; title: string; path: string | null; canAudit: string | null }[];
  scandals: { caseId: string; name: string; role: string; at: number; by: string }[];
};
type CrewView = {
  id: string;
  name: string;
  tag: string;
  size: number;
  policy: "open" | "request" | "invite";
  leader: string;
  members: { id: string; name: string; role: string }[];
  vault?: number;
  log?: { at: number; text: string }[];
  requests?: { id: string; name: string; at: number }[];
  isLeader?: boolean;
  requested?: boolean;
  invited?: boolean;
  allies?: { id: string; name: string; tag: string }[];
  allyOffers?: { id: string; name: string; tag: string }[];
};
type Invite = { crewId: string; name: string; tag: string; by: string; at: number };
type Hub = {
  players: Profile[];
  crews: CrewView[];
  myCrew: CrewView | null;
  channels: string[];
  blocked: string[];
  invites: Invite[];
  /** Why the viewer can't found a crew, or null. */
  foundBlock: string | null;
  /** Why the viewer can't join a crew (only the Mafia can), or null. */
  joinBlock: string | null;
  forums: { crewId: string; name: string; tag: string; channel: string; own: boolean; isLeader: boolean; guests: { id: string; name: string }[] }[];
  ceremony: { id: string; name: string; made: boolean; block: string | null }[];
  readsCases: boolean;
  lender: "bank" | "shark" | null;
  lab: { district: string; city: string; batches: number; suspicion: string; cook: { id: string; name: string; block: string | null }[] } | null;
  labBuild: boolean;
  police: boolean;
  hit: {
    targetName: string;
    targetId: string;
    hitmanName: string;
    isHitman: boolean;
    isLeader: boolean;
    scouts: number;
    scoutsNeeded: number;
    readyAt: number;
    nextScoutAt: number;
    escrow: number;
    ready: boolean;
  } | null;
  hitmen: { id: string; name: string }[];
  ambush: {
    targetName: string;
    expiresAt: number;
    attackers: string[];
    driver: string | null;
    lookout: string | null;
    mine: boolean;
    isLeader: boolean;
    canAttack: string | null;
    canDrive: string | null;
    canLook: string | null;
  } | null;
  heist: {
    canPlan: string | null;
    plan: {
      city: string;
      isLeader: boolean;
      roles: { id: string; name: string; job: string; who: string | null; canTake: string | null }[];
      ready: boolean;
    } | null;
  } | null;
  breakout: {
    jailed: { id: string; name: string; until: number; reason: string; canPlan: string | null }[];
    plan: {
      targetName: string;
      plannerName: string;
      team: string[];
      odds: string;
      isPlanner: boolean;
      canJoin: string | null;
      canCancel: boolean;
    } | null;
  } | null;
};

const POLICIES = [
  { id: "open", name: "Open", note: "Anyone can join" },
  { id: "request", name: "On request", note: "You approve each request" },
  { id: "invite", name: "Invite only", note: "Only people you invite" },
] as const;
type Message = { id: number; channel: string; authorId: string; authorName: string; body: string; at: number };

const DANGER = ["Easy", "Favorable", "Even", "Risky", "Deadly"];
const STATUS: Record<Profile["status"], string> = { ok: "", hospital: "In the clinic", traveling: "On the road", dead: "Gone" };

function ago(t: number) {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 2) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** The community hub (people, crews, roles), shared by the People tab and the city's buildings. */
export function useHub(game: GameApi) {
  const view = game.view!;
  const [hub, setHub] = useState<Hub | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadHub = useCallback(async () => {
    try {
      const res = await fetch("/api/community", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHub(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach the city.");
    }
  }, []);
  useEffect(() => {
    loadHub();
  }, [loadHub, view.location.country, view.crewId]);
  const social = async (body: Record<string, unknown>) => {
    const v = await game.social(body);
    if (v) loadHub();
    return v;
  };
  return { hub, error, loadHub, social };
}

export function CommunityTab({ game }: { game: GameApi }) {
  const view = game.view!;
  type Section = "people" | "chat" | "crew" | "inbox";
  const [section, setSection] = useState<Section>(() => (takePeopleSection() as Section | null) ?? "people");
  const { hub, error, social } = useHub(game);
  const pulse = usePulse(view.location.country);
  useEffect(() => {
    const on = (e: Event) => {
      const s = (e as CustomEvent<string>).detail as Section;
      if (["people", "chat", "crew", "inbox"].includes(s)) setSection(s);
    };
    window.addEventListener("conspira:section", on);
    return () => window.removeEventListener("conspira:section", on);
  }, []);

  // Opening the inbox marks everything read.
  useEffect(() => {
    if (section === "inbox" && view.inbox.unread > 0) game.act({ type: "read_inbox" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  return (
    <div className="stack">
      <div className="segmented community-tabs">
        {(
          [
            ["people", "People", Users],
            ["chat", "Chat", MessageSquare],
            ["crew", "Crew", Shield],
            ["inbox", "Inbox", Inbox],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} className={section === id ? "on" : ""} onClick={() => setSection(id)}>
            <Icon size={15} /> {label}
            {id === "inbox" && view.inbox.unread > 0 && <span className="badge-dot">{view.inbox.unread}</span>}
          </button>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      {section === "people" && <StreetFeed feed={pulse?.feed} />}
      {section === "people" && <OnlineNow game={game} />}
      {section === "people" && <People game={game} hub={hub} social={social} />}
      {section === "chat" && hub && <Chat game={game} hub={hub} />}
      {section === "crew" && <CrewPanel game={game} hub={hub} social={social} />}
      {section === "inbox" && <InboxPanel game={game} social={social} />}
    </div>
  );
}

type Act = { key: string; label: React.ReactNode; run: () => unknown; danger?: boolean; title?: string };
type Group = { id: string; label: string; acts: Act[] };

/** Everyone's actions, grouped. Only what you can actually do right now is listed. */
function personActions(game: GameApi, hub: Hub, p: Profile, social: (b: Record<string, unknown>) => Promise<unknown>): { primary: Act | null; groups: Group[] } {
  const view = game.view!;
  const blocked = hub.blocked.includes(p.id);
  const street: Act[] = [];
  const crew: Act[] = [];
  const business: Act[] = [];
  const law: Act[] = [];
  const safety: Act[] = [];

  const attack: Act | null = !p.canAttack ? { key: "attack", label: <><Swords size={14} /> Attack</>, danger: true, run: () => social({ op: "attack", targetId: p.id }) } : null;
  for (const { id, label, Icon, note } of CRIME_BUTTONS) {
    if (!p.canCrime?.[id]) street.push({ key: id, label: <><Icon size={13} /> {label}</>, title: `${note}. Anonymous, but witnesses may talk.`, run: () => social({ op: "crime", kind: id, targetId: p.id }) });
  }
  if (!p.regular) {
    street.push({
      key: "bounty",
      label: <>$ Put a bounty</>,
      run: () => {
        const v = window.prompt(`Put a price on ${p.name}'s head. Whoever beats them in a fight collects. Amount from your bank ($100 or more):`, "100");
        if (v) social({ op: "post_bounty", targetId: p.id, amount: Number(v) });
      },
    });
  }

  if (p.canInvite) crew.push({ key: "invite", label: <><Shield size={14} /> Invite to crew</>, run: () => social({ op: "crew_invite", playerId: p.id }) });
  if (p.canForum) crew.push({ key: "forum", label: <><MessagesSquare size={14} /> Invite to forum</>, run: () => social({ op: "forum_invite", playerId: p.id }) });
  if (p.ambush !== undefined && p.ambush !== "n/a" && !p.ambush && !hub.ambush) {
    crew.push({ key: "ambush", label: <>🚐 Plan an ambush</>, danger: true, run: () => confirm(`Plan an ambush on ${p.name}? Your crew gets two hours to take their places.`) && social({ op: "ambush_plan", targetId: p.id }) });
  }
  for (const role of p.hire ?? []) {
    crew.push({ key: `hire-${role}`, label: <>🤝 Hire as {role === "attacker" ? "an attacker" : `the ${role}`}</>, title: "They take an equal cut.", run: () => social({ op: "ambush_hire", regularId: p.id, role }) });
  }
  for (const t of p.torch ?? []) {
    if (!t.block) crew.push({ key: `torch-${t.id}`, label: <>🔥 Torch {t.name}</>, danger: true, title: `About ${t.odds}% chance it catches.`, run: () => confirm(`Torch ${p.name}'s ${t.name}? If you're caught, you go to a cell.`) && social({ op: "torch", targetId: p.id, propertyId: t.id }) });
  }

  if (!p.canVouch) business.push({ key: "vouch", label: <><UserCheck size={14} /> Vouch for them</>, run: () => social({ op: "vouch", targetId: p.id }) });
  if (hub.lender && !p.regular) {
    business.push({
      key: "loan",
      label: <>{hub.lender === "bank" ? "Offer a loan" : "Offer a loan (shark)"}</>,
      run: () => {
        const amount = window.prompt(`Lend ${p.name} how much? (from your bank)`, "100");
        if (!amount) return;
        const max = hub.lender === "bank" ? 20 : 100;
        const rate = window.prompt(`Interest in % (0–${max}). They have three days to pay.`, hub.lender === "bank" ? "10" : "50");
        if (rate) social({ op: "loan_offer", borrowerId: p.id, amount: Number(amount), rate: Number(rate) / 100 });
      },
    });
  }
  if (p.lawyerFee !== null && p.lawyerFee !== undefined) business.push({ key: "lawyer", label: <>Hire as lawyer (${p.lawyerFee}/wk)</>, title: "A week on retainer: if you're arrested, they defend you automatically", run: () => social({ op: "hire_lawyer", lawyerId: p.id }) });
  if (p.surgery && !p.surgery.block) business.push({ key: "surgery", label: <>🩺 Surgery (${p.surgery.fee})</>, title: "Fixes up to two old wounds.", run: () => confirm(`Pay Dr. ${p.name} $${p.surgery!.fee} to operate on your old wounds?`) && social({ op: "surgery", doctorId: p.id }) });
  if (p.canSellGun && view.sellableGear.length > 0) {
    business.push({
      key: "gun",
      label: <>🪖 Sell army gear</>,
      run: () => {
        const item = view.sellableGear[view.sellableGear.length - 1];
        const price = prompt(`Sell ${p.name} a ${item.name.toLowerCase()} from the armory. Your price ($100–$5000):`, "800");
        if (price) social({ op: "gun_offer", targetId: p.id, itemId: item.id, price: Number(price) });
      },
    });
  }

  if (p.canFrisk !== undefined && p.canFrisk !== "n/a" && !p.canFrisk) law.push({ key: "frisk", label: <><Search size={13} /> Frisk</>, title: "Stop and search them for drugs", run: () => social({ op: "frisk", targetId: p.id }) });
  if (p.canCourtMartial !== undefined && p.canCourtMartial !== "n/a" && !p.canCourtMartial) {
    law.push({ key: "cm", label: <><Gavel size={14} /> Court-martial</>, run: () => confirm(`Bring charges against ${p.name}? If their record is clean, it costs you reputation.`) && social({ op: "court_martial", targetId: p.id }) });
  }

  if (!p.regular) {
    safety.push({ key: "block", label: <><Ban size={14} /> {blocked ? "Unblock" : "Block"}</>, run: () => social({ op: blocked ? "unblock" : "block", targetId: p.id }) });
  }

  // The one button on the card: a fight if you can, otherwise the first thing your career offers.
  const primary = attack ?? (p.surgery && !p.surgery.block ? business.find((a) => a.key === "surgery")! : null) ?? street.find((a) => a.key !== "bounty") ?? null;
  const groups: Group[] = [
    { id: "street", label: "Street", acts: [...(attack && primary !== attack ? [attack] : []), ...street.filter((a) => a !== primary)] },
    { id: "crew", label: "Crew", acts: crew },
    { id: "business", label: "Business", acts: business.filter((a) => a !== primary) },
    { id: "law", label: "The law", acts: law },
    { id: "safety", label: "Safety", acts: safety },
  ].filter((g) => g.acts.length);
  return { primary, groups };
}

function People({ game, hub, social }: { game: GameApi; hub: Hub | null; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const view = game.view!;
  const [open, setOpen] = useState<string | null>(null);
  if (!hub) return <p className="muted">Looking around {view.location.city}…</p>;
  if (!hub.players.length) {
    return (
      <section className="card empty">
        <Users size={28} />
        <p>Nobody else is in {view.location.city} right now. Check back later, or travel somewhere busier.</p>
      </section>
    );
  }
  return (
    <div className="people">
      <h3 className="card-title list-title"><Users size={16} /> Everyone in {view.location.city}</h3>
      <p className="muted">Most recently active first. Tap ⋯ for everything you can do.</p>
      {hub.players.map((p) => {
        const { primary, groups } = personActions(game, hub, p, social);
        const expanded = open === p.id;
        const more = groups.reduce((n, g) => n + g.acts.length, 0);
        return (
          <motion.article key={p.id} className={`person compact${expanded ? " open" : ""}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <PlayerAvatar name={p.name} path={p.path} photo={p.photo} className="avatar-md" />
            <div className="person-body">
              <div className="person-head">
                <b>{p.name}</b>
                {p.crewTag && <span className="crew-tag">[{p.crewTag}]</span>}
                {p.regular && <span className="chip chip-regular" title="A street regular: one of the city's characters, run by the game.">Regular{p.regular.out ? " · out now" : ""}</span>}
                {p.protected && <span className="chip chip-green"><Shield size={11} /> New</span>}
                {p.bounty > 0 && <span className="chip chip-red">Wanted · ${p.bounty}</span>}
                {p.rat && <span className="chip chip-red" title="Walked out on the family. Fair game for their old crew.">🐀 Rat</span>}
                {p.trophies?.map((t, i) => (
                  <span key={i} className="chip chip-gold" title={`${t.label}, ${t.seasonName}`}>🏆 #{t.place} {t.label}</span>
                ))}
                {STATUS[p.status] && <span className="chip">{STATUS[p.status]}</span>}
              </div>
              <p className="muted person-line" style={{ color: p.path ? PATH_LOOKS[p.path]?.rim : undefined }}>
                {p.title} · ★ {p.reputation} · {p.regular ? (p.regular.out ? "out now" : "off the street") : `seen ${ago(p.lastSeen)}`}
                {p.streetTitle && <em className="street-title"> · {p.streetTitle}</em>}
              </p>
              {p.bio && <p className={`person-bio${expanded ? "" : " clamp"}`}>“{p.bio}”</p>}
              <div className="person-actions">
                <span className={`danger-pill d${p.danger}`} title={p.read}>{DANGER[p.danger]}</span>
                {primary ? (
                  <button className={`btn btn-sm ${primary.danger ? "btn-danger" : "btn-primary"}`} disabled={game.busy} title={primary.title} onClick={primary.run}>
                    {primary.label}
                  </button>
                ) : (
                  <span className="fine muted person-lock"><Lock size={11} /> {p.canAttack ?? "Nothing to do here right now."}</span>
                )}
                {more > 0 && (
                  <button className="btn btn-ghost btn-sm more-btn" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : p.id)}>
                    {expanded ? "Less" : `⋯ ${more}`}
                  </button>
                )}
                {!p.regular && <ReportButton game={game} targetId={p.id} targetName={p.name} />}
              </div>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div className="action-sheet" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <p className="muted fine">“{p.read}”</p>
                    {groups.map((g) => (
                      <div key={g.id} className="action-group">
                        <span className="crime-label">{g.label}</span>
                        <div className="row wrap">
                          {g.acts.map((a) => (
                            <button key={a.key} className={`btn btn-sm ${a.danger ? "btn-danger" : "btn-ghost"}`} disabled={game.busy} title={a.title} onClick={a.run}>
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {p.contract && hub.hitmen.length > 0 && <ContractButton game={game} target={p} hitmen={hub.hitmen} social={social} />}
                    {p.canAttack && <p className="job-lock"><Lock size={11} /> {p.canAttack}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

const CHANNEL_NAME = (c: string, city: string, crewTag?: string) =>
  c === "global" ? "Global" : c.startsWith("country:") ? city : c.startsWith("yard:") ? "The yard" : `Crew ${crewTag ? `[${crewTag}]` : ""}`;

function Chat({ game, hub, initial }: { game: GameApi; hub: Hub; initial?: string }) {
  const view = game.view!;
  const [channel, setChannel] = useState(initial ?? hub.channels[1] ?? "global");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/community?channel=${encodeURIComponent(channel)}`, { cache: "no-store" });
    if (res.ok) setMessages((await res.json()).messages);
  }, [channel]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <section className="card chat">
      <div className="chips-row">
        {hub.channels.map((c) => (
          <button key={c} className={`chip-btn ${c === channel ? "on" : ""}`} onClick={() => setChannel(c)}>
            {CHANNEL_NAME(c, view.location.city, hub.myCrew?.tag)}
          </button>
        ))}
      </div>
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="muted">Quiet in here. Say something.</p>}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div key={m.id} className={`msg ${m.authorId === view.id ? "mine" : ""}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <span className="msg-author">{m.authorName}</span>
              <span className="msg-body">{m.body}</span>
              <span className="msg-time">{ago(m.at)}</span>
              {m.authorId !== view.id && <ReportButton game={game} targetId={m.authorId} targetName={m.authorName} messageId={m.id} small />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <form
        className="chat-input"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          const v = await game.social({ op: "say", channel, body: text });
          if (v) {
            setText("");
            load();
          }
        }}
      >
        <input maxLength={280} placeholder={`Message ${CHANNEL_NAME(channel, view.location.city, hub.myCrew?.tag)}`} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-primary btn-sm" disabled={game.busy || !text.trim()}><Send size={14} /></button>
      </form>
      <p className="fine">Be decent. Blocked players&apos; messages are hidden from you.</p>
    </section>
  );
}

/** The leader puts out a contract: pick a made man for the job. */
function ContractButton({ game, target, hitmen, social }: { game: GameApi; target: Profile; hitmen: { id: string; name: string }[]; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [hitman, setHitman] = useState(hitmen[0]?.id ?? "");
  const c = target.contract!;
  if (!open) {
    return (
      <button className="btn btn-danger btn-sm" disabled={game.busy || !!c.block} title={c.block ?? ""} onClick={() => setOpen(true)}>
        ☠️ Put out a contract
      </button>
    );
  }
  return (
    <span className="row contract-row">
      <select value={hitman} onChange={(e) => setHitman(e.target.value)} aria-label="Hitman">
        {hitmen.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
      </select>
      <button
        className="btn btn-danger btn-sm"
        disabled={game.busy}
        onClick={() => confirm(`Put out a contract on ${target.name}? $${c.cost.toLocaleString("en")} from the vault goes into escrow.`) && social({ op: "hit_order", targetId: target.id, hitmanId: hitman })}
      >
        Sign off · ${c.cost.toLocaleString("en")}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Not now</button>
    </span>
  );
}

/** A planned ambush: crew members take roles, then the leader gives the signal. */
function AmbushCard({ game, a, social }: { game: GameApi; a: NonNullable<Hub["ambush"]>; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const mins = Math.max(0, Math.round((a.expiresAt - Date.now()) / 60_000));
  const roles: { id: string; label: string; who: string; why: string; block: string | null }[] = [
    { id: "attacker", label: "🥊 Attackers (up to 3)", who: a.attackers.join(", ") || "nobody yet", why: "Each extra attacker counts for a little less than the one before.", block: a.canAttack },
    { id: "driver", label: "🚐 Driver", who: a.driver ?? "nobody yet", why: "Agility. Nobody gets left behind; if it goes wrong, you get out with half the damage.", block: a.canDrive },
    { id: "lookout", label: "👀 Lookout", who: a.lookout ?? "nobody yet", why: "Perception. No witnesses, their crew isn't warned in time, half the heat.", block: a.canLook },
  ];
  return (
    <section className="card ambush">
      <h3 className="card-title">🚐 The ambush on {a.targetName}</h3>
      <p className="muted">{mins} min left to take your places. Their bodyguards and any crewmates nearby will fight back.</p>
      <ul className="role-list">
        {roles.map((r) => (
          <li key={r.id} className="row">
            <span>
              <b>{r.label}</b>: {r.who}
              <br />
              <span className="fine">{r.why}</span>
            </span>
            {!a.mine && (
              <button className="btn btn-ghost btn-xs" disabled={game.busy || !!r.block} title={r.block ?? ""} onClick={() => social({ op: "ambush_role", role: r.id })}>
                Take it
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="row">
        {a.mine && <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: "ambush_leave" })}>Drop out</button>}
        {a.isLeader && (
          <>
            <button className="btn btn-danger btn-sm" disabled={game.busy || a.attackers.length === 0} title={a.attackers.length ? "" : "You need at least one attacker."} onClick={() => social({ op: "ambush_go" })}>
              Give the signal
            </button>
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: "ambush_cancel" })}>Call it off</button>
          </>
        )}
      </div>
    </section>
  );
}

/** The crew's contract: casing the target, then the hit. */
function HitCard({ game, hit, social }: { game: GameApi; hit: NonNullable<Hub["hit"]>; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const now = Date.now();
  const hrs = (t: number) => Math.max(0, Math.ceil((t - now) / 3_600_000));
  return (
    <section className="card hit-card">
      <h3 className="card-title">☠️ The contract</h3>
      <p>
        <b>{hit.targetName}</b> · {hit.hitmanName} has the job · ${hit.escrow.toLocaleString("en")} in escrow
      </p>
      <div className="hit-steps">
        {Array.from({ length: hit.scoutsNeeded }, (_, i) => (
          <span key={i} className={`hit-step ${i < hit.scouts ? "done" : ""}`}>Casing {i + 1}</span>
        ))}
        <span className={`hit-step ${hit.ready ? "done" : ""}`}>{hit.ready ? "Ready" : now < hit.readyAt ? `Ready in ${hrs(hit.readyAt)}h` : "Ready"}</span>
      </div>
      <p className="fine muted">The target will notice someone around them, but not who. They may hire bodyguards, go to ground, or call the police.</p>
      <div className="row wrap">
        {hit.isHitman && hit.scouts < hit.scoutsNeeded && (
          <button className="btn btn-ghost btn-sm" disabled={game.busy || now < hit.nextScoutAt} title={now < hit.nextScoutAt ? "Don't be seen around them too often." : ""} onClick={() => social({ op: "hit_scout" })}>
            Case them (20 energy)
          </button>
        )}
        {hit.isHitman && (
          <button className="btn btn-danger btn-sm" disabled={game.busy || !hit.ready} onClick={() => confirm(`Go through with the hit on ${hit.targetName}?`) && social({ op: "hit_execute" })}>
            Do it (30 energy)
          </button>
        )}
        {hit.isLeader && (
          <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => confirm("Call it off? Half the escrow is lost.") && social({ op: "hit_cancel" })}>
            Call it off
          </button>
        )}
      </div>
    </section>
  );
}

/** The leader opens the crew's secret forum. */
function ForumCreate({ game, social }: { game: GameApi; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const [name, setName] = useState("");
  return (
    <section className="card">
      <h3 className="card-title"><MessagesSquare size={16} /> Secret forum</h3>
      <p className="muted fine">A private board for your crew and anyone you invite: a cop on the payroll, a doctor who doesn&apos;t ask, a banker who cleans. Guests don&apos;t join the crew. $1,000 from the vault.</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); social({ op: "forum_create", name }).then(() => setName("")); }}>
        <input maxLength={30} placeholder="Forum name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary btn-sm" disabled={game.busy || name.trim().length < 3}>Open it</button>
      </form>
    </section>
  );
}

/** A secret forum: posts from the crew and its invited guests. */
function ForumBoard({ game, forum, social }: { game: GameApi; forum: Hub["forums"][number]; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const view = game.view!;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(true);
  const load = useCallback(async () => {
    const res = await fetch(`/api/community?channel=${encodeURIComponent(forum.channel)}`, { cache: "no-store" });
    if (res.ok) setMessages((await res.json()).messages);
  }, [forum.channel]);
  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);
  return (
    <section className="card forum">
      <div className="row between">
        <h3 className="card-title"><MessagesSquare size={16} /> {forum.name} <span className="crew-tag">[{forum.tag}]</span></h3>
        <button className="btn btn-ghost btn-xs" onClick={() => setOpen(!open)}>{open ? "Hide" : "Open"}</button>
      </div>
      <p className="muted fine">
        Secret forum. {forum.own ? `Your crew${forum.guests.length ? ` and ${forum.guests.length} guest${forum.guests.length === 1 ? "" : "s"}` : ""}.` : "You're a guest here."}
      </p>
      {open && (
        <>
          <div className="forum-posts">
            {messages.length === 0 && <p className="muted">Nothing posted yet.</p>}
            {[...messages].reverse().map((m) => (
              <article key={m.id} className={`forum-post ${m.authorId === view.id ? "mine" : ""}`}>
                <header>
                  <b>{m.authorName}</b> <span className="muted">· {ago(m.at)}</span>
                  {m.authorId !== view.id && <ReportButton game={game} targetId={m.authorId} targetName={m.authorName} messageId={m.id} small />}
                </header>
                <p>{m.body}</p>
              </article>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!text.trim()) return;
              if (await game.social({ op: "say", channel: forum.channel, body: text })) {
                setText("");
                load();
              }
            }}
          >
            <input maxLength={280} placeholder="Post to the forum" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={game.busy || !text.trim()}><Send size={14} /></button>
          </form>
          {forum.isLeader && (
            <div className="forum-admin">
              {forum.guests.length > 0 && <span className="crime-label">Guests</span>}
              <div className="row wrap">
                {forum.guests.map((g) => (
                  <span key={g.id} className="chip">
                    {g.name}{" "}
                    <button className="chip-x" title="Remove" disabled={game.busy} onClick={() => social({ op: "forum_remove", playerId: g.id })}>×</button>
                  </span>
                ))}
              </div>
              <p className="fine muted">Invite guests from the People list. Anyone can be a guest, whatever their career.</p>
              <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => confirm("Shut the forum down? Guests lose access.") && social({ op: "forum_close" })}>Shut it down</button>
            </div>
          )}
          {!forum.own && (
            <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => confirm("Leave this forum?") && social({ op: "forum_leave", crewId: forum.crewId })}>Leave forum</button>
          )}
        </>
      )}
    </section>
  );
}

/** Allied crews fight in each other's wars and don't charge each other protection. */
function AlliancesCard({ game, crew, crews, social }: { game: GameApi; crew: CrewView; crews: CrewView[]; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const allies = crew.allies ?? [];
  const offers = crew.allyOffers ?? [];
  const others = crews.filter((x) => x.id !== crew.id && !allies.some((a) => a.id === x.id) && !offers.some((o) => o.id === x.id));
  if (!crew.isLeader && allies.length === 0) return null;
  return (
    <section className="card">
      <h3 className="card-title"><Handshake size={16} /> Alliances</h3>
      <p className="muted fine">Allies can fight in each other&apos;s turf wars and don&apos;t pay each other protection money. Up to 2.</p>
      {allies.length === 0 && <p className="muted">No allies yet.</p>}
      {allies.map((a) => (
        <div key={a.id} className="crew-row">
          <span className="crew-badge sm">{a.tag}</span>
          <div className="crew-row-body"><b>{a.name}</b><span className="muted">Allied</span></div>
          {crew.isLeader && (
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => confirm(`Break the alliance with ${a.name}?`) && social({ op: "crew_ally", what: "break", crewId: a.id })}>
              Break
            </button>
          )}
        </div>
      ))}
      {offers.length > 0 && <h4 className="subhead">Offers</h4>}
      {offers.map((o) => (
        <div key={o.id} className="crew-row">
          <span className="crew-badge sm">{o.tag}</span>
          <div className="crew-row-body"><b>{o.name}</b><span className="muted">wants an alliance</span></div>
          <span className="row">
            <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => social({ op: "crew_ally", what: "accept", crewId: o.id })}>Accept</button>
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: "crew_ally", what: "decline", crewId: o.id })}>No</button>
          </span>
        </div>
      ))}
      {crew.isLeader && allies.length < 2 && others.length > 0 && (
        <>
          <h4 className="subhead">Propose an alliance</h4>
          {others.slice(0, 8).map((x) => (
            <div key={x.id} className="crew-row">
              <span className="crew-badge sm">{x.tag}</span>
              <div className="crew-row-body"><b>{x.name}</b><span className="muted">{x.size} members{x.allies?.length ? ` · allied with ${x.allies.map((a) => a.tag).join(", ")}` : ""}</span></div>
              <button className="btn btn-ghost btn-sm" disabled={game.busy || offers.some((o) => o.id === x.id)} onClick={() => social({ op: "crew_ally", what: "propose", crewId: x.id })}>
                Propose
              </button>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function CrewPanel({ game, hub, social }: { game: GameApi; hub: Hub | null; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const view = game.view!;
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [policy, setPolicy] = useState<"open" | "request" | "invite">("request");
  if (!hub) return <p className="muted">Loading crews…</p>;
  const c = hub.myCrew;
  const forums = hub.forums.map((f) => <ForumBoard key={f.crewId} game={game} forum={f} social={social} />);

  if (c) {
    return (
      <div className="stack">
        {forums}
        {c.isLeader && !hub.forums.some((f) => f.own) && <ForumCreate game={game} social={social} />}
        <section className="card crew-hero">
          <div className="crew-banner">
            <span className="crew-badge">{c.tag}</span>
            <div>
              <h2>{c.name}</h2>
              <p className="muted">{c.size} member{c.size === 1 ? "" : "s"} · led by {c.leader} · +5% pay on every job</p>
            </div>
          </div>
        </section>
        {(hub.lab || hub.labBuild) && (
          <section className="card lab has-banner">
            <Scene kind="lab" className="banner-scene" />
            <h3 className="card-title">⚗️ Crew lab</h3>
            {hub.lab ? (
              <>
                <p className="muted">In {hub.lab.district}, {hub.lab.city}. {hub.lab.batches} batches so far. Word on the street: <b>{hub.lab.suspicion}</b>.</p>
                {hub.lab.cook.length > 0 ? (
                  <div className="row wrap">
                    {hub.lab.cook.map((d) => (
                      <button key={d.id} className="btn btn-primary btn-sm" disabled={game.busy || !!d.block} title={d.block ?? ""} onClick={() => social({ op: "lab_cook", drug: d.id })}>
                        Cook {d.name} (×2)
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="fine muted">You don&apos;t know enough chemistry to cook. Doctors and sharp minds do.</p>
                )}
                <p className="fine muted">The lab cooks twice as much, but every batch makes the neighbors more suspicious. Hot labs get raided.</p>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: "lab_build" })}>Set up a lab ($15,000 from the vault)</button>
            )}
          </section>
        )}
        {hub.heist && (hub.heist.plan || !hub.heist.canPlan) && (
          <section className="card heist">
            <h3 className="card-title">🏦 Bank job</h3>
            {hub.heist.plan ? (
              <>
                <p className="muted">A bank in {hub.heist.plan.city}. Every role that goes right makes it safer and richer.</p>
                <ul className="officials">
                  {hub.heist.plan.roles.map((r) => (
                    <li key={r.id}>
                      <span><b>{r.name}</b> <span className="muted">· {r.job}</span>{r.who && <span className="chip chip-green"> {r.who}</span>}</span>
                      {!r.who && !r.canTake && (
                        <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => social({ op: "heist_role", role: r.id })}>Take it</button>
                      )}
                    </li>
                  ))}
                </ul>
                {hub.heist.plan.isLeader && (
                  <div className="row wrap">
                    <button className="btn btn-danger btn-sm" disabled={game.busy || !hub.heist.plan.ready} title={hub.heist.plan.ready ? "" : "You need at least a driver and a safecracker."} onClick={() => social({ op: "heist_go" })}>
                      Give the word
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: "heist_cancel" })}>Call it off</button>
                  </div>
                )}
                <p className="fine muted">Driver: no getaway, everyone's caught. Safecracker: no vault, no money. Lookout: double heat. Muscle: everyone gets hurt, less money.</p>
              </>
            ) : (
              <button className="btn btn-danger btn-sm" disabled={game.busy} onClick={() => social({ op: "heist_plan" })}>Plan a bank job</button>
            )}
          </section>
        )}
        {hub.breakout && (hub.breakout.plan || hub.breakout.jailed.length > 0) && (
          <section className="card breakout">
            <h3 className="card-title"><Lock size={16} /> Prison break</h3>
            {hub.breakout.plan ? (
              <>
                <p>
                  <b>{hub.breakout.plan.plannerName}</b> is planning to break <b>{hub.breakout.plan.targetName}</b> out.
                </p>
                <p className="muted">In on it: {hub.breakout.plan.team.join(", ")}. The crew says the odds are <b>{hub.breakout.plan.odds}</b>.</p>
                <div className="row wrap">
                  {!hub.breakout.plan.canJoin && (
                    <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => social({ op: "breakout_join" })}>Get in on it</button>
                  )}
                  {hub.breakout.plan.isPlanner && (
                    <button className="btn btn-danger btn-sm" disabled={game.busy} onClick={() => social({ op: "breakout_go" })}>Give the signal</button>
                  )}
                  {hub.breakout.plan.canCancel && (
                    <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: "breakout_cancel" })}>Call it off</button>
                  )}
                </div>
                <p className="fine muted">More people, and sharper, bolder crews, make it likelier. If it fails, everyone in on it lands in a cell and they add time to the sentence.</p>
              </>
            ) : (
              <ul className="officials">
                {hub.breakout.jailed.map((m) => (
                  <li key={m.id}>
                    <span><b>{m.name}</b> <span className="muted">· free in {Math.max(1, Math.ceil((m.until - Date.now()) / 60000))} min</span></span>
                    {!m.canPlan && (
                      <button className="btn btn-danger btn-xs" disabled={game.busy} onClick={() => social({ op: "breakout_plan", playerId: m.id })}>Plan a breakout</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <section className="card">
          <h3 className="card-title"><Vault size={16} /> Crew vault</h3>
          <p className="big-number">${(c.vault ?? 0).toLocaleString()}</p>
          <p className="muted">Anyone can put cash in. Only the leader can take it out.</p>
          <div className="row">
            <input inputMode="numeric" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            <button className="btn btn-primary btn-sm" disabled={game.busy || !amount} onClick={() => social({ op: "crew_deposit", amount: Number(amount) }).then(() => setAmount(""))}>Deposit</button>
            {c.isLeader && (
              <button className="btn btn-ghost btn-sm" disabled={game.busy || !amount} onClick={() => social({ op: "crew_withdraw", amount: Number(amount) }).then(() => setAmount(""))}>Withdraw</button>
            )}
          </div>
        </section>
        {c.isLeader && (
          <section className="card">
            <h3 className="card-title"><Lock size={16} /> Who can join</h3>
            <div className="policy-pick">
              {POLICIES.map((po) => (
                <button key={po.id} className={c.policy === po.id ? "on" : ""} disabled={game.busy} onClick={() => social({ op: "crew_policy", policy: po.id })}>
                  <b>{po.name}</b>
                  <span>{po.note}</span>
                </button>
              ))}
            </div>
            <p className="fine">Invite people from the People list. Invited players can join whatever the setting.</p>
          </section>
        )}
        {c.isLeader && (c.requests?.length ?? 0) > 0 && (
          <section className="card">
            <h3 className="card-title"><UserCheck size={16} /> Join requests</h3>
            {c.requests!.map((r) => (
              <div key={r.id} className="row between inv-row">
                <span>{r.name}</span>
                <span className="row">
                  <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => social({ op: "crew_accept", playerId: r.id })}>Let in</button>
                  <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: "crew_decline", playerId: r.id })}>Decline</button>
                </span>
              </div>
            ))}
          </section>
        )}
        {hub.hit && <HitCard game={game} hit={hub.hit} social={social} />}
        {hub.ambush && <AmbushCard game={game} a={hub.ambush} social={social} />}
        <AlliancesCard game={game} crew={c} crews={hub.crews} social={social} />
        {c.isLeader && hub.ceremony.length > 0 && (
          <section className="card">
            <h3 className="card-title"><Flame size={16} /> The making ceremony</h3>
            <p className="muted fine">Swear a soldier in: a candle, a saint&apos;s card, an oath. Costs $2,500 from the vault. Only made men rise to Made Man and beyond.</p>
            {hub.ceremony.map((m) => (
              <div key={m.id} className="row between inv-row">
                <span>{m.name} {m.made && <span className="chip chip-gold">Made</span>}</span>
                {!m.made && (
                  <button className="btn btn-ghost btn-sm" disabled={game.busy || !!m.block} title={m.block ?? ""} onClick={() => social({ op: "crew_make", playerId: m.id })}>
                    Make them
                  </button>
                )}
              </div>
            ))}
            {hub.ceremony.some((m) => !m.made && m.block) && <p className="fine muted">{hub.ceremony.find((m) => !m.made && m.block)?.block}</p>}
          </section>
        )}
        <section className="card">
          <h3 className="card-title"><Users size={16} /> Members</h3>
          {c.members.map((m) => (
            <div key={m.id} className="row inv-row">
              <PlayerAvatar name={m.name} className="avatar-xs" />
              <span>{m.name}</span>
              {m.role === "leader" && <span className="chip chip-amber"><Crown size={11} /> Leader</span>}
            </div>
          ))}
        </section>
        <section className="card">
          <h3 className="card-title"><MessageSquare size={16} /> Crew log</h3>
          {c.isLeader && (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                social({ op: "crew_note", body: note }).then(() => setNote(""));
              }}
            >
              <input maxLength={280} placeholder="Pin a note for your crew" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-ghost btn-sm" disabled={game.busy || !note.trim()}>Pin</button>
            </form>
          )}
          <ul className="log">
            {(c.log ?? []).map((l, i) => (
              <li key={i}>{l.text} <span className="muted">· {ago(l.at)}</span></li>
            ))}
          </ul>
          <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => confirm("Leave the crew?") && social({ op: "crew_leave" })}>
            Leave crew
          </button>
        </section>
      </div>
    );
  }

  const joinLabel = (cr: CrewView) =>
    cr.invited ? "Accept invite" : cr.policy === "open" ? "Join" : cr.policy === "invite" ? "Invite only" : cr.requested ? "Requested" : "Ask to join";

  if (hub.joinBlock) {
    return (
      <div className="stack">
        {forums}
        <section className="card">
          <h3 className="card-title"><Shield size={16} /> Crews</h3>
          <p className="muted">{hub.joinBlock} If a crew trusts you, its leader can still let you into their secret forum.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      {forums}
      {hub.invites.length > 0 && (
        <section className="card invites">
          <h3 className="card-title"><UserCheck size={16} /> Invitations</h3>
          {hub.invites.map((i) => (
            <div key={i.crewId} className="crew-row">
              <span className="crew-badge sm">{i.tag}</span>
              <div className="crew-row-body">
                <b>{i.name}</b>
                <span className="muted">Invited by {i.by} · {ago(i.at)}</span>
              </div>
              <span className="row">
                <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => social({ op: "crew_join", crewId: i.crewId })}>Join</button>
                <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: "crew_decline_invite", crewId: i.crewId })}>No thanks</button>
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h3 className="card-title"><Shield size={16} /> Crews</h3>
        {hub.crews.length === 0 && <p className="muted">No crews in town yet.</p>}
        {hub.crews.map((cr) => (
          <div key={cr.id} className="crew-row">
            <span className="crew-badge sm">{cr.tag}</span>
            <div className="crew-row-body">
              <b>{cr.name}</b>
              <span className="muted">{cr.size} members · led by {cr.leader} · {POLICIES.find((po) => po.id === cr.policy)?.name}</span>
            </div>
            <button
              className={`btn btn-sm ${cr.invited || cr.policy === "open" ? "btn-primary" : "btn-ghost"}`}
              disabled={game.busy || cr.requested || (cr.policy === "invite" && !cr.invited)}
              onClick={() => social({ op: "crew_join", crewId: cr.id })}
            >
              {joinLabel(cr)}
            </button>
          </div>
        ))}
      </section>

      {!hub.foundBlock && (
      <section className="card">
        <h3 className="card-title"><Crown size={16} /> Found a crew</h3>
        {(
          <>
            <p className="muted">$5,000 cash. Crew members earn 5% more on every job, share a vault and a private chat.</p>
            <div className="row">
              <input maxLength={24} placeholder="Crew name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="tag-input" maxLength={4} placeholder="TAG" value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} />
            </div>
            <div className="policy-pick">
              {POLICIES.map((po) => (
                <button key={po.id} className={policy === po.id ? "on" : ""} onClick={() => setPolicy(po.id)}>
                  <b>{po.name}</b>
                  <span>{po.note}</span>
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary"
              disabled={game.busy || name.trim().length < 3 || tag.length < 2 || view.cash < 500}
              onClick={() => social({ op: "crew_create", name, tag, policy })}
            >
              <Crown size={15} /> Found · $5,000
            </button>
          </>
        )}
      </section>
      )}
    </div>
  );
}

function InboxPanel({ game, social }: { game: GameApi; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const items = game.view!.inbox.items;
  if (!items.length) {
    return (
      <section className="card empty">
        <Inbox size={28} />
        <p>Nothing yet. When someone attacks you, vouches for you or answers your crew request, it shows up here.</p>
      </section>
    );
  }
  return (
    <section className="card">
      <ul className="log inbox">
        {items.map((n) => (
          <li key={n.id} className={n.tone}>
            <span>{n.text} <span className="muted">· {ago(n.at)}</span></span>
            {n.fromId && n.tone === "bad" && /attacked you/.test(n.text) && (
              <button className="btn btn-danger btn-sm" disabled={game.busy} onClick={() => social({ op: "attack", targetId: n.fromId })}>
                <Swords size={12} /> Revenge
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Crimes the player saw: report them or look away. Used on Home and in Cases. */
export function Sightings({ game, compact = false }: { game: GameApi; compact?: boolean }) {
  const sightings = game.view!.sightings;
  if (!sightings.length) return null;
  return (
    <section className="card sightings">
      <h3 className="card-title"><Eye size={16} /> You saw something</h3>
      {!compact && <p className="muted">Report it and the police get one clue. Your name stays out of it, but the criminal hears that someone talked.</p>}
      <ul className="sighting-list">
        {sightings.map((s) => (
          <li key={s.caseId}>
            <p>{s.text}</p>
            <div className="row">
              <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => game.social({ op: "report", caseId: s.caseId })}>
                <Siren size={14} /> Report it
              </button>
              <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.social({ op: "ignore", caseId: s.caseId })}>
                <EyeOff size={14} /> Look away
              </button>
              <span className="muted fine">{Math.max(1, Math.round((s.until - Date.now()) / 60000))}m left</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SOURCE_LABEL: Record<CaseCard["tips"][number]["source"], string> = {
  witness: "Witness",
  victim: "Victim",
  bystander: "Bystander",
  detective: "Detective",
  doctor: "Doctor",
  bank: "Bank",
};

export type PlaceId = "police" | "court" | "hospital" | "bank" | "street";

/** Everything about crime and justice, filtered to one building of the city. */
export function CasesPanel({ game, hub, place }: { game: GameApi; hub: Hub | null; place: PlaceId }) {
  const at = (x: PlaceId) => x === place;
  const view = game.view!;
  const [data, setData] = useState<JusticeData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/community?cases=1", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load, view.location.country]);

  const act = async (body: Record<string, unknown>) => {
    if (await game.social(body)) load();
  };
  const docket = data?.court.filter((t) => !t.verdict) ?? [];
  const record = data?.court.filter((t) => t.verdict) ?? [];

  return (
    <div className="stack">
      {at("police") && <Sightings game={game} />}
      {at("police") && !view.sightings.length && (
        <section className="card empty">
          <Eye size={26} />
          <p>You haven&apos;t seen anything lately. When someone gets robbed near you, you&apos;ll decide here whether to report it.</p>
        </section>
      )}

      {at("police") && data && data.envelopes.length > 0 && (
        <section className="card envelope-card">
          <h3 className="card-title">✉️ An envelope on your desk</h3>
          {data.envelopes.map((x) => (
            <div key={x.caseId} className="case">
              <p><b>${x.amount}</b> in cash, and a note: <i>&quot;Case #{x.caseId}. Lose it.&quot;</i></p>
              <p className="muted">The {x.crime} on {x.victimName} in {x.district}.</p>
              <div className="row wrap">
                <button className="btn btn-ghost btn-sm envelope" disabled={game.busy} onClick={() => act({ op: "payoff_answer", caseId: x.caseId, take: true })}>
                  Take it and lose the file
                </button>
                <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => act({ op: "payoff_answer", caseId: x.caseId, take: false })}>
                  Send it back and log it
                </button>
              </div>
              <p className="fine muted">Taking it costs integrity, and internal affairs keeps records.</p>
            </div>
          ))}
        </section>
      )}

      {at("street") && data?.racket && <Racket game={game} racket={data.racket} act={act} />}

      {at("police") && data && (data.labTips.length > 0 || data.launderFlags.length > 0) && (
        <section className="card">
          <h3 className="card-title"><FileSearch size={16} /> Narcotics & financial crimes</h3>
          <ul className="officials">
            {data.labTips.map((t) => (
              <li key={t.crewId}>
                <span>Neighbors in <b>{t.district}</b> complain about a chemical smell.</span>
                <button className="btn btn-danger btn-xs" disabled={game.busy} onClick={() => act({ op: "raid_lab", crewId: t.crewId })}>Raid</button>
              </li>
            ))}
            {data.launderFlags.map((f) => (
              <li key={f.id}>
                <span>${f.amount} laundered through {f.method.toLowerCase()} · {ago(f.at)}</span>
                <button className="btn btn-ghost btn-xs" disabled={game.busy || !!f.canProbe} title={f.canProbe ?? ""} onClick={() => act({ op: "probe", flagId: f.id })}>Follow the money</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {at("street") && data && data.contracts.length > 0 && (
        <section className="card">
          <h3 className="card-title">💼 Contracts · get someone's money back</h3>
          <div className="case-list">
            {data.contracts.map((k) => (
              <article key={k.caseId} className="case">
                <header>
                  <b>${k.reward} reward</b>
                  <span className="chip">#{k.caseId}</span>
                </header>
                <p className="muted">{k.victimName} was hit by a {k.crime.toLowerCase()} in {k.district}.</p>
                <ul className="tips">{k.clues.map((t, i) => <li key={i}>{t}</li>)}</ul>
                <button className="btn btn-danger btn-sm" disabled={game.busy || !!k.canTake} title={k.canTake ?? ""} onClick={() => act({ op: "work_contract", caseId: k.caseId })}>
                  Take the job
                </button>
                {k.canTake && <p className="job-lock"><Lock size={11} /> {k.canTake}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {at("police") && data && data.robbed.some((r) => !r.closed) && (
        <section className="card">
          <h3 className="card-title">💸 You were robbed</h3>
          <ul className="officials">
            {data.robbed.filter((r) => !r.closed).map((r) => (
              <li key={r.caseId}>
                <span>#{r.caseId} · ${r.amount} in {r.district}</span>
                {r.contract ? (
                  <span className="muted fine">{r.contract.done ? "Contract done" : `$${r.contract.reward} contract out`}</span>
                ) : (
                  <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => {
                    const v = window.prompt("Offer how much to whoever gets your money back? (from your bank)", "100");
                    if (v) act({ op: "post_contract", caseId: r.caseId, reward: Number(v) });
                  }}>Hire someone to get it back</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {at("police") && data && data.officials.length > 0 && (
        <section className="card">
          <h3 className="card-title"><ShieldAlert size={16} /> Internal affairs · {view.location.city}</h3>
          <p className="muted">Audit an official. If they took an envelope, buried a deposit or lost a file, it comes out: a fine, a demotion and a cell. Once a day per person.</p>
          <ul className="officials">
            {data.officials.map((o) => (
              <li key={o.id}>
                <span>
                  <b style={{ color: o.path ? PATH_LOOKS[o.path]?.rim : undefined }}>{o.name}</b> <span className="muted">· {o.title}</span>
                </span>
                <button className="btn btn-ghost btn-xs" disabled={game.busy || !!o.canAudit} title={o.canAudit ?? ""} onClick={() => act({ op: "audit", targetId: o.id })}>
                  <Search size={12} /> Audit
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {at("hospital") && data?.roles.medic && (
        <section className="card">
          <h3 className="card-title"><Stethoscope size={16} /> Clinic · patients</h3>
          {data.patients.length === 0 && <p className="muted">No crime victims waiting to be seen.</p>}
          <div className="case-list">
            {data.patients.map((x) => (
              <article key={x.caseId} className="case">
                <header>
                  <b>{x.victimName}</b>
                  <span className="chip">#{x.caseId}</span>
                </header>
                <p className="muted">Victim of a {x.crime.toLowerCase()} in {x.district} · {ago(x.at)}</p>
                <button className="btn btn-primary btn-sm" disabled={game.busy || !!x.canExamine} title={x.canExamine ?? ""} onClick={() => act({ op: "examine", caseId: x.caseId })}>
                  <Stethoscope size={14} /> Examine injuries
                </button>
                {x.canExamine && <p className="job-lock"><Lock size={11} /> {x.canExamine}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {at("bank") && data?.roles.banker && (
        <section className="card">
          <h3 className="card-title"><Landmark size={16} /> Compliance desk · flagged deposits</h3>
          {data.deposits.length === 0 && <p className="muted">No suspicious deposits. Clean money today. Probably.</p>}
          <div className="case-list">
            {data.deposits.map((x) => (
              <article key={x.caseId} className="case">
                <header>
                  <b>Account {x.account}</b>
                  <span className="chip chip-gold">${x.amount} cash</span>
                </header>
                <p className="muted">Deposited {x.minutesAfter} min after a reported {x.crime.toLowerCase()} in {x.district}.</p>
                <div className="row wrap">
                  <button className="btn btn-primary btn-sm" disabled={game.busy || !!x.canReview} onClick={() => act({ op: "review_deposit", caseId: x.caseId, choice: "report" })}>
                    <Siren size={14} /> Report to police
                  </button>
                  <button className="btn btn-ghost btn-sm" disabled={game.busy || !!x.canReview} onClick={() => act({ op: "review_deposit", caseId: x.caseId, choice: "bury" })}>
                    Bury it (take a fee)
                  </button>
                </div>
                {x.canReview && <p className="job-lock"><Lock size={11} /> {x.canReview}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {at("street") && data?.roles.vigilante && (
        <section className="card">
          <h3 className="card-title"><Moon size={16} /> Cold cases · the police gave up</h3>
          {data.coldCases.length === 0 && <p className="muted">No cold cases. The police are doing their job, for once.</p>}
          <div className="case-list">
            {data.coldCases.map((x) => (
              <article key={x.caseId} className={`case ${x.hunt ? "cold" : ""}`}>
                <header>
                  <b>#{x.caseId} · {x.crime}</b>
                  <span className="chip">{x.hunt ? (x.hunt.won ? "Handled" : "Got away") : "Cold"}</span>
                </header>
                <p className="muted">{x.victimName} · {x.district} · {ago(x.at)}{x.amount ? ` · $${x.amount} taken` : ""}</p>
                <ul className="tips">{x.clues.map((t, i) => <li key={i}>{t}</li>)}</ul>
                {x.hunt && <p className="fine">{x.hunt.hunterName} went after {x.hunt.suspectName}{x.hunt.won ? " and won." : ", who fought them off."}</p>}
                {!x.hunt && x.suspects.length > 0 && (
                  <div className="suspects">
                    <span className="crime-label">People who fit</span>
                    {x.suspects.map((sus) => (
                      <span key={sus.id} className="suspect">
                        <span className="chip">{sus.name} · {sus.matches}/{x.clues.length}</span>
                        <button className="btn btn-danger btn-xs" disabled={game.busy || !!x.canHunt} onClick={() => act({ op: "hunt", caseId: x.caseId, suspectId: sus.id })}>
                          <Swords size={12} /> Hunt
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {!x.hunt && <p className="fine muted">No badge, no court. Win and the victim gets paid back. Lose and you&apos;re hurt. Either way, you draw heat.</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {at("police") && hub?.readsCases && (
        <section className="card has-banner">
          <Scene kind="crimescene" className="banner-scene" />
          <div className="row between">
            <h3 className="card-title"><FileSearch size={16} /> Case files · {view.location.city}</h3>
            <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
          </div>
          {!data && <p className="muted">Pulling the files…</p>}
          {data && data.cases.length === 0 && <p className="muted">No open cases. A quiet night in {view.location.city}.</p>}
          <div className="case-list">
            {data?.cases.map((c) => (
              <article key={c.id} className={`case ${c.open || c.arrested ? "" : "cold"}`}>
                <header>
                  <b>#{c.id} · {c.crime}</b>
                  <span className={`chip ${c.open ? "chip-red" : ""}`}>{c.arrested ? "In court" : c.open ? "Open" : "Cold"}</span>
                </header>
                <p className="muted">
                  {c.victimName} · {c.district} · {ago(c.at)}{c.amount ? ` · $${c.amount} taken` : ""}
                </p>
                <ul className="tips">
                  {c.tips.length === 0 && <li className="muted">No clues yet.</li>}
                  {c.tips.map((t) => (
                    <li key={t.id}>
                      <span className={`tip-src ${t.source}`}>{SOURCE_LABEL[t.source]}</span> {t.text.replace(/^[^:]+: /, "")}
                    </li>
                  ))}
                </ul>
                {c.arrested && <p className="fine">Detective {c.arrested.officerName} arrested <b>{c.arrested.suspectName}</b>. The case is in court.</p>}
                {c.searches.map((s, i) => (
                  <p key={i} className="fine">Warrant served on {s.name}: {s.found ? <b>stolen goods found</b> : "nothing found"}.</p>
                ))}
                {c.protectedBy ? (
                  <p className="fine"><ShieldCheck size={12} /> Witnesses under police protection (ordered by {c.protectedBy}).</p>
                ) : data.canProtect && c.open && c.witnessStatements > 0 ? (
                  <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => act({ op: "protect_witnesses", caseId: c.id })}>
                    <ShieldCheck size={14} /> Protect the {c.witnessStatements === 1 ? "witness" : `${c.witnessStatements} witnesses`} ($50 from the treasury)
                  </button>
                ) : null}
                {c.suspects && c.suspects.length > 0 && (
                  <div className="suspects">
                    <span className="crime-label">People who fit</span>
                    {c.suspects.map((x) => (
                      <span key={x.id} className="suspect">
                        <span className="chip">{x.name} · {x.matches}/{c.tips.length}</span>
                        {!c.searchedByYou && (
                          <button className="btn btn-ghost btn-xs" disabled={game.busy || c.tips.length < 2} title="Search their home with a warrant" onClick={() => act({ op: "search_home", caseId: c.id, suspectId: x.id })}>
                            <Search size={11} /> Search
                          </button>
                        )}
                        <button className="btn btn-danger btn-xs" disabled={game.busy || c.tips.length < 2} onClick={() => act({ op: "arrest", caseId: c.id, suspectId: x.id })}>
                          <Handcuffs /> Arrest
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {!c.arrested && (data.detective ? (
                  <button className="btn btn-primary btn-sm" disabled={game.busy || !!c.canInvestigate} title={c.canInvestigate ?? ""} onClick={() => act({ op: "investigate", caseId: c.id })}>
                    <Search size={14} /> Work the scene
                  </button>
                ) : null)}
                {data.detective && c.canInvestigate && !c.arrested && <p className="job-lock"><Lock size={11} /> {c.canInvestigate}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {at("police") && hub && !hub.readsCases && (
        <section className="card">
          <h3 className="card-title"><FileSearch size={16} /> Case files</h3>
          <p className="muted">
            Only the police can read case files. Every report adds one clue: a body type, how they moved, part of a name,
            a crew patch. Some clues are wrong. Detectives put them together and make arrests.
          </p>
          <ul className="how-cases">
            <li><b>Doctors</b> examine victims and read the attacker from the bruises.</li>
            <li><b>Bankers</b> catch cash deposited right after a robbery.</li>
            <li><b>Vigilantes</b> hunt down suspects on cases the police let go cold.</li>
          </ul>
        </section>
      )}
      {at("court") && (
      <section className="card courthouse has-banner">
        <Scene kind="court" className="banner-scene" />
        <h3 className="card-title"><Gavel size={16} /> Courthouse · {view.location.city}</h3>
        {!data && <p className="muted">Checking the docket…</p>}
        {data && docket.length === 0 && <p className="muted">No trials today.</p>}
        <div className="case-list">
          {docket.map((t) => (
            <article key={t.caseId} className="case trial">
              <header>
                <b>#{t.caseId} · The city v. {t.suspectName}</b>
                <span className="chip chip-gold">{t.overdue ? "Verdict due" : `Verdict in ${Math.max(1, Math.round((t.deadline - Date.now()) / 60000))}m`}</span>
              </header>
              <p className="muted">{t.crime} on {t.victimName} in {t.district} · arrested by {t.officerName}</p>
              <ul className="tips">
                {t.clues.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
              {t.bail ? (
                <p className="fine">Out on ${t.bail.amount} bail, posted by {t.bail.payerName}.</p>
              ) : !t.canBail ? (
                <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => act({ op: "bail", caseId: t.caseId })}>Post bail (${t.bailAmount})</button>
              ) : null}
              <div className="bench">
                <span><span className="crime-label">Prosecution</span> {t.prosecutor ?? "—"}</span>
                <span><span className="crime-label">Defense</span> {t.defender ?? "—"}</span>
              </div>
              {t.strength !== null && (
                <div className="strength" title="How likely the case is to hold up">
                  <span className="crime-label">Case strength</span>
                  <div className="meter"><span style={{ width: `${t.strength}%` }} /></div>
                  <b>{t.strength}%</b>
                </div>
              )}
              <div className="row wrap">
                {data?.lawyer && !data.judge && !t.canProsecute && <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => act({ op: "court_join", caseId: t.caseId, side: "prosecutor" })}>Prosecute</button>}
                {data?.lawyer && !data.judge && !t.canDefend && <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => act({ op: "court_join", caseId: t.caseId, side: "defender" })}>Defend</button>}
                {data?.judge && !t.canJudge && (
                  <>
                    <button className="btn btn-danger btn-sm" disabled={game.busy} onClick={() => act({ op: "rule", caseId: t.caseId, verdict: "guilty" })}><Gavel size={14} /> Guilty</button>
                    <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => act({ op: "rule", caseId: t.caseId, verdict: "not_guilty" })}>Not guilty</button>
                    {t.envelope > 0 && (
                      <button className="btn btn-ghost btn-sm envelope" disabled={game.busy} onClick={() => act({ op: "rule", caseId: t.caseId, takeBribe: true })}>
                        ✉️ Take the envelope (${t.envelope})
                      </button>
                    )}
                  </>
                )}
              </div>
              {data?.judge && t.canJudge && <p className="job-lock"><Lock size={11} /> {t.canJudge}</p>}
            </article>
          ))}
        </div>
        {data && data.scandals.length > 0 && (
          <>
            <h4 className="crime-label record-title">Internal affairs</h4>
            <ul className="log record">
              {data.scandals.map((x) => (
                <li key={`${x.caseId}-${x.name}`} className="bad">
                  {x.name}, the {x.role} in case #{x.caseId}, was caught by {x.by} · {ago(x.at)}
                </li>
              ))}
            </ul>
          </>
        )}
        {record.length > 0 && (
          <>
            <h4 className="crime-label record-title">Court record</h4>
            <ul className="log record">
              {record.map((t) => (
                <li key={t.caseId} className={t.verdict === "guilty" ? "bad" : "good"}>
                  #{t.caseId} · {t.suspectName}: <b>{t.verdict === "guilty" ? "guilty" : "not guilty"}</b> of the {t.crime.toLowerCase()} in {t.district}
                  {t.verdict === "guilty" && t.sentenceMin ? `, ${t.sentenceMin} min` : ""} · {t.decidedBy} · {ago(t.decidedAt ?? t.at)}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      )}
    </div>
  );
}

const STATUS_CHIP: Record<string, string> = {
  open: "chip-red",
  "in court": "chip-gold",
  convicted: "",
  acquitted: "chip-green",
  "file lost": "chip-green",
  cold: "chip-green",
  hunted: "",
  closed: "",
};

/** The Mafia's view of its own jobs: lean on witnesses, or pay a cop to lose the file. */
function Racket({ game, racket, act }: { game: GameApi; racket: NonNullable<JusticeData["racket"]>; act: (b: Record<string, unknown>) => Promise<void> }) {
  const [cop, setCop] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState<Record<string, string>>({});
  return (
    <section className="card racket">
      <h3 className="card-title"><Crown size={16} /> Your jobs · the family business</h3>
      {racket.myCases.length === 0 && <p className="muted">Nothing on your record. Keep it that way, or don&apos;t.</p>}
      <div className="case-list">
        {racket.myCases.map((x) => (
          <article key={x.caseId} className="case">
            <header>
              <b>#{x.caseId} · {x.crime}</b>
              <span className={`chip ${STATUS_CHIP[x.status] ?? ""}`}>{x.status}</span>
            </header>
            <p className="muted">{x.victimName} · {x.district} · {ago(x.at)}</p>
            {x.statements !== null && (
              <p className="fine">
                The police have {x.clues} clue{x.clues === 1 ? "" : "s"}; {x.statements} from witnesses who talked.
                {x.protectedWitnesses ? " There are cops outside their doors." : ""}
              </p>
            )}
            {x.payoff && (
              <p className="fine">
                Envelope for {x.payoff.copName}: ${x.payoff.amount} · {x.payoff.status}
                {x.payoff.status === "pending" && (
                  <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => act({ op: "payoff_withdraw", caseId: x.caseId })}>Take it back</button>
                )}
              </p>
            )}
            {x.status === "open" && (
              <>
                <div className="row wrap">
                  <button className="btn btn-danger btn-sm" disabled={game.busy || !!x.canIntimidate} title={x.canIntimidate ?? ""} onClick={() => act({ op: "intimidate", caseId: x.caseId })}>
                    🐀 Lean on the witnesses
                  </button>
                </div>
                {x.canIntimidate && <p className="job-lock"><Lock size={11} /> {x.canIntimidate}</p>}
                {!x.payoffAllowed ? null : !x.canPayoff ? (
                  <form
                    className="row wrap payoff"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act({ op: "payoff", caseId: x.caseId, copId: cop[x.caseId] ?? racket.cops[0]?.id, amount: Number(amount[x.caseId] ?? 150) });
                    }}
                  >
                    <select value={cop[x.caseId] ?? racket.cops[0]?.id ?? ""} onChange={(e) => setCop({ ...cop, [x.caseId]: e.target.value })} aria-label="Officer">
                      {racket.cops.length === 0 && <option value="">No officers in town</option>}
                      {racket.cops.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.title}</option>)}
                    </select>
                    <input type="number" min={100} step={10} value={amount[x.caseId] ?? "150"} onChange={(e) => setAmount({ ...amount, [x.caseId]: e.target.value })} aria-label="Amount" />
                    <button className="btn btn-ghost btn-sm" disabled={game.busy || racket.cops.length === 0}>✉️ Pay to lose the file</button>
                  </form>
                ) : (
                  <p className="job-lock"><Lock size={11} /> {x.canPayoff}</p>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

/** Handcuffs icon (two linked rings). */
function Handcuffs() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="6.5" cy="15" r="4.5" />
      <circle cx="17.5" cy="15" r="4.5" />
      <path d="M9.5 11.5 12 8l2.5 3.5M12 8V5" />
    </svg>
  );
}

/** Shown while the player is held for trial or serving a sentence. */
export function JailCard({ game }: { game: GameApi }) {
  const jail = game.view!.jail;
  const [amount, setAmount] = useState("100");
  if (!jail) return null;
  const left = Math.max(0, jail.until - Date.now());
  return (
    <section className="card jail-card has-banner">
      <Scene kind="interrogation" className="banner-scene" />
      <h3 className="card-title"><Lock size={16} /> {jail.custodyCase ? "In custody" : "In a cell"}</h3>
      <p>{jail.reason}</p>
      <p className="muted">
        {jail.custodyCase
          ? left > 0
            ? `Trial within ${Math.ceil(left / 60000)} min. A judge rules, or the court clerk decides on the evidence.`
            : "The verdict is coming."
          : `Free in ${Math.ceil(left / 60000)} min. No jobs, crimes or travel until then.`}
      </p>
      <button className="btn btn-ghost btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("injustice:go", { detail: "place:prison" }))}>
        Go to the yard
      </button>
      {jail.custodyCase && jail.bail > 0 && (
        <button className="btn btn-primary btn-sm" disabled={game.busy || game.view!.bank < jail.bail} onClick={() => game.social({ op: "bail", caseId: jail.custodyCase })}>
          Post your own bail (${jail.bail} from the bank)
        </button>
      )}
      {jail.custodyCase && (
        <form
          className="row wrap bribe"
          onSubmit={(e) => {
            e.preventDefault();
            game.social({ op: "bribe", caseId: jail.custodyCase, amount: Number(amount) });
          }}
        >
          <input type="number" min={50} step={10} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Envelope amount" />
          <button className="btn btn-ghost btn-sm" disabled={game.busy}>✉️ Send an envelope to the judge</button>
          <span className="fine muted">From your bank. Only a judge can take it; otherwise it comes back.</span>
        </form>
      )}
    </section>
  );
}

type Inmate = {
  id: string;
  name: string;
  crewTag: string | null;
  path: string | null;
  status: string;
  freeIn: number;
  canFight: string | null;
  canInvite: boolean;
};

/** The prison yard: inmates, fights for respect, shifts that shorten a sentence, yard chat. */
export function Yard({ game, hub, social }: { game: GameApi; hub: Hub | null; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const view = game.view!;
  const [inmates, setInmates] = useState<Inmate[] | null>(null);
  const [channel, setChannel] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/community?yard=1", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setInmates(data.inmates);
      setChannel(data.channel ?? null);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (body: Record<string, unknown>) => {
    if (await social(body)) load();
  };

  return (
    <div className="stack">
      <section className="card yard has-banner">
        <Scene kind="prison" className="banner-scene" />
        <h3 className="card-title"><Lock size={16} /> The yard · {view.location.city}</h3>
        <p className="muted">
          Everyone doing time in {view.location.city} ends up here. Work a shift for a few dollars and time off your
          sentence, or earn some respect the hard way.
        </p>
        <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => act({ op: "yard_work" })}>
          Work a prison shift
        </button>
      </section>

      <section className="card">
        <h3 className="card-title"><Users size={16} /> Inmates</h3>
        {!inmates && <p className="muted">Looking around the yard…</p>}
        {inmates && inmates.length === 0 && <p className="muted">You have the yard to yourself. For now.</p>}
        <ul className="officials">
          {inmates?.map((m) => (
            <li key={m.id}>
              <span>
                <b style={{ color: m.path ? PATH_LOOKS[m.path]?.rim : undefined }}>{m.name}</b>
                {m.crewTag && <span className="crew-tag"> [{m.crewTag}]</span>}
                <span className="muted"> · {m.status}{m.freeIn ? `, out in ${Math.max(1, Math.ceil(m.freeIn / 60000))}m` : ""}</span>
              </span>
              <span className="row">
                {m.canInvite && (
                  <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => act({ op: "crew_invite", playerId: m.id })}>Recruit</button>
                )}
                <button className="btn btn-danger btn-xs" disabled={game.busy || !!m.canFight} title={m.canFight ?? ""} onClick={() => act({ op: "yard_fight", targetId: m.id })}>
                  <Swords size={12} /> Fight
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {hub && channel && hub.channels.includes(channel) && <Chat game={game} hub={hub} initial={channel} />}
    </div>
  );
}

/** Patients in the clinic can pay a doctor to walk out today, no paperwork. */
export function BackAlleyCard({ game }: { game: GameApi }) {
  const [doctors, setDoctors] = useState<{ id: string; name: string; fee: number }[]>([]);
  const inClinic = (game.view?.hospitalMs ?? 0) > 0;
  useEffect(() => {
    if (!inClinic) return;
    fetch("/api/community?backalley=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { doctors: [] }))
      .then((d) => setDoctors(d.doctors ?? []))
      .catch(() => undefined);
  }, [inClinic]);
  if (!inClinic || doctors.length === 0) return null;
  return (
    <section className="card back-alley">
      <h3 className="card-title">🩹 A quiet word in the clinic</h3>
      <p className="muted">Some doctors will get you out of here today. Cash, no questions, no paperwork.</p>
      <ul className="officials">
        {doctors.map((d) => (
          <li key={d.id}>
            <span><b>Dr. {d.name}</b></span>
            <button className="btn btn-ghost btn-xs" disabled={game.busy || game.view!.cash < d.fee} onClick={() => game.social({ op: "back_alley", doctorId: d.id })}>
              Pay ${d.fee}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
