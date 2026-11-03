"use client";

import { Building2, Coins, Flag, Gavel, Landmark, Megaphone, Siren, Soup, Vote } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GameApi } from "./useGame";

type CityData = {
  city: {
    city: string;
    mayor: { name: string; since: number; you: boolean } | null;
    termEnds: number;
    electionOpen: boolean;
    electionOpens: number;
    taxRate: number;
    policeBounty: number;
    treasury: number;
    crackdown: number | null;
    chief: { name: string; you: boolean } | null;
    recall: { signatures: number; needed: number; signed: boolean; canSign: string | null } | null;
    soupMeals: number;
    mealsServed: number;
    canSoup: string | null;
    chiefControls: { canCrackdown: boolean; canSalary: boolean; salary: number } | null;
    candidates: { id: string; name: string; title: string; reputation: number; pitch: string; buzz: string | null }[];
    amCandidate: boolean;
    turnout: number;
    myVote: string | null;
    canRun: string | null;
    canVote: string | null;
    history: { term: number; name: string | null; votes: number; turnout: number; at: number }[];
    log: { at: number; text: string }[];
    controls: {
      canCrackdown: boolean;
      canPardon: boolean;
      canSalary: boolean;
      maxTax: number;
      maxBounty: number;
      salary: number;
      mealCost: number;
    } | null;
  };
  prisoners: { id: string; name: string; reason: string }[];
  officers: { id: string; name: string; title: string }[];
  residents: { id: string; name: string }[];
  turf: {
    id: string;
    name: string;
    holder: { name: string; tag: string; mine: boolean } | null;
    war: { attacker: string; endsAt: number; attackers: number; defenders: number; over: boolean; canJoin: string | null } | null;
    canClaim: string | null;
    canWar: string | null;
  }[];
  paper: {
    name: string;
    city: string;
    lead: string;
    stories: { headline: string; kind: string; at: number }[];
    weather: string | null;
    stats: { crimes: number; stolen: number; arrests: number; convictions: number; unsolved: number };
  };
};

function until(t: number) {
  const m = Math.max(0, Math.round((t - Date.now()) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)} days`;
}

export function CityHall({ game }: { game: GameApi }) {
  const view = game.view!;
  const [data, setData] = useState<CityData | null>(null);
  const [pitch, setPitch] = useState("");
  const [tax, setTax] = useState<string | null>(null);
  const [bounty, setBounty] = useState<string | null>(null);
  const [skimAmt, setSkimAmt] = useState("100");
  const [soupAmt, setSoupAmt] = useState("100");
  const [campaignAmt, setCampaignAmt] = useState("100");
  const [voter, setVoter] = useState("");
  const [chiefPick, setChiefPick] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/city", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    load();
  }, [load, view.location.country]);

  const act = async (body: Record<string, unknown>) => {
    if (await game.social(body, "/api/city")) load();
  };

  if (!data) return <section className="card"><p className="muted">Walking up the city hall steps…</p></section>;
  const c = data.city;
  const ctl = c.controls;

  return (
    <>
    <Paper paper={data.paper} />
    <section className="card cityhall">
      <h3 className="card-title"><Landmark size={16} /> City hall · {c.city}</h3>

      <div className="hall-stats">
        <div><span className="crime-label">Mayor</span><b>{c.mayor ? `${c.mayor.name}${c.mayor.you ? " (you)" : ""}` : "Empty office"}</b></div>
        <div><span className="crime-label">City tax</span><b>{Math.round(c.taxRate * 100)}%</b></div>
        <div><span className="crime-label">Treasury</span><b>${c.treasury}</b></div>
        <div><span className="crime-label">Police bounty</span><b>{c.policeBounty ? `$${c.policeBounty}` : "None"}</b></div>
        <div><span className="crime-label">Police chief</span><b>{c.chief ? `${c.chief.name}${c.chief.you ? " (you)" : ""}` : "None"}</b></div>
        <div><span className="crime-label">Soup kitchen</span><b>{c.soupMeals ? `${c.soupMeals} meals` : "Empty"}</b></div>
      </div>
      {!c.canSoup && (
        <button className="btn btn-primary btn-sm soup-btn" disabled={game.busy} onClick={() => act({ op: "soup" })}>
          <Soup size={14} /> Get a free meal
        </button>
      )}
      {c.chiefControls && (
        <div className="row wrap">
          <button className="btn btn-danger btn-sm" disabled={game.busy || !c.chiefControls.canCrackdown} onClick={() => act({ op: "crackdown" })}><Siren size={14} /> Order a crackdown</button>
          <button className="btn btn-primary btn-sm" disabled={game.busy || !c.chiefControls.canSalary} onClick={() => act({ op: "chief_salary" })}><Coins size={14} /> Chief&apos;s salary (${c.chiefControls.salary})</button>
        </div>
      )}
      {c.crackdown && <p className="crackdown"><Siren size={14} /> Crackdown in effect for {until(c.crackdown)}. Extra patrols everywhere.</p>}

      {c.recall && (c.recall.signatures > 0 || !c.recall.canSign) && (
        <div className="hall-block recall">
          <h4 className="crime-label"><Megaphone size={13} /> Recall petition</h4>
          <p className="muted">
            {c.recall.signatures} of {c.recall.needed} signatures to remove {c.mayor?.name} before the term ends.
            {c.recall.signed ? " You signed." : ""}
          </p>
          {!c.recall.canSign && (
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => act({ op: "recall" })}>Sign the recall</button>
          )}
        </div>
      )}

      {/* Election */}
      <div className="hall-block">
        <h4 className="crime-label"><Vote size={13} /> Election</h4>
        {c.electionOpen ? (
          <>
            <p className="muted">
              {c.mayor ? "The ballot is open." : "City hall is empty: special election."} Votes are counted in {until(c.termEnds)}. {c.turnout} vote{c.turnout === 1 ? "" : "s"} cast so far.
            </p>
            {c.candidates.length === 0 && <p className="muted">Nobody is running yet.</p>}
            <ul className="ballot">
              {c.candidates.map((x) => (
                <li key={x.id}>
                  <div>
                    <b>{x.name}</b> <span className="muted">· {x.title} · ★ {x.reputation}</span>
                    {x.pitch && <p className="pitch">&ldquo;{x.pitch}&rdquo;</p>}
                    {x.buzz && <p className="fine buzz">📣 {x.buzz}</p>}
                  </div>
                  {!c.canVote && (
                    <button className="btn btn-primary btn-xs" disabled={game.busy} onClick={() => act({ op: "vote", candidateId: x.id })}>Vote</button>
                  )}
                </li>
              ))}
            </ul>
            {c.myVote && <p className="fine">You voted for {c.myVote}.</p>}
            {c.amCandidate && (
              <div className="campaign">
                <form className="row wrap" onSubmit={(e) => { e.preventDefault(); act({ op: "campaign", amount: Number(campaignAmt) }); }}>
                  <input type="number" min={50} step={50} value={campaignAmt} onChange={(e) => setCampaignAmt(e.target.value)} aria-label="Campaign spend" />
                  <button className="btn btn-primary btn-sm" disabled={game.busy}>📣 Spend on the campaign</button>
                </form>
                {data.residents.length > 0 && (
                  <div className="row wrap">
                    <select value={voter || data.residents[0].id} onChange={(e) => setVoter(e.target.value)} aria-label="Resident">
                      {data.residents.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => {
                      const v = window.prompt("How much cash for their vote? Nobody sees it but internal affairs.", "50");
                      if (v) act({ op: "buy_vote", playerId: voter || data.residents[0].id, amount: Number(v) });
                    }}>Slip them some cash</button>
                  </div>
                )}
                <p className="fine muted">Campaign money shows on the ballot and breaks ties. Buying votes is a crime; internal affairs strikes you off the ballot.</p>
              </div>
            )}
            {!c.canRun && (
              <form className="row wrap run" onSubmit={(e) => { e.preventDefault(); act({ op: "run", pitch }); }}>
                <input maxLength={140} placeholder="Your campaign promise" value={pitch} onChange={(e) => setPitch(e.target.value)} />
                <button className="btn btn-ghost btn-sm" disabled={game.busy}><Megaphone size={14} /> Run for mayor ($500)</button>
              </form>
            )}
          </>
        ) : (
          <p className="muted">Next election opens in {until(c.electionOpens)}. Anyone living here with enough reputation can run.</p>
        )}
      </div>

      {/* Mayor's office */}
      {ctl && (
        <div className="hall-block mayor-office">
          <h4 className="crime-label"><Building2 size={13} /> Mayor&apos;s office</h4>
          <form className="row wrap" onSubmit={(e) => { e.preventDefault(); act({ op: "tax", rate: Number(tax ?? Math.round(c.taxRate * 100)) / 100 }); }}>
            <label className="inline">City tax
              <input type="number" min={0} max={ctl.maxTax * 100} value={tax ?? Math.round(c.taxRate * 100)} onChange={(e) => setTax(e.target.value)} />%
            </label>
            <button className="btn btn-ghost btn-sm" disabled={game.busy}>Set</button>
          </form>
          <form className="row wrap" onSubmit={(e) => { e.preventDefault(); act({ op: "bounty", amount: Number(bounty ?? c.policeBounty) }); }}>
            <label className="inline">Bounty per conviction $
              <input type="number" min={0} max={ctl.maxBounty} value={bounty ?? c.policeBounty} onChange={(e) => setBounty(e.target.value)} />
            </label>
            <button className="btn btn-ghost btn-sm" disabled={game.busy}>Set</button>
          </form>
          <div className="row wrap">
            <button className="btn btn-danger btn-sm" disabled={game.busy || !ctl.canCrackdown} onClick={() => act({ op: "crackdown" })}><Siren size={14} /> Order a crackdown</button>
            <button className="btn btn-primary btn-sm" disabled={game.busy || !ctl.canSalary} onClick={() => act({ op: "salary" })}><Coins size={14} /> Collect salary (${ctl.salary})</button>
          </div>
          <form className="row wrap" onSubmit={(e) => { e.preventDefault(); act({ op: "fund_soup", amount: Number(soupAmt) }); }}>
            <label className="inline">Soup kitchen $
              <input type="number" min={ctl.mealCost} step={ctl.mealCost} value={soupAmt} onChange={(e) => setSoupAmt(e.target.value)} />
            </label>
            <button className="btn btn-ghost btn-sm" disabled={game.busy || c.treasury < ctl.mealCost}><Soup size={14} /> Pay for meals</button>
          </form>
          <p className="fine muted">${ctl.mealCost} a meal. Feeds people with nothing; the line remembers who paid. {c.mealsServed ? `${c.mealsServed} served so far.` : ""}</p>
          {data.officers.length > 0 || c.chief ? (
            <div className="row wrap">
              {data.officers.length > 0 && (
                <>
                  <select value={chiefPick || data.officers[0].id} onChange={(e) => setChiefPick(e.target.value)} aria-label="Officer">
                    {data.officers.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.title}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => act({ op: "appoint_chief", playerId: chiefPick || data.officers[0].id })}>Appoint police chief</button>
                </>
              )}
              {c.chief && <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => act({ op: "dismiss_chief" })}>Fire {c.chief.name}</button>}
            </div>
          ) : null}
          {ctl.canPardon && data.prisoners.length > 0 && (
            <div className="pardons">
              <span className="crime-label"><Gavel size={12} /> Pardon one prisoner this term</span>
              {data.prisoners.map((x) => (
                <span key={x.id} className="suspect">
                  <span className="chip">{x.name}</span>
                  <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => act({ op: "pardon", playerId: x.id })}>Pardon</button>
                </span>
              ))}
            </div>
          )}
          <form className="row wrap skim" onSubmit={(e) => { e.preventDefault(); act({ op: "skim", amount: Number(skimAmt) }); }}>
            <input type="number" min={1} value={skimAmt} onChange={(e) => setSkimAmt(e.target.value)} aria-label="Amount" />
            <button className="btn btn-ghost btn-sm" disabled={game.busy || c.treasury <= 0}>Quietly take from the treasury</button>
          </form>
          <p className="fine muted">Nobody sees it in the city log. Internal affairs keeps its own books.</p>
        </div>
      )}

      {c.log.length > 0 && (
        <div className="hall-block">
          <h4 className="crime-label">City hall news</h4>
          <ul className="log record">
            {c.log.slice(0, 6).map((x, i) => <li key={i}>{x.text}</li>)}
          </ul>
        </div>
      )}
    </section>
    <Turf turf={data.turf} game={game} act={act} />
    </>
  );
}

function Paper({ paper }: { paper: CityData["paper"] }) {
  return (
    <section className="card paper">
      <p className="paper-name">{paper.name}</p>
      <h2 className="paper-lead">{paper.lead}</h2>
      {paper.weather && <p className="paper-weather">{paper.weather}</p>}
      <div className="paper-stats">
        <span><b>{paper.stats.crimes}</b> robberies</span>
        <span><b>${paper.stats.stolen.toLocaleString()}</b> stolen</span>
        <span><b>{paper.stats.arrests}</b> arrests</span>
        <span><b>{paper.stats.convictions}</b> convictions</span>
        <span><b>{paper.stats.unsolved}</b> unsolved</span>
      </div>
      {paper.stories.length > 0 && (
        <ul className="paper-stories">
          {paper.stories.map((x, i) => <li key={i} className={x.kind}>{x.headline}</li>)}
        </ul>
      )}
      <p className="fine muted">This week in {paper.city}.</p>
    </section>
  );
}

function Turf({ turf, game, act }: { turf: CityData["turf"]; game: GameApi; act: (b: Record<string, unknown>) => Promise<void> }) {
  return (
    <section className="card turf">
      <h3 className="card-title"><Flag size={16} /> Turf</h3>
      <p className="muted fine">Crews run districts and take a cut of what outsiders earn there. Rival crews can go to war for them.</p>
      <ul className="officials">
        {turf.map((d) => (
          <li key={d.id} className="turf-row">
            <div>
              <b>{d.name}</b>{" "}
              {d.holder ? (
                <span className={`chip ${d.holder.mine ? "chip-green" : ""}`}>[{d.holder.tag}] {d.holder.name}</span>
              ) : (
                <span className="muted">· nobody</span>
              )}
              {d.war && (
                <p className="fine war-line">
                  ⚔️ {d.war.attacker} attacking · {d.war.attackers} vs {d.war.defenders}
                  {d.war.over ? " · fighting's over" : ` · ${Math.max(1, Math.ceil((d.war.endsAt - Date.now()) / 60000))}m left`}
                </p>
              )}
            </div>
            <span className="row wrap">
              {!d.canClaim && <button className="btn btn-primary btn-xs" disabled={game.busy} onClick={() => act({ op: "claim_turf", district: d.id })}>Claim ($1,000)</button>}
              {!d.canWar && <button className="btn btn-danger btn-xs" disabled={game.busy} onClick={() => act({ op: "declare_war", district: d.id })}>Declare war</button>}
              {d.war && !d.war.over && !d.war.canJoin && <button className="btn btn-danger btn-xs" disabled={game.busy} onClick={() => act({ op: "join_war", district: d.id })}>Join the fight</button>}
              {d.war?.over && <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => act({ op: "settle_war", district: d.id })}>Settle it</button>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
