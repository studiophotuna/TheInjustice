// The frame for the help and legal pages: logo back to the game, a title, the text.
import type { ReactNode } from "react";
import { AGE } from "@/game/age";

/** Details only the owner can fill in. Until `final` is true the legal pages say they're a draft. */
export const LEGAL = {
  studio: "the Crookvale team",
  contact: "the Report button in the game, or the contact address we'll publish here before launch",
  updated: "7 November 2026",
  minAge: AGE.min,
  final: false,
};

export const INFO_LINKS = [
  { href: "/guide", label: "How to play" },
  { href: "/rules", label: "Rules" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function InfoPage({ title, kicker, draft, children }: { title: string; kicker: string; draft?: boolean; children: ReactNode }) {
  return (
    <div className="info-page">
      <header className="info-head">
        <a href="/" className="info-back" aria-label="Crookvale, back to the game">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark-400.webp" alt="Crookvale" width={150} height={43} />
        </a>
        <nav>
          {INFO_LINKS.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>
      </header>
      <main className="info-body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="info-badge" src="/brand/logo-320.webp" alt="" width={120} height={119} />
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
        {draft && !LEGAL.final && (
          <p className="info-draft">Draft, last updated {LEGAL.updated}. This will be reviewed before the game launches publicly.</p>
        )}
        {children}
        <p className="info-foot"><a href="/">Back to the game</a></p>
      </main>
    </div>
  );
}
