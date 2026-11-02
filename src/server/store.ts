import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Player } from "@/game/types";

/**
 * Storage boundary. The game engine never touches storage directly, so this can be
 * swapped for a Postgres/Supabase implementation without changing game rules.
 */
export interface PlayerStore {
  get(id: string): Promise<Player | null>;
  /** Runs `fn` with exclusive access to the player and saves the result. */
  update<T>(id: string, fn: (p: Player | null) => { player: Player | null; result: T }): Promise<T>;
  list(): Promise<Player[]>;
}

/** Single-file JSON store for local development and the first playable build. */
class FileStore implements PlayerStore {
  private cache: Map<string, Player> | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private file: string) {}

  private async load(): Promise<Map<string, Player>> {
    if (this.cache) return this.cache;
    try {
      const raw = JSON.parse(await fs.readFile(this.file, "utf8")) as Record<string, Player>;
      this.cache = new Map(Object.entries(raw));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      this.cache = new Map();
    }
    return this.cache;
  }

  private async flush(): Promise<void> {
    const data = Object.fromEntries(this.cache ?? []);
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data));
    await fs.rename(tmp, this.file);
  }

  private serial<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async get(id: string) {
    const map = await this.load();
    const p = map.get(id);
    return p ? structuredClone(p) : null;
  }

  update<T>(id: string, fn: (p: Player | null) => { player: Player | null; result: T }) {
    return this.serial(async () => {
      const map = await this.load();
      const current = map.get(id);
      const { player, result } = fn(current ? structuredClone(current) : null);
      if (player) {
        map.set(id, player);
        await this.flush();
      }
      return result;
    });
  }

  async list() {
    return [...(await this.load()).values()].map((p) => structuredClone(p));
  }
}

const globalForStore = globalThis as unknown as { __injusticeStore?: PlayerStore };

export function getStore(): PlayerStore {
  globalForStore.__injusticeStore ??= new FileStore(
    process.env.INJUSTICE_DATA_FILE ?? path.join(process.cwd(), ".data", "players.json"),
  );
  return globalForStore.__injusticeStore;
}
