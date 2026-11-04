"use client";

// Report a player (their photo, name or intro) or a chat message to the moderators.

import { Flag } from "lucide-react";
import { useState } from "react";
import type { GameApi } from "./useGame";

const REASONS = ["Offensive photo", "Offensive name or intro", "Harassment or hate in chat", "Cheating or alt accounts", "Something else"];

export function ReportButton({ game, targetId, targetName, messageId, small = false }: { game: GameApi; targetId: string; targetName: string; messageId?: number; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(messageId ? REASONS[2] : REASONS[0]);
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) return <span className="fine muted report-sent">Reported</span>;
  if (!open) {
    return (
      <button className={`report-btn ${small ? "report-btn-sm" : "btn btn-ghost btn-sm"}`} title={`Report ${targetName}`} aria-label={`Report ${targetName}`} onClick={() => setOpen(true)}>
        <Flag size={small ? 12 : 14} />{small ? null : " Report"}
      </button>
    );
  }
  return (
    <div className="report-box">
      <span className="crime-label">Report {messageId ? "this message" : targetName}</span>
      <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
        {REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <input maxLength={150} placeholder="Anything else? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
      <div className="row">
        <button
          className="btn btn-primary btn-xs"
          disabled={game.busy}
          onClick={async () => {
            const v = await game.social({ op: "report_player", targetId, reason: details.trim() ? `${reason}: ${details.trim()}` : reason, ...(messageId !== undefined ? { messageId } : {}) });
            if (v) setSent(true);
          }}
        >
          Send report
        </button>
        <button className="btn btn-ghost btn-xs" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
