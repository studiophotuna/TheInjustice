import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Player rules · Conspira", description: "The rules every Conspira player agrees to." };

export default function RulesPage() {
  return (
    <InfoPage kicker="Rules" title="Player rules">
      <p className="lead">
        Conspira is a game about crime. Inside the game, betray, rob and outplay each other as much as you like. These rules are
        about how you treat real people and the game itself.
      </p>

      <h2>Play fair</h2>
      <ul>
        <li><b>One character per person.</b> No second accounts to feed your main, vote for yourself, or dodge a ban. We can tell when accounts share a device or a connection.</li>
        <li><b>No bots or scripts.</b> Play with your own hands. Automated clicking, macros and anything that plays for you are banned.</li>
        <li><b>No exploiting bugs.</b> If you find one, report it. Using it for gain gets the gains removed, and repeat use gets you banned.</li>
        <li><b>No trading for real money.</b> Don&apos;t sell in-game cash, items, property or characters for real money or anything outside the game.</li>
        <li><b>Don&apos;t share accounts</b> or log into someone else&apos;s.</li>
      </ul>

      <h2>Treat people well</h2>
      <ul>
        <li><b>No hate.</b> No slurs, and nothing attacking people for their race, religion, nationality, gender, sexuality or disability.</li>
        <li><b>No harassment.</b> In-game rivalry is fine. Following someone around to abuse them, or targeting them outside the game, is not.</li>
        <li><b>No threats of real harm</b>, and never tell anyone to hurt themselves.</li>
        <li><b>No sexual content</b>, and nothing sexual involving minors, ever. That one is reported to the authorities.</li>
        <li><b>Keep real life out.</b> Don&apos;t share anyone&apos;s real name, address, photos or other personal details, including your own.</li>
        <li><b>No spam or advertising</b>, and no links in chat.</li>
        <li><b>Don&apos;t pretend to be staff.</b></li>
      </ul>

      <h2>Names, photos and uploads</h2>
      <p>
        Names, bios, crew names, profile photos and uploaded frames and banners follow the same rules. No nudity, hate, real people
        without their consent, or art taken from other games. Uploads are checked by a moderator before anyone else sees them.
      </p>

      <h2>What happens if you break them</h2>
      <p>
        Moderators can delete messages, mute you, suspend your character for a while, remove things you gained unfairly, or ban you
        for good. We go by what you did, not who you are. Serious cases (threats, sexual content involving minors) can skip straight
        to a permanent ban. Favors spent on an account that gets banned for breaking these rules are not refunded.
      </p>

      <h2>Reporting</h2>
      <p>
        Tap a player or a message and choose <b>Report</b>. Reports are private: the person you report isn&apos;t told who reported them.
        You can also block anyone so you stop seeing their messages.
      </p>
    </InfoPage>
  );
}
