// Photo faces for people without an uploaded photo: street regulars, and players who pick one.
// Stills from Mixkit stock video (Mixkit Stock Video Free License, see public/scenes/CREDITS.md):
// close-ups cropped to the face in public/faces, plus the career portraits that show a face.
// Each is tagged by gender so a character's face matches who they are written as.

export type Gender = "f" | "m";
export interface Face { src: string; g: Gender; old?: boolean; /** Only players wear it (never a regular or a story character). */ player?: boolean }

const mk = (id: string, g: Gender, old = false): [string, Face] => [`mk${id}`, { src: `/faces/mk${id}.jpg`, g, ...(old ? { old } : {}) }];
const pl = (id: string, g: Gender, old = false): [string, Face] => [`mk${id}`, { src: `/faces/mk${id}.jpg`, g, player: true, ...(old ? { old } : {}) }];
const pt = (id: string, g: Gender, old = false): [string, Face] => [id, { src: `/portraits/${id}.jpg`, g, ...(old ? { old } : {}) }];

export const FACES: Record<string, Face> = Object.fromEntries([
  ...["12934", "13737", "14090", "16107", "16108", "23740", "32845", "35808", "36445", "41334", "41922", "4727", "4736", "4813", "49249", "51755", "6341", "4634"].map((i) => mk(i, "m")),
  ...["33210", "33539", "4764", "9248", "21449"].map((i) => mk(i, "m", true)),
  ...["1299", "23300", "25005", "32161", "32642", "33204", "33328", "33532", "44544", "4573", "46680", "4804", "4834", "49439", "4954", "5179", "5798", "9236"].map((i) => mk(i, "f")),
  ...["32188", "32837", "33352", "4781", "5777"].map((i) => mk(i, "f", true)),
  ...["banking-3", "banking-5", "banking-6", "courts-3", "courts-5", "enforcer-6", "police-1", "police-2", "police-3", "police-6", "police-8", "vigilante-2", "vigilante-3", "vigilante-5", "vigilante-8", "military-4"].map((i) => pt(i, "m")),
  ...["enforcer-3", "enforcer-8", "medicine-4"].map((i) => pt(i, "m", true)),
  ...["medicine-6", "medicine-8", "police-4"].map((i) => pt(i, "f")),
  ...["medicine-7"].map((i) => pt(i, "f", true)),
  // Players' own faces: defaults for anyone who hasn't picked one, and the choices in Edit profile.
  ...["11683", "24633", "31413", "40371", "43806", "4535", "45460", "4818", "4837", "4875", "8761"].map((i) => pl(i, "m")),
  ...["5478"].map((i) => pl(i, "m", true)),
  ...["1229", "13203", "43830", "44295", "44560", "4543", "4826", "4859", "4870", "49614", "49647", "52039", "52196"].map((i) => pl(i, "f")),
]);

export const FACE_SRCS = new Set(Object.values(FACES).map((f) => f.src));

/** How each street regular is written: gender, and the older ones. */
export const REGULAR_LOOKS: Record<string, { g: Gender; old?: boolean; face?: string }> = {
  // Varrow
  gus: { g: "m", old: true }, rosa: { g: "f" }, dutch: { g: "m" }, ivy: { g: "f" }, teo: { g: "m" }, mags: { g: "f" },
  lenny: { g: "m" }, bea: { g: "f" }, sully: { g: "m" }, nico: { g: "m" },
  crowe: { g: "m", old: true, face: "enforcer-3" }, webb: { g: "m", face: "mk4634" },
  // Solmarra
  lucia: { g: "f" }, dario: { g: "m" }, marisol: { g: "f" }, beppe: { g: "m" }, ana: { g: "f" }, tomas: { g: "m" },
  pia: { g: "f" }, rico: { g: "m" }, elena: { g: "f" }, matteo: { g: "m" },
  bruni: { g: "m", old: true, face: "enforcer-8" }, vargas: { g: "m", old: true, face: "mk9248" },
  // Kestrova
  anya: { g: "f" }, pavel: { g: "m" }, irina: { g: "f" }, bogdan: { g: "m" }, vera: { g: "f" }, oleg: { g: "m", old: true },
  katya: { g: "f" }, stefan: { g: "m" }, dusan: { g: "m" }, yuri: { g: "m" },
  hraba: { g: "m", old: true, face: "mk33539" }, sorokina: { g: "f", face: "mk32642" },
  // Meridian
  sloane: { g: "f" }, jules: { g: "m" }, kai: { g: "m" }, dex: { g: "m" }, noor: { g: "f" }, finn: { g: "m" },
  zara: { g: "f" }, milo2: { g: "m" }, reed: { g: "m" }, tess: { g: "f" },
  vale: { g: "m", old: true, face: "mk21449" }, thorne: { g: "m", face: "mk14090" },
};

/**
 * Fixed faces for the story's own people (career contacts, the suspects on the board) and the
 * street toughs you fight. Contacts are written as: women Reyes, Marsh, Mercy, Quell, Dobrev,
 * Okafor; men Kozak, Silas, Brann, Brennan, Crane, Benny.
 */
export const NPC_FACES: Record<string, string> = {};

/** Every NPC is drawn as their career's character. People without a career are the street. */
export const CAREER_ART = ["police", "enforcer", "courts", "vigilante", "medicine", "banking", "military", "mechanic", "hacker", "fire", "street"] as const;
/** Careers drawn as a woman too. The rest (soldier, mechanic, hacker, firefighter) are shared. */
const WOMEN = new Set(["police", "enforcer", "courts", "medicine", "banking", "vigilante", "street"]);
const artOf = (path: string | null | undefined, g: Gender = "m") => {
  const career = path && (CAREER_ART as readonly string[]).includes(path) ? path : "street";
  return g === "f" && WOMEN.has(career) ? `${career}-f` : career;
};
export const careerFace = (path: string | null | undefined, g: Gender = "m") => `/careers/${artOf(path, g)}-face.webp`;
export const careerCutout = (path: string | null | undefined, g: Gender = "m") => `/careers/${artOf(path, g)}.webp`;
/** The gender a regular is written as. */
export const regularGender = (key: string): Gender => REGULAR_LOOKS[key]?.g ?? "m";

/** The story's own people and the street toughs, by career. */
const NPC_WOMEN = new Set(["reyes", "marsh", "mercy", "quell", "dobrev", "okafor"]);
export const NPC_CAREER: Record<string, string> = {
  reyes: "police", kozak: "enforcer", marsh: "courts", silas: "vigilante", mercy: "medicine", quell: "banking",
  brann: "military", dobrev: "mechanic", okafor: "hacker", brennan: "fire", crane: "courts", benny: "street",
  alley_rat: "street", drunk_sailor: "street", dock_brawler: "street", southside_bruiser: "street", iron_foreman: "mechanic",
  mugger: "street", beach_hustler: "street", casino_bouncer: "enforcer", rail_rat: "street", state_enforcer: "police",
  undercity_scav: "street", corp_security: "police", road_gang: "street",
};
for (const [id, path] of Object.entries(NPC_CAREER)) NPC_FACES[id] = careerFace(path, NPC_WOMEN.has(id) ? "f" : "m");
const NPC_SRCS = new Set(Object.values(NPC_FACES));

/** Which regulars share a city (the same order as the roster). */
const CITIES: string[][] = [
  ["gus", "rosa", "dutch", "ivy", "teo", "mags", "lenny", "bea", "sully", "nico", "crowe", "webb"],
  ["lucia", "dario", "marisol", "beppe", "ana", "tomas", "pia", "rico", "elena", "matteo", "bruni", "vargas"],
  ["anya", "pavel", "irina", "bogdan", "vera", "oleg", "katya", "stefan", "dusan", "yuri", "hraba", "sorokina"],
  ["sloane", "jules", "kai", "dex", "noor", "finn", "zara", "milo2", "reed", "tess", "vale", "thorne"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * The face for a regular: their own if they have one, otherwise one that fits how they're
 * written, never shared with a heavy, and as rarely as possible with anyone else.
 */
export function regularFace(key: string): Face | null {
  const look = REGULAR_LOOKS[key];
  if (!look) return null;
  if (look.face && FACES[look.face]) return FACES[look.face];
  const taken = new Set(Object.values(REGULAR_LOOKS).map((l) => l.face).filter(Boolean));
  const pool = Object.entries(FACES).filter(([id, f]) => !f.player && f.g === look.g && !!f.old === !!look.old && !taken.has(id) && !NPC_SRCS.has(f.src));
  const list = pool.length ? pool : Object.entries(FACES).filter(([, f]) => !f.player && f.g === look.g);
  // Same-gender regulars in alphabetical order take faces in turn, so they rarely repeat.
  // Within a city, same-looking regulars take faces in turn, so nobody there repeats; each city
  // starts further along the list, so the cities look different from each other too.
  const city = CITIES.findIndex((c) => c.includes(key));
  const peers = (CITIES[city] ?? [key]).filter((k) => !REGULAR_LOOKS[k].face && REGULAR_LOOKS[k].g === look.g && !!REGULAR_LOOKS[k].old === !!look.old);
  const start = (hash("faces") + Math.max(0, city) * 5) % list.length;
  return list[(start + peers.indexOf(key)) % list.length][1];
}

/** A face for a player who hasn't picked one: the same one every time for the same name. */
export const PLAYER_FACES = Object.values(FACES).filter((f) => f.player);

export function defaultFace(name: string): Face {
  const all = PLAYER_FACES.filter((f) => !f.old);
  return all[hash(name) % all.length];
}
