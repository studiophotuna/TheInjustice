# Making money from Conspira

The rules every paid feature follows. Decided with the owner in November 2026.

## Favors (the premium currency)

- Bought with real money once a payment provider is connected; until then the packs show
  "coming soon" and moderators can grant Favors from /admin for testing and support.
- Spent on looks only: frames around your face, name colours, profile banners (more later: car
  paint, dog collars, home decor, crew banners, fight effects).
- Never buy power: no energy, stats, gear, cash, property, rank, odds, or time off a jail,
  hospital or travel timer.
- Never turn back into real money.
- One social extra, by the owner's choice: the microphone (speak in Global chat). It gives no
  advantage in play.
- No loot boxes or random paid rewards.
- Every credit has a reference (payment or grant id) and is counted once, so a payment
  provider can resend its notice safely (`creditFavors` in src/game/favors.ts).

## Uploaded looks

- Players can upload their own frame (PNG/WebP with a see-through middle) and banner
  (JPEG/PNG/WebP), paid in Favors (300 and 250 to start).
- Every upload waits for a moderator. Nobody else sees it until it's approved; a rejection
  refunds the Favors once and tells the player why.
- Rules shown at upload: no nudity, hate, real people without their consent, or art from
  other games. Moderators review from /admin.

## Spend-only and held Favors

- Granted Favors (moderators), free season-pass rewards and upload refunds are spend-only: they
  can never be sold on the exchange (`favorsLocked`).
- Favors bought with money or on the exchange are held for 7 days before they can be listed
  (`favorHolds`). Spending uses up spend-only Favors first, then held ones.

## Season pass (built, v6.2.0)

- Ten levels a month, climbed by playing: a job or gym session is 1 mark, a fight won 2, an
  arrest 3. Each level has a free reward and a pass reward (looks and Favors only).
- The pass costs 500 Favors and lasts the calendar month. Earned-but-uncollected rewards are
  handed over when the month turns. A look you already own becomes 30 Favors.
- Pass looks are never sold in the shop.

## Favors exchange (built, v6.2.0)

- Sell Favors to other players for in-game bank money, only through the board in Shop → Style.
- Favors are held in escrow on the order; 10% of each sale leaves the game as a money sink.
- 50 to 2,000 Favors a lot, $1 to $5,000 per Favor, up to 5 open orders, 3,000 sold and 3,000
  bought per week. Saved accounts at least 7 days old only.
- Still to do before real money flows: a lawyer's look at the exchange.

## Never

- Property is never sold for Favors or real money.

## Connecting payments (Lemon Squeezy)

The code is ready; these steps are the owner's:

1. Create a Lemon Squeezy store and one product with four variants matching the packs in
   `FAVORS.packs` (100 / $1.99, 550 / $9.99, 1,200 / $19.99, 3,200 / $49.99). Prices must be in
   USD; an order paying less than the pack's price is not credited.
2. Add a webhook to `https://<site>/api/payments/lemonsqueezy` for `order_created` and
   `order_refunded`, and put its signing secret in the Vercel variable
   `LEMONSQUEEZY_WEBHOOK_SECRET`.
3. Put the four "buy" links in `NEXT_PUBLIC_FAVORS_CHECKOUT` as JSON:
   `{"pack_100":"https://<store>.lemonsqueezy.com/buy/<id>", ...}`. The game adds the player's id
   and the pack as checkout custom data.
4. Set `NEXT_PUBLIC_FAVORS_STORE=open` and redeploy. Only saved accounts can buy.
5. Test-mode orders are ignored unless `FAVORS_ALLOW_TEST_ORDERS=1` (use that on a preview).
6. Before launch: finish the terms, privacy and refund pages (`LEGAL` in
   src/components/InfoPage.tsx), and get an age rating (crime, drugs and casino themes).
