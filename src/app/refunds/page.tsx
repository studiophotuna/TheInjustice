import type { Metadata } from "next";
import { InfoPage, LEGAL } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Refund policy · Conspira", description: "Refunds for Favors bought in Conspira." };

export default function RefundsPage() {
  return (
    <InfoPage kicker="Refunds" title="Refund policy" draft>
      <p className="lead">
        Favors are a virtual currency for looks in Conspira. Payments are handled by our reseller, Lemon Squeezy, who appears on
        your statement and handles tax and receipts.
      </p>

      <h2>Within 14 days, unused</h2>
      <p>
        If you bought a pack of Favors in the last 14 days and haven&apos;t spent any of them, ask for a refund and you&apos;ll get your
        money back in full. Use the link in your receipt email or contact {LEGAL.contact}.
      </p>

      <h2>Once Favors are spent</h2>
      <p>
        Favors spent on looks, the season pass or an upload are used up, so they can&apos;t be refunded, except where the law where
        you live says otherwise. Uploads a moderator rejects are refunded in Favors automatically.
      </p>

      <h2>Mistakes and problems</h2>
      <p>
        Charged twice, or Favors that never arrived? Contact us with the order number from your receipt and we&apos;ll fix it.
      </p>

      <h2>What a refund does in the game</h2>
      <p>
        When a pack is refunded, the Favors from it are taken back from your balance. Chargebacks filed with your bank without
        contacting us first may lead to the account being suspended while we look into it.
      </p>

      <h2>Banned accounts</h2>
      <p>Favors on an account banned for breaking the <a href="/rules">player rules</a> are not refunded.</p>
    </InfoPage>
  );
}
