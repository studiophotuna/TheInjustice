import type { Action, CountryId, PathId, TravelMode } from "@/game/types";
import { GameError } from "@/game/types";

const PATH_IDS: PathId[] = ["police", "enforcer", "courts", "vigilante", "medicine", "banking"];
const COUNTRY_IDS: CountryId[] = ["varrow", "solmarra", "kestrova", "meridian"];
const MODES: TravelMode[] = ["bus", "train", "plane"];
const str = (v: unknown, max = 40): string => {
  if (typeof v !== "string" || v.length === 0 || v.length > max) throw new GameError("Bad request.");
  return v;
};

/** Validates untrusted request bodies into a typed Action. */
export function parseAction(body: unknown): Action {
  if (!body || typeof body !== "object") throw new GameError("Bad request.");
  const b = body as Record<string, unknown>;
  switch (b.type) {
    case "create":
      if (b.country !== undefined && !COUNTRY_IDS.includes(b.country as CountryId)) throw new GameError("Bad request.");
      return { type: "create", name: str(b.name, 60), country: b.country as CountryId | undefined };
    case "travel":
      if (!COUNTRY_IDS.includes(b.to as CountryId) || !MODES.includes(b.mode as TravelMode)) throw new GameError("Bad request.");
      return { type: "travel", to: b.to as CountryId, mode: b.mode as TravelMode };
    case "ack_arrival":
      return { type: "ack_arrival" };
    case "claim_daily":
      return { type: "claim_daily" };
    case "buy_property":
      return { type: "buy_property", id: str(b.id) };
    case "collect_property":
      return { type: "collect_property", id: str(b.id) };
    case "read_inbox":
      return { type: "read_inbox" };
    case "claim_contract":
      return { type: "claim_contract", id: str(b.id) };
    case "train":
      if (b.stat !== "strength" && b.stat !== "toughness" && b.stat !== "agility") throw new GameError("Bad request.");
      return { type: "train", stat: b.stat };
    case "job":
      return { type: "job", jobId: str(b.jobId) };
    case "buy":
      return { type: "buy", itemId: str(b.itemId) };
    case "use":
      return { type: "use", itemId: str(b.itemId) };
    case "equip":
      return { type: "equip", itemId: str(b.itemId) };
    case "repair":
      return { type: "repair", itemId: str(b.itemId) };
    case "leave_career":
      return { type: "leave_career" };
    case "start_exit":
      return { type: "start_exit" };
    case "abandon_exit":
      return { type: "abandon_exit" };
    case "profile":
      return {
        type: "profile",
        ...(typeof b.bio === "string" ? { bio: b.bio } : {}),
        ...(b.photo === null || typeof b.photo === "string" ? { photo: b.photo as string | null } : {}),
      };
    case "hire_bodyguards":
      return { type: "hire_bodyguards" };
    case "lie_low":
      return { type: "lie_low" };
    case "unequip":
      if (b.slot !== "weapon" && b.slot !== "armor") throw new GameError("Bad request.");
      return { type: "unequip", slot: b.slot };
    case "fight":
      return { type: "fight", npcId: str(b.npcId) };
    case "rebirth":
      return { type: "rebirth", name: b.name === undefined ? undefined : str(b.name, 60) };
    case "apply":
      return { type: "apply", school: str(b.school) };
    case "enroll":
      return { type: "enroll" };
    case "dismiss_application":
      return { type: "dismiss_application" };
    case "assess":
      return { type: "assess" };
    case "flag":
      return { type: "flag", flag: str(b.flag) };
    case "launder":
      if (b.method !== "laundromat" && b.method !== "business" && b.method !== "bank") throw new GameError("Bad request.");
      return { type: "launder", method: b.method, amount: Number(b.amount) };
    case "drug_buy":
    case "drug_sell":
      if (!["herb", "pills", "powder"].includes(b.drug as string)) throw new GameError("Bad request.");
      return { type: b.type, drug: b.drug as "herb", qty: Number(b.qty) };
    case "buy_supplies":
      return { type: "buy_supplies", qty: Number(b.qty) };
    case "cook":
      if (!["herb", "pills", "powder"].includes(b.drug as string)) throw new GameError("Bad request.");
      return { type: "cook", drug: b.drug as "herb" };
    case "tutorial":
      return { type: "tutorial", step: str(b.step) };
    case "encounter": {
      const choice = Number(b.choice);
      if (!Number.isInteger(choice) || choice < 0 || choice > 5) throw new GameError("Bad request.");
      return { type: "encounter", choice };
    }
    case "bank": {
      const op = b.op;
      if (op !== "open" && op !== "deposit" && op !== "withdraw") throw new GameError("Bad request.");
      const amount = b.amount === undefined ? undefined : Number(b.amount);
      return { type: "bank", op, amount };
    }
    case "offer": {
      if (!PATH_IDS.includes(b.path as PathId) || typeof b.accept !== "boolean") {
        throw new GameError("Bad request.");
      }
      return { type: "offer", path: b.path as PathId, accept: b.accept };
    }
    default:
      throw new GameError("Unknown action.");
  }
}
