import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { rankTitle } from "@/game/content/paths";
import type { Player } from "@/game/types";
import { LOCKOUT_MS, MAX_FAILED_LOGINS } from "./auth";

export interface LeaderRow {
  name: string;
  reputation: number;
  title: string;
}

export interface AccountRow {
  id: string;
  username: string;
  passwordHash: string;
  lockedUntil: number | null;
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
  /** Moves a character to a new id (guest → account). False if the target already has one. */
  claimPlayer(fromId: string, toId: string): Promise<boolean>;

  /** Returns null when the username is taken (case-insensitive). */
  createAccount(username: string, passwordHash: string): Promise<AccountRow | null>;
  findAccount(username: string): Promise<AccountRow | null>;
  /** Resets the failure count on success; locks the account after too many failures. */
  recordLogin(accountId: string, success: boolean): Promise<void>;
  createSession(tokenHash: string, accountId: string, expiresAt: number): Promise<void>;
  getSession(tokenHash: string): Promise<{ accountId: string; username: string } | null>;
  deleteSession(tokenHash: string): Promise<void>;
}

export class StoreConfigError extends Error {}

const titleOf = (p: Player) => rankTitle(p) ?? "Nobody";

// ─── Local JSON file (development) ──────────────────────────────────────────

interface FileAccount extends AccountRow {
  failedLogins: number;
}
interface FileData {
  players: Record<string, Player>;
  accounts: Record<string, FileAccount>;
  sessions: Record<string, { accountId: string; expiresAt: number }>;
}

export class FileStore implements PlayerStore {
  private data: FileData | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private file: string) {}

  private async load(): Promise<FileData> {
    if (this.data) return this.data;
    try {
      const raw = JSON.parse(await fs.readFile(this.file, "utf8"));
      // Older saves were a bare map of players.
      this.data = raw.players
        ? { players: raw.players, accounts: raw.accounts ?? {}, sessions: raw.sessions ?? {} }
        : { players: raw, accounts: {}, sessions: {} };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      this.data = { players: {}, accounts: {}, sessions: {} };
    }
    return this.data!;
  }

  private async flush(): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data));
    await fs.rename(tmp, this.file);
  }

  /** Serializes every read-modify-write so concurrent requests can't interleave. */
  private serial<T>(job: (d: FileData) => Promise<T> | T, write = true): Promise<T> {
    const next = this.queue.then(async () => {
      const d = await this.load();
      const out = await job(d);
      if (write) await this.flush();
      return out;
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  async get(id: string) {
    const p = (await this.load()).players[id];
    return p ? structuredClone(p) : null;
  }

  update<T>(id: string, fn: (p: Player | null) => { player: Player | null; result: T }) {
    return this.serial((d) => {
      const current = d.players[id];
      const { player, result } = fn(current ? structuredClone(current) : null);
      if (player) d.players[id] = player;
      return result;
    });
  }

  async leaderboard(limit: number) {
    return Object.values((await this.load()).players)
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, limit)
      .map((p) => ({ name: p.name, reputation: p.reputation, title: titleOf(p) }));
  }

  claimPlayer(fromId: string, toId: string) {
    return this.serial((d) => {
      if (!d.players[fromId] || d.players[toId]) return false;
      d.players[toId] = { ...d.players[fromId], id: toId };
      delete d.players[fromId];
      return true;
    });
  }

  createAccount(username: string, passwordHash: string) {
    return this.serial((d) => {
      const taken = Object.values(d.accounts).some((a) => a.username.toLowerCase() === username.toLowerCase());
      if (taken) return null;
      const acct: FileAccount = { id: randomUUID(), username, passwordHash, lockedUntil: null, failedLogins: 0 };
      d.accounts[acct.id] = acct;
      return { ...acct };
    });
  }

  async findAccount(username: string) {
    const a = Object.values((await this.load()).accounts).find(
      (x) => x.username.toLowerCase() === username.toLowerCase(),
    );
    return a ? { id: a.id, username: a.username, passwordHash: a.passwordHash, lockedUntil: a.lockedUntil } : null;
  }

  recordLogin(accountId: string, success: boolean) {
    return this.serial((d) => {
      const a = d.accounts[accountId];
      if (!a) return;
      if (success) {
        a.failedLogins = 0;
        a.lockedUntil = null;
      } else if (++a.failedLogins >= MAX_FAILED_LOGINS) {
        a.failedLogins = 0;
        a.lockedUntil = Date.now() + LOCKOUT_MS;
      }
    });
  }

  createSession(tokenHash: string, accountId: string, expiresAt: number) {
    return this.serial((d) => {
      d.sessions[tokenHash] = { accountId, expiresAt };
    });
  }

  async getSession(tokenHash: string) {
    const d = await this.load();
    const s = d.sessions[tokenHash];
    if (!s || s.expiresAt <= Date.now()) return null;
    const a = d.accounts[s.accountId];
    return a ? { accountId: a.id, username: a.username } : null;
  }

  deleteSession(tokenHash: string) {
    return this.serial((d) => {
      delete d.sessions[tokenHash];
    });
  }
}

// ─── Postgres / Supabase ────────────────────────────────────────────────────

/**
 * Tables live in the private `injustice` schema (not exposed through the Supabase Data API).
 * Player updates run in a transaction with a row lock, so two requests from the same
 * player can't overwrite each other.
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

  async claimPlayer(fromId: string, toId: string) {
    const rows = await this.sql`
      update injustice.players
      set id = ${toId}, data = jsonb_set(data, '{id}', to_jsonb(${toId}::text)), updated_at = now()
      where id = ${fromId}
        and not exists (select 1 from injustice.players where id = ${toId})
      returning id`;
    return rows.length > 0;
  }

  async createAccount(username: string, passwordHash: string) {
    const rows = await this.sql<{ id: string; username: string }[]>`
      insert into injustice.accounts (username, password_hash)
      values (${username}, ${passwordHash})
      on conflict ((lower(username))) do nothing
      returning id, username`;
    return rows[0] ? { id: rows[0].id, username: rows[0].username, passwordHash, lockedUntil: null } : null;
  }

  async findAccount(username: string) {
    const rows = await this.sql<{ id: string; username: string; password_hash: string; locked_until: Date | null }[]>`
      select id, username, password_hash, locked_until from injustice.accounts
      where lower(username) = lower(${username})`;
    const r = rows[0];
    return r
      ? { id: r.id, username: r.username, passwordHash: r.password_hash, lockedUntil: r.locked_until?.getTime() ?? null }
      : null;
  }

  async recordLogin(accountId: string, success: boolean) {
    if (success) {
      await this.sql`
        update injustice.accounts set failed_logins = 0, locked_until = null where id = ${accountId}`;
      return;
    }
    await this.sql`
      update injustice.accounts set
        failed_logins = case when failed_logins + 1 >= ${MAX_FAILED_LOGINS} then 0 else failed_logins + 1 end,
        locked_until = case when failed_logins + 1 >= ${MAX_FAILED_LOGINS}
                            then now() + make_interval(secs => ${LOCKOUT_MS / 1000}) else locked_until end
      where id = ${accountId}`;
  }

  async createSession(tokenHash: string, accountId: string, expiresAt: number) {
    await this.sql`
      insert into injustice.sessions (token_hash, account_id, expires_at)
      values (${tokenHash}, ${accountId}, ${new Date(expiresAt)})`;
  }

  async getSession(tokenHash: string) {
    const rows = await this.sql<{ account_id: string; username: string }[]>`
      select s.account_id, a.username from injustice.sessions s
      join injustice.accounts a on a.id = s.account_id
      where s.token_hash = ${tokenHash} and s.expires_at > now()`;
    return rows[0] ? { accountId: rows[0].account_id, username: rows[0].username } : null;
  }

  async deleteSession(tokenHash: string) {
    await this.sql`delete from injustice.sessions where token_hash = ${tokenHash}`;
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
