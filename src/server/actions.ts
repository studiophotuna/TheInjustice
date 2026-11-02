import type { Action, PathId } from "@/game/types";
import { GameError } from "@/game/types";

const PATH_IDS: PathId[] = ["police", "enforcer"];
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
      return { type: "create", name: str(b.name, 60) };
    case "job":
      return { type: "job", jobId: str(b.jobId) };
    case "buy":
      return { type: "buy", itemId: str(b.itemId) };
    case "use":
      return { type: "use", itemId: str(b.itemId) };
    case "fight":
      return { type: "fight", npcId: str(b.npcId) };
    case "assess":
      return { type: "assess" };
    case "flag":
      return { type: "flag", flag: str(b.flag) };
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
