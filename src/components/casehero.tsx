"use client";

import { NPC_FACES } from "@/game/content/faces";
import type { PublicView } from "@/game/view";
import { careerStill } from "./art/Cutout";
import { caseProgress, SUSPECTS } from "./board";
import { PATH_LOOKS } from "./art/Portraits";
import type { GameApi } from "./useGame";

type Lead = PublicView["leads"][number];

/** Where to go for the step you're stuck on. */
function stepTarget(label: string, lead: Lead): { go: string; cta: string } {
  const l = label.toLowerCase();
  if (/go to/.test(l)) return { go: "place:station", cta: "Travel" };
  if (/fight|shake off|protectors|minder/.test(l)) return { go: "tab:fight", cta: "Find a fight" };
  if (/career/.test(l)) return { go: "tab:jobs", cta: "Go to work" };
  if (/someone people|standing|matter/.test(l)) return { go: "tab:jobs", cta: "Build a name" };
  void lead;
  return { go: "tab:jobs", cta: "Go to work" };
}

/**
 * Home, first: your case. Who framed you, how much you can prove, and the next lead, with one
 * clear thing to do about it. (Approved Direction A.)
 */
export function CaseHero({ game, go }: { game: GameApi; go: (to: string) => void }) {
  const view = game.view!;
  const { found, total, known } = caseProgress(view);
  // The lead you're on, or the next one you can pick up.
  const lead = view.leads.find((l) => l.state === "active") ?? view.leads.find((l) => l.state === "open") ?? null;
  const allClosed = view.leads.every((l) => l.state === "closed");
  const next = lead?.steps.find((s) => !s.done) ?? null;
  const target = lead && next ? stepTarget(next.label, lead) : null;
  // A payment can be made any time while you're on the lead.
  const pay = lead?.canPay ? lead.steps.find((s) => !s.done && /\(\$[\d,]+\)$/.test(s.label)) ?? null : null;
  const blocked = !!view.jail || !!view.travel || game.live!.hospital > 0;

  return (
    <section className="card case-hero">
      <div className="case-wall">
        <span className="label tone-amber-t">Your case · {found} of {total} pieces</span>
        <h1 className="case-title">Who framed<br />{view.name}</h1>
        <div className="case-suspects">
          {SUSPECTS.map((s) => (
            <div key={s.id} className={`case-sus${known.has(s.id) ? " known" : ""}`}>
              {known.has(s.id) && NPC_FACES[s.id] ? <img src={NPC_FACES[s.id]} alt="" /> : <span className="case-unknown">{known.has(s.id) ? s.name.split(" ").map((w) => w[0]).slice(0, 2).join("") : "?"}</span>}
              <b>{known.has(s.id) ? s.name.replace(/^Judge Aldous /, "Judge ") : "Unknown"}</b>
              <small>{known.has(s.id) ? s.role : "Not identified"}</small>
            </div>
          ))}
        </div>
        <div className="case-evidence" aria-label={`${found} of ${total} pieces of evidence`}>
          {Array.from({ length: total }, (_, i) => <i key={i} className={i < found ? "on" : ""} />)}
        </div>
      </div>

      <div className="case-lead">
        {lead ? (
          <>
            <span className="label tone-green-t">{lead.state === "active" ? "On the lead" : "Next lead"}</span>
            <b className="case-lead-title">{lead.title}</b>
            <p className="case-lead-text">{lead.text}</p>
            {lead.state === "active" && (
              <ul className="case-steps">
                {lead.steps.map((s) => (
                  <li key={s.label} className={s.done ? "done" : ""}>
                    <span>{s.label}</span>
                    {s.count && !s.done && <small>{s.count}</small>}
                  </li>
                ))}
              </ul>
            )}
            <div className="case-acts">
              {lead.state === "open" ? (
                <button className="btn btn-primary" disabled={game.busy} onClick={() => game.act({ type: "lead_start", id: lead.id })}>Follow the lead</button>
              ) : lead.ready ? (
                <button className="btn btn-primary" disabled={game.busy || blocked} onClick={() => game.act({ type: "lead_close", id: lead.id })}>Close the lead</button>
              ) : next && pay && next.label === pay.label ? (
                <button className="btn btn-primary" disabled={game.busy || blocked} onClick={() => game.act({ type: "lead_pay", id: lead.id })}>{pay.label}</button>
              ) : target ? (
                <button className="btn btn-primary" disabled={game.busy} onClick={() => go(target.go)}>{target.cta}</button>
              ) : null}
              {lead.state === "active" && !lead.ready && pay && next?.label !== pay.label && (
                <button className="btn btn-ghost btn-sm" disabled={game.busy || blocked} onClick={() => game.act({ type: "lead_pay", id: lead.id })}>{pay.label}</button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => go("board")}>The board</button>
            </div>
          </>
        ) : (
          <>
            <span className="label tone-green-t">{allClosed ? "The case is whole" : "No lead right now"}</span>
            <p className="case-lead-text">{allClosed ? "You have everything on Crane. What you do with it is coming." : "Close the lead you're on, or read the evidence you've found."}</p>
            <div className="case-acts"><button className="btn btn-ghost btn-sm" onClick={() => go("board")}>The board</button></div>
          </>
        )}
      </div>
    </section>
  );
}

/** Your work, under the case: your rank, the work that gets you noticed, one tap to do it. */
export function WorkStrip({ game, sub }: { game: GameApi; sub: string }) {
  const view = game.view!;
  // With a career, the best-paying career job you can do now (career work is what gets you
  // promoted); without one, the game's own pick.
  const career = view.jobs.filter((j) => j.pathJob && !j.locked).sort((x, y) => y.pay[1] - x.pay[1])[0];
  const best = career ?? view.jobs.find((j) => j.id === view.recommendedJobId);
  const busy = !!view.jail || !!view.travel || game.live!.hospital > 0;
  const photo = view.profile.photo ?? careerStill(view.path?.id, view.ladder?.current);
  const ladder = view.ladder;
  return (
    <section className="card work-strip">
      <h3 className="card-title">Your work{view.path && ladder && <span className="title-aside">{view.path.rank} · {ladder.current} of {ladder.ranks.length}</span>}</h3>
      <div className="work-row">
        {photo && <img className="work-photo" src={photo} alt="" style={{ boxShadow: view.path ? `0 0 0 2px ${PATH_LOOKS[view.path.id]?.rim ?? "transparent"}` : undefined }} />}
        <div className="work-body">
          {busy || !best ? (
            <b className="work-job">{sub}</b>
          ) : (
            <>
              <b className="work-job">{best.name}</b>
              <span className="work-sub">Pays ${best.pay[0]}–{best.pay[1]}{best.pathJob ? " · counts toward your next rank" : ""}</span>
            </>
          )}
          {ladder && (
            <div className="rankbar-track work-ladder">
              {ladder.ranks.map((r, i) => <i key={r} title={r} className={i + 1 < ladder.current ? "on" : i + 1 === ladder.current ? "now" : ""} />)}
            </div>
          )}
        </div>
        {!busy && best && (
          <button className="btn btn-primary btn-sm" disabled={game.busy || !!best.locked} title={best.locked ?? ""} onClick={() => game.act({ type: "job", jobId: best.id })}>Go</button>
        )}
      </div>
    </section>
  );
}
