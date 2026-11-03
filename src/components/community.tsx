"use client";

import { AnimatePresence, motion } from "motion/react";
import { Ban, Crown, Inbox, Lock, MessageSquare, Send, Shield, Swords, UserCheck, Users, Vault } from "lucide-react";
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
  const [section, setSection] = useState<"people" | "chat" | "crew" | "inbox">("people");
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
      {section === "people" && <People game={game} hub={hub} social={social} />}
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
