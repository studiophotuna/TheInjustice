# Design lessons

What we learned the hard way about Conspira's look. Read this before changing any screen.

## The problem we're solving

Players said the game "looks AI". Two rounds of redesign didn't fix it because each one swapped
one set of defaults for another (first a dark dashboard kit, then a noir pastiche of typewriters,
tape and stamps). Reference shots from real game and app designers (see the list below) showed that
the fix is mostly **composition and system**, not a theme.

## What makes a screen feel designed (do these)

1. **Characters break the frame.** Cut-out figures stand in front of their card and overflow its top
   edge (hero, Big Fish, chapter banners). Portraits sitting politely inside boxes read as generated.
2. **Scale contrast.** One huge headline and one big image per screen, then small dense detail.
   Never a stack of equal-weight cards.
3. **Everything gets cover art.** Events, chapters, jobs, places and crews each have an image or a
   badge, not just an icon and a sentence.
4. **Color-coded tiles for the state of the world.** Tinted tiles with one big number
   ("9 out on the street", "1 wanted"). Each category keeps its color everywhere.
5. **Live things look live.** Scoreboards, timelines with a track, LIVE tags, countdowns
   (turf wars, ambushes, trials, elections), modeled on live sports widgets.
6. **A visible social layer.** Faces everywhere: map pins are faces, rosters are photo grids with
   role badges, the desktop right rail is city chat with an online count.
7. **One kit, applied strictly.** One corner radius (18px cards, pill buttons), one avatar ring
   style, one badge style, two typefaces (a condensed display face for headlines and names, a clean
   UI sans for everything else).

## What makes a screen look generated (avoid these)

- Mixing art styles (stock photos + cartoon avatars + vector silhouettes + icon-library tiles).
  Pick one portrait treatment and use it for every person.
- An explainer paragraph at the top of every card. Put help behind a "?" or a first-visit tip.
- A stock line icon in front of every title, and emoji in UI text.
- Chips and pills on everything ("Watch · Shady · Risky"). One subtle marker is enough.
- Genre clichés as the whole idea (typewriter + tape + coffee-stained paper = "noir").
- Casino/betting styling: gift boxes, "free money" banners, purple-to-pink gradient buttons.
  It makes a crime game look like a gambling app.
- Generic AI-rendered character art. It's the exact look players are calling out.
- Placeholder-looking parts: flat colored rectangles as a map, repeated identical ledger rows,
  progress bars at 0%, the same panel repeated on every tab.

## Game rules the design must respect

- **Never show win odds or success percentages** on attacks, crimes or fights (player request).
  Show descriptive information instead: build, crew, reputation, record.
- Phone first. Every screen must work at 390px wide with no horizontal scroll.

## Process lessons (to improve faster)

- **Look before judging.** Screenshot the real screens (phone and desktop) before proposing changes.
- **Mock up two screens before touching the game.** Standalone page, real data and real photos,
  shown side by side. Only roll out a direction the owner approves.
- **Check the mockup screenshots yourself** before sending: broken CSS, wrapped buttons and
  floating fixed bars all happened and were caught this way.
- **Use references.** When the owner shares reference images, list what to take, where it goes in
  Conspira, and what not to take, then mock it.
- **Art is the bottleneck.** Background removal (`rembg`, model `isnet-general-use`) works on our
  portraits, but they are 360px video stills, so cut-outs are soft and some poses are unusable.
  Real fix: commission a consistent set of character cut-outs (15 to 20) and cover art.

## References studied

- A tennis live-score dashboard (face-off header, live widgets, chat rail, profile panel).
- "mafia.game" app concept (huge condensed headline, event story circles, tinted stat tiles,
  map with photo pins, player grid with role badges).
- "Oasis Bet" casino lobby (characters breaking out of banners, cover-art tiles, chat rail,
  balance pill with a "+"). Take the composition, not the casino styling.
