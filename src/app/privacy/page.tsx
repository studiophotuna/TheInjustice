import type { Metadata } from "next";
import { InfoPage, LEGAL } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Privacy · Crookvale", description: "What Crookvale stores about you and why." };

export default function PrivacyPage() {
  return (
    <InfoPage kicker="Privacy" title="Privacy policy" draft>
      <p className="lead">
        We keep as little about you as the game needs to work and to stay fair. No ads, no tracking across other sites, and we
        don&apos;t sell your data.
      </p>

      <h2>What we store</h2>
      <ul>
        <li><b>Your account:</b> your username, your password and recovery code (only as scrambled hashes we can&apos;t read back), and login sessions.</li>
        <li><b>Your date of birth:</b> only to check you&apos;re old enough to play. It&apos;s never shown to anyone.</li>
        <li><b>Your character:</b> everything you do in the game: name, progress, money, items, messages to the game&apos;s systems, and your journal.</li>
        <li><b>What you post:</b> chat messages, your bio and profile photo, uploaded frames and banners, crew notes and forum posts.</li>
        <li><b>Reports:</b> reports you make or that are made about you, and what moderators decided.</li>
        <li><b>Phone alerts:</b> if you turn them on, the address your browser gives us for sending them, and which alerts you want.</li>
        <li><b>Purchases:</b> the order number and which pack you bought. Lemon Squeezy, our reseller, handles the payment itself; we never see your card.</li>
        <li><b>Crash reports:</b> when the game breaks, the error message, the page and the game version. Nothing that identifies you.</li>
        <li><b>Fair-play signals:</b> a random device ID stored in a cookie and a scrambled, shortened version of your IP address, used only to spot several characters played by one person.</li>
      </ul>
      <p>We don&apos;t ask for your real name, email, phone number or location.</p>

      <h2>Cookies and local storage</h2>
      <p>
        We use a few cookies that the game needs: one to keep you logged in, one for your guest character, and one device ID for
        fair play. Your browser also keeps small settings, such as motion, sound and which tab you were on. There are no advertising
        or analytics cookies.
      </p>

      <h2>Why we use it</h2>
      <p>
        To run the game and save your progress, to show what you post to other players, to keep the game fair and safe (moderation,
        stopping cheating and abuse), and to fix problems. When you buy Favors, Lemon Squeezy handles your payment details as the
        seller of record; we only receive a confirmation of what you bought.
      </p>

      <h2>Who else handles it</h2>
      <p>
        The game runs on Vercel (hosting) and Supabase (database), who store data for us under their own security and privacy terms.
        Servers may be outside your country. We share data with authorities only when the law requires it, or to report sexual
        content involving minors.
      </p>

      <h2>How long we keep it</h2>
      <p>
        As long as your character exists. Login sessions expire after 30 days. Deleted chat messages are gone. Moderation reports are
        kept so repeat abuse can be spotted, even after an account is deleted.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li><b>Delete everything:</b> Me → Account → Delete my account removes your character, login, chat messages and uploads at once.</li>
        <li><b>Change what others see:</b> edit or clear your bio and photo any time.</li>
        <li><b>Ask us:</b> for a copy of your data or a correction, contact {LEGAL.contact}.</li>
      </ul>
      <p>
        Depending on where you live (for example the EU, UK or California) you may have further rights, including to complain to
        your data protection authority.
      </p>

      <h2>Children</h2>
      <p>
        Crookvale is for players aged {LEGAL.minAge} and up. If we learn a younger child has an account, we&apos;ll delete it.
      </p>

      <h2>Changes</h2>
      <p>We&apos;ll post changes here with a new date at the top.</p>
    </InfoPage>
  );
}
