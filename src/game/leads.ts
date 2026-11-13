// Leads: optional missions that move your case forward. Each lead is a short objective made of
// things the game already measures (jobs, fights, standing, where you are, paying an informant).
// Finishing one pins a new piece of evidence to the board, tied to the suspects it points at.
//
// Progress only counts from when you start following a lead: starting it records your current
// counts, and each step measures what you've done since. Rewards are evidence, a little cash and
// a little reputation: never gear, never power, never odds.

import { COUNTRY_BY_ID } from "./content/world";
import { JOBS } from "./content/jobs";
import { totalJobs } from "./content/districts";
import { countryOf, inHospital, inJail } from "./engine";
import { GameError, type CountryId, type GameEvent, type Player } from "./types";

export type Suspect = "crane" | "benny" | "kozak" | "cp";

export type LeadStep =
  | { kind: "jobs"; n: number; label: string }
  | { kind: "careerJobs"; n: number; label: string }
  | { kind: "fights"; n: number; label: string }
  | { kind: "reputation"; n: number; label: string }
  | { kind: "beIn"; country: CountryId; label: string }
  | { kind: "pay"; amount: number; label: string };

export interface LeadDef {
  id: string;
  suspect: Suspect;
  title: string;
  /** What you've heard: shown when the lead is open. */
  text: string;
  /** Leads that must be closed first. */
  after: string[];
  steps: LeadStep[];
  /** The evidence it pins to the board. */
  evidence: { title: string; teaser: string; links: Suspect[] };
  reward: { cash: number; reputation: number };
  /** Shown when you close it. */
  outcome: string;
}

export const LEADS: LeadDef[] = [
  {
    id: "benny_seen",
    suspect: "benny",
    title: "Someone saw Benny",
    text: "The witness who lied at your trial is back in the city. People talk on the job, and an informant will sell you the rest.",
    after: [],
    steps: [
      { kind: "jobs", n: 3, label: "Keep your ears open on the job" },
      { kind: "pay", amount: 50, label: "Pay a street informant" },
    ],
    evidence: { title: "Benny's new address", teaser: "A rented room above a pawn shop in the Old Market. Paid a year in advance, in cash.", links: ["benny"] },
    reward: { cash: 40, reputation: 2 },
    outcome: "The informant pockets your money and gives you a street and a door. Benny Marlowe pays a year's rent up front. Witnesses don't earn that much.",
  },
  {
    id: "benny_minder",
    suspect: "benny",
    title: "Benny's minder",
    text: "Benny never walks alone in the Old Market any more. Somebody's paying a heavy to keep people like you away.",
    after: ["benny_seen"],
    steps: [
      { kind: "beIn", country: "varrow", label: "Go to Grayhaven" },
      { kind: "fights", n: 2, label: "Win street fights until the minder hears about you" },
    ],
    evidence: { title: "Paid by envelope", teaser: "The minder's pay comes in the same brown envelopes Benny gets. Same handwriting.", links: ["benny", "crane"] },
    reward: { cash: 60, reputation: 3 },
    outcome: "The minder decides you're not worth the trouble. In his coat: a brown envelope, and the handwriting on it is the same as on Benny's.",
  },
  {
    id: "benny_talks",
    suspect: "benny",
    title: "The witness talks",
    text: "Benny is scared, and scared men talk to people who matter. Make a name in your trade and he'll come to you.",
    after: ["benny_minder"],
    steps: [
      { kind: "reputation", n: 60, label: "Be someone people have heard of" },
      { kind: "careerJobs", n: 5, label: "Do work in your career" },
    ],
    evidence: { title: "Benny's statement", teaser: "\"I never saw you that night. A man from the judge's office told me what to say.\"", links: ["benny", "crane"] },
    reward: { cash: 120, reputation: 5 },
    outcome: "Benny finds you in a bar, sweating. He never saw you that night. A man from the judge's office told him what to say, and paid him to say it.",
  },
  {
    id: "kozak_books",
    suspect: "kozak",
    title: "Kozak's bookkeeper",
    text: "Every racket keeps books. Kozak's bookkeeper drinks alone on Iron Row and likes people who buy rounds.",
    after: ["benny_seen"],
    steps: [
      { kind: "jobs", n: 4, label: "Earn enough to look like a big spender" },
      { kind: "pay", amount: 200, label: "Buy the bookkeeper's evening" },
    ],
    evidence: { title: "A page from Kozak's ledger", teaser: "Monthly payments to \"C&P\". The same amount, every month, since before your trial.", links: ["kozak", "cp"] },
    reward: { cash: 80, reputation: 3 },
    outcome: "Three drinks in, the bookkeeper tears a page out to show you how good he is. Kozak pays someone called C&P every month. He has since before your trial.",
  },
  {
    id: "kozak_tribute",
    suspect: "kozak",
    title: "Tribute",
    text: "Kozak pays upward. Whoever collects for C&P walks his rounds in Grayhaven, and they don't like being followed.",
    after: ["kozak_books"],
    steps: [
      { kind: "beIn", country: "varrow", label: "Go to Grayhaven" },
      { kind: "fights", n: 3, label: "Shake off the people watching the collector" },
    ],
    evidence: { title: "The collection route", teaser: "The collector's last stop every month is a side door of the courthouse.", links: ["kozak", "crane"] },
    reward: { cash: 100, reputation: 4 },
    outcome: "You lose his watchers and follow the collector to his last stop: a side door of the courthouse, after hours.",
  },
  {
    id: "cp_money",
    suspect: "cp",
    title: "Follow the money",
    text: "C&P Holdings is registered in Port Solace. A clerk at the exchange will look up who owns it, for a price.",
    after: ["kozak_books"],
    steps: [
      { kind: "beIn", country: "solmarra", label: "Go to Port Solace" },
      { kind: "pay", amount: 500, label: "Pay the clerk at the exchange" },
    ],
    evidence: { title: "C&P's directors", teaser: "Two names on the register. One is a shell. The other is a judge's brother-in-law.", links: ["cp", "crane"] },
    reward: { cash: 150, reputation: 4 },
    outcome: "The register lists two directors. One is a shell company. The other is married to Judge Crane's sister.",
  },
  {
    id: "cp_accounts",
    suspect: "cp",
    title: "Forty accounts",
    text: "C&P moves money through dozens of small accounts. Working your trade long enough, you'll meet someone who's seen them.",
    after: ["cp_money"],
    steps: [
      { kind: "careerJobs", n: 8, label: "Work your career and listen" },
      { kind: "reputation", n: 90, label: "Have the standing to ask" },
    ],
    evidence: { title: "Forty accounts", teaser: "Forty accounts, one owner. Every verdict Crane sold paid into one of them.", links: ["cp", "crane"] },
    reward: { cash: 200, reputation: 6 },
    outcome: "Someone in the trade owes you a favour and pays it with a list: forty accounts, one owner, and a deposit after every verdict Crane sold.",
  },
  {
    id: "crane_docket",
    suspect: "crane",
    title: "The docket",
    text: "Your case file is missing pages. The court clerk in Grayhaven keeps the originals, and the clerk has debts.",
    after: ["benny_minder", "cp_money"],
    steps: [
      { kind: "beIn", country: "varrow", label: "Go to Grayhaven" },
      { kind: "pay", amount: 1000, label: "Settle the clerk's debts" },
      { kind: "jobs", n: 5, label: "Lie low while the clerk finds the file" },
    ],
    evidence: { title: "The original docket", teaser: "The real witness list. Benny's name was added later, in the judge's own hand.", links: ["crane", "benny"] },
    reward: { cash: 250, reputation: 6 },
    outcome: "The original docket. The witness list was typed, and one name was added later in ink: Benny Marlowe, in Judge Crane's own handwriting.",
  },
  {
    id: "crane_ring",
    suspect: "crane",
    title: "His Honor's ring",
    text: "Crane seals the Ledger's letters with his signet ring. To prove it, you need the people around him to stop protecting him.",
    after: ["crane_docket", "kozak_tribute"],
    steps: [
      { kind: "reputation", n: 120, label: "Matter enough that they pick your side" },
      { kind: "fights", n: 5, label: "Show his protectors they can't win" },
    ],
    evidence: { title: "The signet ring", teaser: "Wax seals on Ledger letters, and the ring that made them. The case against Crane is whole.", links: ["crane", "cp"] },
    reward: { cash: 400, reputation: 10 },
    outcome: "His driver hands you a letter sealed with the ring. You have everything you need. Now decide what to do with it: it's on your case card.",
  },
];

export const LEAD_BY_ID: Record<string, LeadDef> = Object.fromEntries(LEADS.map((l) => [l.id, l]));

/** The counters a lead measures progress against. */
function counters(p: Player) {
  const careerJobs = p.path ? JOBS.filter((j) => j.path === p.path).reduce((s, j) => s + (p.jobCounts[j.id] ?? 0), 0) : 0;
  return { jobs: totalJobs(p), careerJobs, fights: p.jobCounts["fight:win"] ?? 0 };
}

export type LeadState = "locked" | "open" | "active" | "closed";

export function leadState(p: Player, l: LeadDef): LeadState {
  const s = p.leads?.[l.id];
  if (s?.closedAt) return "closed";
  if (s) return "active";
  return l.after.every((id) => p.leads?.[id]?.closedAt) ? "open" : "locked";
}

/** How far each step has come: done, and a "2 of 3" where counting makes sense. */
export function stepProgress(p: Player, l: LeadDef): { label: string; done: boolean; count: string | null }[] {
  const s = p.leads?.[l.id];
  const now = counters(p);
  return l.steps.map((st, i) => {
    switch (st.kind) {
      case "jobs":
      case "careerJobs":
      case "fights": {
        const base = s?.base?.[st.kind] ?? now[st.kind];
        const got = Math.max(0, now[st.kind] - base);
        return { label: st.label, done: !!s && got >= st.n, count: `${Math.min(got, st.n)} of ${st.n}` };
      }
      case "reputation":
        return { label: st.label, done: !!s && p.reputation >= st.n, count: null };
      case "beIn":
        return { label: st.label, done: !!s && countryOf(p) === st.country && !p.travel, count: null };
      case "pay":
        return { label: `${st.label} ($${st.amount.toLocaleString()})`, done: !!s?.paid?.includes(i), count: null };
    }
  });
}

const busy = (p: Player, now: number) => inJail(p, now) || inHospital(p, now) || !!p.travel;

/** Start following a lead: from now on, what you do counts toward it. */
export function startLead(p: Player, id: string, now: number): GameEvent[] {
  const l = LEAD_BY_ID[id];
  if (!l) throw new GameError("No such lead.");
  const st = leadState(p, l);
  if (st === "locked") throw new GameError("You need to close an earlier lead first.");
  if (st !== "open") throw new GameError("You're already on it.");
  p.leads = { ...(p.leads ?? {}), [id]: { startedAt: now, base: counters(p), paid: [] } };
  return [{ tone: "story", text: `You start following a lead: ${l.title}.` }];
}

/** Pay the informant, clerk or bookkeeper a step asks for. Cash on hand. */
export function payLead(p: Player, id: string, now: number): GameEvent[] {
  const l = LEAD_BY_ID[id];
  const s = p.leads?.[id];
  if (!l || !s || s.closedAt) throw new GameError("You're not following that lead.");
  if (busy(p, now)) throw new GameError("Not from where you are right now.");
  const i = l.steps.findIndex((st, k) => st.kind === "pay" && !s.paid?.includes(k));
  if (i < 0) throw new GameError("Nobody's waiting to be paid.");
  const st = l.steps[i] as Extract<LeadStep, { kind: "pay" }>;
  // Paying in the right city matters when the lead says where to go first.
  const where = l.steps.find((x): x is Extract<LeadStep, { kind: "beIn" }> => x.kind === "beIn");
  if (where && countryOf(p) !== where.country) throw new GameError(`They're in ${COUNTRY_BY_ID[where.country].capital}.`);
  if (p.cash < st.amount) throw new GameError(`That's $${st.amount.toLocaleString()}, cash.`);
  p.cash -= st.amount;
  s.paid = [...(s.paid ?? []), i];
  return [{ tone: "info", text: `You pay $${st.amount.toLocaleString()}. Now you wait and see what it buys.` }];
}

/** Close a lead when every step is done: the evidence goes on the board. */
export function closeLead(p: Player, id: string, now: number): GameEvent[] {
  const l = LEAD_BY_ID[id];
  const s = p.leads?.[id];
  if (!l || !s || s.closedAt) throw new GameError("You're not following that lead.");
  if (busy(p, now)) throw new GameError("Not from where you are right now.");
  const left = stepProgress(p, l).find((x) => !x.done);
  if (left) throw new GameError(`Not yet: ${left.label.toLowerCase()}.`);
  s.closedAt = now;
  p.cash += l.reward.cash;
  p.reputation += l.reward.reputation;
  return [
    { tone: "story", text: l.outcome },
    { tone: "good", text: `New evidence on the board: ${l.evidence.title}. +$${l.reward.cash}, +${l.reward.reputation} reputation.` },
  ];
}

export function leadsView(p: Player) {
  return LEADS.map((l) => {
    const state = leadState(p, l);
    return {
      id: l.id,
      suspect: l.suspect,
      title: l.title,
      text: l.text,
      state,
      after: l.after.filter((id) => !p.leads?.[id]?.closedAt).map((id) => LEAD_BY_ID[id].title),
      steps: state === "active" || state === "closed" ? stepProgress(p, l) : l.steps.map((s) => ({ label: s.kind === "pay" ? `${s.label} ($${s.amount.toLocaleString()})` : s.label, done: false, count: null })),
      canPay: state === "active" && l.steps.some((st, i) => st.kind === "pay" && !p.leads?.[l.id]?.paid?.includes(i)),
      ready: state === "active" && stepProgress(p, l).every((x) => x.done),
      evidence: l.evidence,
      reward: l.reward,
    };
  });
}
