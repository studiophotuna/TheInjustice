import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { rankTitle } from "@/game/content/paths";
import type { Player } from "@/game/types";

export interface LeaderRow {
  name: string;
  reputation: number;
  title: string;
}

/**
 * Storage boundary. The game engine never touches storage directly.
 * Postgres (Supabase) is used when a connection string is configured; otherwise a local
 * JSON file is used for development.
 */
export interface PlayerStore {
  get(id: string): Promise<Player | null>;
  /** Runs `fn` with exclusive access to the player and saves the result. */
  update<T>(id: string, fn: (p: Player | null) => { player: Player | null; result: T }): Promise<T>;
  leaderboard(limit: number): Promise<LeaderRow[]>;
}

export class StoreConfigError extends Error {}

const titleOf = (p: Player) => rankTitle(p) ?? "Nobody";

/** Single-file JSON store for local development. */
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
    const p = (await this.load()).get(id);
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

  async leaderboard(limit: number) {
    return [...(await this.load()).values()]
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, limit)
      .map((p) => ({ name: p.name, reputation: p.reputation, title: titleOf(p) }));
  }
}

/**
 * Postgres store for Supabase. Each update runs in a transaction with a row lock, so two
 * requests from the same player can't overwrite each other.
 * Table: injustice.players (private schema, not exposed through the Data API).
 */
class PostgresStore implements PlayerStore {
  constructor(private sql: postgres.Sql) {}

  async get(id: string) {
    const rows = await this.sql<{ data: Player }[]>`select data from injustice.players where id = ${id}`;
    return rows[0]?.data ?? null;
  }

  async update<T>(id: string, fn: (p: Player | null) => { player: Player | null; result: T }) {
    return (await this.sql.begin(async (tx) => {
      const rows = await tx<{ data: Player }[]>`
        select data from injustice.players where id = ${id} for update`;
      const { player, result } = fn(rows[0]?.data ?? null);
      if (player) {
        await tx`
          insert into injustice.players (id, name, reputation, title, data, updated_at)
          values (${id}, ${player.name}, ${player.reputation}, ${titleOf(player)},
                  ${tx.json(player as unknown as postgres.JSONValue)}, now())
          on conflict (id) do update set
            name = excluded.name,
            reputation = excluded.reputation,
            title = excluded.title,
            data = excluded.data,
            updated_at = now()`;
      }
      return result;
    })) as T;
  }

  async leaderboard(limit: number) {
    return this.sql<LeaderRow[]>`
      select name, reputation, title from injustice.players
      order by reputation desc, created_at asc limit ${limit}`;
  }
}

function connectionString(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

function createPostgres(url: string): postgres.Sql {
  // Drop query params (e.g. sslmode, provider hints) that postgres.js would forward to the
  // server as settings; TLS is required explicitly instead.
  const clean = url.split("?")[0];
  return postgres(clean, {
    ssl: "require",
    prepare: false, // required by Supabase's transaction-mode pooler
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

const globalForStore = globalThis as unknown as { __injusticeStore?: PlayerStore };

export function getStore(): PlayerStore {
  if (globalForStore.__injusticeStore) return globalForStore.__injusticeStore;
  const url = connectionString();
  if (url) {
    globalForStore.__injusticeStore = new PostgresStore(createPostgres(url));
  } else if (process.env.VERCEL) {
    // The filesystem is read-only on Vercel; refuse instead of losing saves.
    throw new StoreConfigError("The game database isn't connected yet.");
  } else {
    globalForStore.__injusticeStore = new FileStore(
      process.env.INJUSTICE_DATA_FILE ?? path.join(process.cwd(), ".data", "players.json"),
    );
  }
  return globalForStore.__injusticeStore;
}
