import type { Metadata } from "next";
import { InfoPage, LEGAL } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Terms of service · Conspira", description: "The terms for playing Conspira." };

export default function TermsPage() {
  return (
    <InfoPage kicker="Terms" title="Terms of service" draft>
      <p className="lead">
        These terms are the agreement between you and {LEGAL.studio} when you play Conspira. By playing you agree to them and to
        the <a href="/rules">player rules</a>. If you don&apos;t agree, please don&apos;t play.
      </p>

      <h2>1. Who can play</h2>
      <p>
        You must be at least {LEGAL.minAge} years old. The game is fiction about crime, violence, drugs and gambling themes, with no
        real-money gambling. If the law where you live sets a higher age for games like this, that age applies.
      </p>

      <h2>2. Your account</h2>
      <p>
        You can play as a guest or create an account. Keep your password and recovery code safe; anyone with them can use your
        account. You&apos;re responsible for what happens on it. One character per person.
      </p>

      <h2>3. The game is ours, your character is yours to play</h2>
      <p>
        The game, its art, text and code belong to {LEGAL.studio}. You get a personal, non-transferable right to play it. Your
        character, in-game money, items, property and Favors have no value outside the game. They are not your property, can&apos;t be
        sold or traded for real money, and can change when the game is balanced or updated.
      </p>

      <h2>4. Favors</h2>
      <p>
        Favors are a virtual currency for looks: frames, name colours, banners, uploads and similar extras. They never buy power. If
        Favors are sold, prices are shown before you pay. Favors are a licence to use them in the game, not money: they can&apos;t be
        cashed out and aren&apos;t refunded except where the law requires it or our refund policy says so. Favors may be granted for
        free, for example by moderators for support.
      </p>

      <h2>5. What you post</h2>
      <p>
        You keep the rights to what you write and upload, and you give us permission to show it in the game, store it and remove it.
        Only upload what you have the right to use. We can remove anything that breaks the rules.
      </p>

      <h2>6. Rules and enforcement</h2>
      <p>
        Breaking the <a href="/rules">player rules</a> can get messages removed, your character muted, suspended or banned, and
        unfair gains taken away. We may act without warning for serious cases.
      </p>

      <h2>7. Changes and availability</h2>
      <p>
        The game is a live service. We change, add and remove things, reset seasons, and sometimes take it offline for maintenance.
        We may end the game one day; we&apos;ll give reasonable notice where we can. We&apos;ll post changes to these terms here, and
        playing after a change means you accept it.
      </p>

      <h2>8. Ending your account</h2>
      <p>
        You can delete your account at any time from the Me page. That deletes your character for good. We can close accounts that
        break these terms.
      </p>

      <h2>9. No warranty, limited liability</h2>
      <p>
        The game is provided as it is, without guarantees that it will always work or be free of bugs. As far as the law allows, we
        aren&apos;t liable for indirect losses or for lost in-game items, and our total liability is limited to what you paid us in the
        last twelve months. Nothing here limits rights you have by law that can&apos;t be limited.
      </p>

      <h2>10. Contact</h2>
      <p>Questions about these terms: {LEGAL.contact}.</p>
    </InfoPage>
  );
}
