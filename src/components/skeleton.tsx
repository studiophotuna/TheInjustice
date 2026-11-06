// Skeleton screens: grey shapes where the real content will land, so loading looks like the
// game arriving instead of a spinner or a line of text. Shapes follow the real layouts.

const Bar = ({ w = "100%", h = 12, r = 8, className = "" }: { w?: number | string; h?: number; r?: number; className?: string }) => (
  <span className={`skel ${className}`} style={{ width: w, height: h, borderRadius: r }} aria-hidden />
);

/** A card with a title bar and a few lines. */
export function SkelCard({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <section className={`card skel-card ${className}`} aria-hidden>
      <Bar w="45%" h={20} />
      {Array.from({ length: lines }, (_, i) => <Bar key={i} w={`${92 - i * 14}%`} />)}
    </section>
  );
}

/** Rows of people or things: a round picture and two lines each. */
export function SkelRows({ rows = 4, square = false }: { rows?: number; square?: boolean }) {
  return (
    <div className="skel-rows" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel-row">
          <Bar w={44} h={44} r={square ? 12 : 22} />
          <div className="skel-lines"><Bar w={`${60 - (i % 3) * 10}%`} h={13} /><Bar w={`${40 + (i % 2) * 15}%`} h={10} /></div>
        </div>
      ))}
    </div>
  );
}

/** The People lineup: a grid of player cards. */
export function SkelLineup({ cards = 6 }: { cards?: number }) {
  return (
    <div className="lineup" aria-hidden>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="suspect-card skel-person">
          <Bar w="100%" h={0} r={0} className="skel-photo" />
          <div className="skel-lines pad"><Bar w="70%" h={13} /><Bar w="45%" h={10} /></div>
        </div>
      ))}
    </div>
  );
}

/** The city tiles row on Home. */
export function SkelTiles() {
  return (
    <div className="tiles skel-tiles" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => <Bar key={i} w="100%" h={74} r={16} />)}
    </div>
  );
}

/** The whole game while it starts: top bar, story bubbles, the hero and the first cards. */
export function SkelShell() {
  return (
    <div className="skel-shell" aria-busy="true" aria-label="Loading the game">
      <div className="skel-hud">
        <Bar w={46} h={46} r={23} />
        <Bar w={96} h={36} r={18} />
        <Bar w={76} h={36} r={18} />
        <Bar w={64} h={36} r={18} />
      </div>
      <div className="skel-stories">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skel-story"><Bar w={66} h={66} r={33} /><Bar w={50} h={9} /></div>
        ))}
      </div>
      <div className="skel-hero">
        <Bar w="38%" h={11} />
        <Bar w="70%" h={40} r={10} />
        <Bar w="50%" h={13} />
        <Bar w={170} h={46} r={23} />
      </div>
      <Bar w="55%" h={24} />
      <SkelTiles />
      <SkelCard lines={2} />
      <div className="skel-side">
        <Bar w={150} h={30} />
        {Array.from({ length: 7 }, (_, i) => <Bar key={i} w={i === 0 ? 180 : 120} h={i === 0 ? 40 : 16} r={i === 0 ? 12 : 8} />)}
      </div>
      <div className="skel-rail">
        <SkelCard lines={3} />
        <SkelCard lines={4} />
        <section className="card skel-card"><Bar w="40%" h={20} /><SkelRows rows={4} /></section>
      </div>
    </div>
  );
}
