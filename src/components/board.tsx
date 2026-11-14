"use client";

import { Lock } from "lucide-react";
import { NPC_FACES } from "@/game/content/faces";
import { useLayoutEffect, useRef, useState } from "react";
import { CHAPTER_BY_ID } from "@/game/content/story";
import type { GameApi } from "./useGame";
import type { PublicView } from "@/game/view";

/** The people behind your frame-up. Each is unmasked by evidence that names them. */
export const SUSPECTS = [
  { id: "crane", name: "Judge Aldous Crane", role: "Sentenced you", match: /Crane/ },
  { id: "benny", name: "Benny Marlowe", role: "The witness", match: /Benny|Marlowe/ },
  { id: "kozak", name: "Kozak", role: "Runs Iron Row", match: /Kozak/ },
  { id: "cp", name: "C&P Holdings", role: "Follow the money", match: /C&P/ },
];

const careerOf = (title: string) => title.split(" · ")[0];

/** How to uncover a chapter you haven't found yet. */
function unlockHint(id: string, title: string): string {
  if (id === "old_faces") return "Do 15 jobs anywhere.";
  const m = id.match(/_(\d)$/);
  if (m) return `Reach rank ${m[1]} in the ${careerOf(title)} career.`;
  return "Keep playing.";
}

type Clue = { id: string; title: string; teaser: string; state: "read" | "new" | "locked"; hint: string; links: string[]; read?: () => void; photo?: string };

/**
 * Evidence with a painted photo (public/evidence/<lead>.jpg, square). Shown on the board once the
 * lead is closed; add the lead id here when its image arrives.
 */
export const EVIDENCE_ART = new Set<string>(["benny_seen"]);

/**
 * The conspiracy board: every chapter of your story is a piece of evidence pinned to the wall,
 * tied with red string to the people it points at. Locked pieces tell you how to find them, so
 * the board doubles as a map of what to do next (and a reason to try another career).
 */
/** Every piece of evidence: chapters you read, a clue bought on the street, and leads you closed. */
export function caseClues(view: PublicView, onRead: (id: string) => void): Clue[] {
  const clues: Clue[] = view.chapters.map((c) => {
    const text = CHAPTER_BY_ID[c.id]?.panels.map((p) => p.caption).join(" ") ?? "";
    return {
      id: c.id,
      title: c.title.replace(/^Chapter \d+ · /, ""),
      teaser: c.teaser,
      state: !c.unlocked ? "locked" : c.read ? "read" : "new",
      hint: unlockHint(c.id, c.title),
      links: SUSPECTS.filter((s) => s.match.test(text)).map((s) => s.id),
      read: c.unlocked ? () => onRead(c.id) : undefined,
    };
  });
  // Clues bought on the street (see encounters.ts).
  if (view.flags.includes("clue:missing_page")) {
    clues.push({ id: "missing_page", title: "The missing page", teaser: "Witness list, one name crossed out, initialled A.C.", state: "read", hint: "", links: ["crane"] });
  }
  // Leads (see leads.ts): closing one pins its evidence here.
  for (const l of view.leads) {
    clues.push({
      id: `lead:${l.id}`,
      title: l.evidence.title,
      teaser: l.evidence.teaser,
      state: l.state === "closed" ? "read" : "locked",
      hint: `Lead: ${l.title}`,
      links: l.evidence.links,
      photo: l.state === "closed" && EVIDENCE_ART.has(l.id) ? `/evidence/${l.id}.jpg` : undefined,
    });
  }
  return clues;
}

/** How far your case has come: evidence found, and which suspects you can put a face to. */
export function caseProgress(view: PublicView) {
  const clues = caseClues(view, () => undefined);
  const found = clues.filter((c) => c.state !== "locked");
  return { found: found.length, total: clues.length, known: new Set(found.flatMap((c) => c.links)) };
}

export function ConspiracyBoard({ game, onRead }: { game: GameApi; onRead: (id: string) => void }) {
  const view = game.view!;
  const wall = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; faint: boolean }[]>([]);

  const clues = caseClues(view, onRead);
  // Found evidence first; only a few missing pieces until you ask for all of them.
  const ordered = [...clues.filter((c) => c.state === "new"), ...clues.filter((c) => c.state === "read"), ...clues.filter((c) => c.state === "locked")];
  const lockedAll = ordered.filter((c) => c.state === "locked");
  const visible = showAll ? ordered : [...ordered.filter((c) => c.state !== "locked"), ...lockedAll.slice(0, 4)];
  const hiddenLocked = showAll ? 0 : Math.max(0, lockedAll.length - 4);
  const known = new Set(clues.filter((c) => c.state !== "locked").flatMap((c) => c.links));
  const found = clues.filter((c) => c.state !== "locked").length;

  useLayoutEffect(() => {
    const el = wall.current;
    if (!el) return;
    const draw = () => {
      const box = el.getBoundingClientRect();
      const at = (sel: string) => {
        const n = el.querySelector<HTMLElement>(sel);
        if (!n) return null;
        const r = n.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + 10 };
      };
      const out: typeof lines = [];
      for (const c of clues) {
        if (c.state === "locked") continue;
        const from = at(`[data-clue="${c.id}"]`);
        for (const s of c.links) {
          const to = at(`[data-suspect="${s}"]`);
          if (from && to) out.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y + 40, faint: c.state === "new" });
        }
      }
      setLines(out);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
    // The clue list is derived from view; redraw when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.chapters, view.flags, view.leads, showAll]);

  return (
    <section className="card board" id="the-board">
      <div className="row between">
        <h3 className="card-title">The board · who framed you</h3>
        <span className="board-score">{found}/{clues.length} evidence · {known.size}/{SUSPECTS.length} suspects</span>
      </div>
      <div className="board-wall" ref={wall}>
        <svg className="board-strings" aria-hidden>
          {lines.map((l, i) => (
            <path key={i} d={`M${l.x1} ${l.y1} Q ${(l.x1 + l.x2) / 2} ${Math.max(l.y1, l.y2) + 18} ${l.x2} ${l.y2}`} className={l.faint ? "faint" : ""} />
          ))}
        </svg>
        <div className="board-suspects">
          {SUSPECTS.map((s) => (
            <div key={s.id} data-suspect={s.id} className={`suspect${known.has(s.id) ? " known" : ""}`}>
              <span className="pin" />
              {known.has(s.id) && NPC_FACES[s.id] ? (
                <img className="suspect-face suspect-photo" src={NPC_FACES[s.id]} alt="" />
              ) : (
                <span className="suspect-face">{known.has(s.id) ? s.name.split(" ").map((w) => w[0]).slice(0, 2).join("") : "?"}</span>
              )}
              <b>{known.has(s.id) ? s.name : "Unknown"}</b>
              <small>{known.has(s.id) ? s.role : "Not identified"}</small>
            </div>
          ))}
        </div>
        <div className="board-clues">
          {visible.map((c) => (
            <button key={c.id} data-clue={c.id} className={`clue ${c.state}${c.photo ? " has-photo" : ""}`} disabled={!c.read} onClick={c.read}>
              <span className="pin" />
              {c.photo && <img className="clue-photo" src={c.photo} alt="" loading="lazy" />}
              {c.state === "locked" ? (
                <>
                  <b><Lock size={12} /> Missing evidence</b>
                  <small>{c.hint}</small>
                </>
              ) : (
                <>
                  <b>{c.title}</b>
                  <small>{c.teaser}</small>
                  {c.state === "new" && <span className="clue-new">New · read it</span>}
                </>
              )}
            </button>
          ))}
        </div>
        {hiddenLocked > 0 && (
          <button className="btn btn-ghost btn-sm board-more" onClick={() => setShowAll(true)}>
            + {hiddenLocked} more pieces of missing evidence
          </button>
        )}
      </div>
    </section>
  );
}
