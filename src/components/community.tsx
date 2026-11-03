"use client";

import { AnimatePresence, motion } from "motion/react";
import { Ban, Crown, Eye, EyeOff, FileSearch, Footprints, Hand, Inbox, Lock, MessageSquare, Search, Send, Shield, Siren, Swords, UserCheck, Users, Vault } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PATH_LOOKS, PlayerAvatar } from "./art/Portraits";
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
  canCrime: Record<CrimeKind, string | null>;
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
  tips: { id: string; source: "witness" | "victim" | "bystander" | "detective"; text: string; at: number }[];
  canInvestigate: string | null;
  suspects: { name: string; matches: number }[] | null;
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
  readsCases: boolean;
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

export function CommunityTab({ game }: { game: GameApi }) {
  const view = game.view!;
  const [section, setSection] = useState<"people" | "cases" | "chat" | "crew" | "inbox">(
    () => (game.view!.sightings.length ? "cases" : "people"),
  );
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

  // Opening the inbox marks everything read.
  useEffect(() => {
    if (section === "inbox" && view.inbox.unread > 0) game.act({ type: "read_inbox" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const social = async (body: Record<string, unknown>) => {
    const v = await game.social(body);
    if (v) loadHub();
    return v;
  };

  return (
    <div className="stack">
      <div className="segmented community-tabs">
        {(
          [
            ["people", "People", Users],
            ["cases", "Cases", Siren],
            ["chat", "Chat", MessageSquare],
            ["crew", "Crew", Shield],
            ["inbox", "Inbox", Inbox],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} className={section === id ? "on" : ""} onClick={() => setSection(id)}>
            <Icon size={15} /> {label}
            {id === "inbox" && view.inbox.unread > 0 && <span className="badge-dot">{view.inbox.unread}</span>}
            {id === "cases" && view.sightings.length > 0 && <span className="badge-dot">{view.sightings.length}</span>}
          </button>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      {section === "people" && <People game={game} hub={hub} social={social} />}
      {section === "cases" && <CasesPanel game={game} hub={hub} />}
      {section === "chat" && hub && <Chat game={game} hub={hub} />}
      {section === "crew" && <CrewPanel game={game} hub={hub} social={social} />}
      {section === "inbox" && <InboxPanel game={game} social={social} />}
    </div>
  );
}

function People({ game, hub, social }: { game: GameApi; hub: Hub | null; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const view = game.view!;
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
      <p className="muted">People in {view.location.city}, most recently active first. Your gut tells you how a fight would go.</p>
      {hub.players.map((p) => {
        const blocked = hub.blocked.includes(p.id);
        return (
          <motion.article key={p.id} className="person" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <PlayerAvatar name={p.name} path={p.path} className="avatar-md" />
            <div className="person-body">
              <div className="person-head">
                <b>{p.name}</b>
                {p.crewTag && <span className="crew-tag">[{p.crewTag}]</span>}
                {p.protected && <span className="chip chip-green"><Shield size={11} /> New</span>}
                {STATUS[p.status] && <span className="chip">{STATUS[p.status]}</span>}
              </div>
              <p className="muted" style={{ color: p.path ? PATH_LOOKS[p.path]?.rim : undefined }}>
                {p.title} · ★ {p.reputation} · seen {ago(p.lastSeen)}
              </p>
              <div className="gut">
                <span className={`danger-pill d${p.danger}`}>{DANGER[p.danger]}</span>
                <span className="muted">“{p.read}”</span>
              </div>
              <div className="row">
                <button className="btn btn-danger btn-sm" disabled={game.busy || !!p.canAttack} title={p.canAttack ?? ""} onClick={() => social({ op: "attack", targetId: p.id })}>
                  <Swords size={14} /> Attack
                </button>
                {!p.canVouch && (
                  <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => social({ op: "vouch", targetId: p.id })}>
                    <UserCheck size={14} /> Vouch
                  </button>
                )}
                {p.canInvite && (
                  <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: "crew_invite", playerId: p.id })}>
                    <Shield size={14} /> Invite to crew
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => social({ op: blocked ? "unblock" : "block", targetId: p.id })}>
                  <Ban size={14} /> {blocked ? "Unblock" : "Block"}
                </button>
              </div>
              {p.canAttack && <p className="job-lock"><Lock size={11} /> {p.canAttack}</p>}
              <div className="crime-row">
                <span className="crime-label">Street crime</span>
                {CRIME_BUTTONS.map(({ id, label, Icon, note }) => (
                  <button
                    key={id}
                    className="btn btn-ghost btn-sm"
                    disabled={game.busy || !!p.canCrime?.[id]}
                    title={p.canCrime?.[id] ?? `${note}. Anonymous, but witnesses may talk.`}
                    onClick={() => social({ op: "crime", kind: id, targetId: p.id })}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

const CHANNEL_NAME = (c: string, city: string, crewTag?: string) =>
  c === "global" ? "Global" : c.startsWith("country:") ? city : `Crew ${crewTag ? `[${crewTag}]` : ""}`;

function Chat({ game, hub }: { game: GameApi; hub: Hub }) {
  const view = game.view!;
  const [channel, setChannel] = useState(hub.channels[1] ?? "global");
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

function CrewPanel({ game, hub, social }: { game: GameApi; hub: Hub | null; social: (b: Record<string, unknown>) => Promise<unknown> }) {
  const view = game.view!;
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [policy, setPolicy] = useState<"open" | "request" | "invite">("request");
  if (!hub) return <p className="muted">Loading crews…</p>;
  const c = hub.myCrew;

  if (c) {
    return (
      <div className="stack">
        <section className="card crew-hero">
          <div className="crew-banner">
            <span className="crew-badge">{c.tag}</span>
            <div>
              <h2>{c.name}</h2>
              <p className="muted">{c.size} member{c.size === 1 ? "" : "s"} · led by {c.leader} · +5% pay on every job</p>
            </div>
          </div>
        </section>
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

  return (
    <div className="stack">
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
        {hub.crews.length === 0 && <p className="muted">No crews yet. Only street bosses can start one.</p>}
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

      <section className="card">
        <h3 className="card-title"><Crown size={16} /> Found a crew</h3>
        {hub.foundBlock ? (
          <p className="muted"><Lock size={13} /> {hub.foundBlock}</p>
        ) : (
          <>
            <p className="muted">$500 cash. Crew members earn 5% more on every job, share a vault and a private chat.</p>
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
              <Crown size={15} /> Found · $500
            </button>
          </>
        )}
      </section>
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
};

function CasesPanel({ game, hub }: { game: GameApi; hub: Hub | null }) {
  const view = game.view!;
  const [data, setData] = useState<{ cases: CaseCard[]; block: string | null; detective?: boolean } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/community?cases=1", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    if (hub?.readsCases) load();
  }, [hub?.readsCases, load, view.location.country]);

  return (
    <div className="stack">
      <Sightings game={game} />
      {!view.sightings.length && (
        <section className="card empty">
          <Eye size={26} />
          <p>You haven&apos;t seen anything lately. When someone gets robbed near you, you&apos;ll decide here whether to report it.</p>
        </section>
      )}
      {hub && !hub.readsCases && (
        <section className="card">
          <h3 className="card-title"><FileSearch size={16} /> Case files</h3>
          <p className="muted">
            Only the police can read case files. Every report adds one clue: a body type, how they moved, part of a name,
            a crew patch. Some clues are wrong. Detectives put them together.
          </p>
        </section>
      )}
      {hub?.readsCases && (
        <section className="card">
          <div className="row between">
            <h3 className="card-title"><FileSearch size={16} /> Case files · {view.location.city}</h3>
            <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
          </div>
          {!data && <p className="muted">Pulling the files…</p>}
          {data && data.cases.length === 0 && <p className="muted">No open cases. A quiet night in {view.location.city}.</p>}
          <div className="case-list">
            {data?.cases.map((c) => (
              <article key={c.id} className={`case ${c.open ? "" : "cold"}`}>
                <header>
                  <b>#{c.id} · {c.crime}</b>
                  <span className={`chip ${c.open ? "chip-red" : ""}`}>{c.open ? "Open" : "Cold"}</span>
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
                {c.suspects && c.suspects.length > 0 && (
                  <div className="suspects">
                    <span className="crime-label">People who fit</span>
                    {c.suspects.map((s) => (
                      <span key={s.name} className="chip">{s.name} · {s.matches}/{c.tips.length}</span>
                    ))}
                  </div>
                )}
                {data.detective ? (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={game.busy || !!c.canInvestigate}
                    title={c.canInvestigate ?? ""}
                    onClick={async () => {
                      if (await game.social({ op: "investigate", caseId: c.id })) load();
                    }}
                  >
                    <Search size={14} /> Work the scene
                  </button>
                ) : (
                  <p className="fine muted">Detectives can work the scene for a reliable clue and see who fits.</p>
                )}
                {data.detective && c.canInvestigate && <p className="job-lock"><Lock size={11} /> {c.canInvestigate}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
