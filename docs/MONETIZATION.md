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

## Later, in this order

1. Season pass on the monthly Season: a free and a paid track of looks, earned by playing.
2. Player exchange: sell Favors to other players for in-game cash, only through an official
   order board (escrow, player-set prices, 10% fee as a money sink, weekly caps, a 7-day hold
   on bought Favors, no trading for brand-new accounts).
3. Property is never sold for Favors or real money.

## Connecting payments

- Use a merchant of record (Paddle or Lemon Squeezy) so sales tax and VAT are handled; Stripe
  works too. App stores take 15 to 30% if the game ever ships as a store app.
- The provider's webhook verifies the signature, then calls `creditFavors(player, pack.favors,
  "Pack of N", now, paymentId)` inside `store.update`.
- Set `NEXT_PUBLIC_FAVORS_STORE=open` to switch the packs from "coming soon" to checkout.
- Before launch: terms of service, refund policy, age rating (the game has crime, drugs and a
  casino theme), and a lawyer's look at the exchange.
