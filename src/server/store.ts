import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { rankTitle } from "@/game/content/paths";
import type { CaseFile, City, Crew, Player, Report, Upload } from "@/game/types";
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
  recoveryHash?: string | null;
}

export interface ChatMessage {
  id: number;
  channel: string;
  authorId: string;
  authorName: string;
  body: string;
  at: number;
}

/** Exclusive access to several records at once; everything is saved together or not at all. */
export interface Tx {
  /** Locks and returns the players (in a fixed order, so concurrent pairs can't deadlock). */
  getPlayers(ids: string[]): Promise<(Player | null)[]>;
  putPlayer(p: Player): Promise<void>;
  getCrew(id: string): Promise<Crew | null>;
  putCrew(c: Crew): Promise<void>;
  deleteCrew(id: string): Promise<void>;
  /** Locks and returns a case file. */
  getCase(id: string): Promise<CaseFile | null>;
  putCase(c: CaseFile): Promise<void>;
  /** Locks and returns a city (null if it has never been saved). */
  getCity(country: string): Promise<City | null>;
  putCity(c: City): Promise<void>;
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
  setRecovery(accountId: string, recoveryHash: string): Promise<void>;
  setPassword(accountId: string, passwordHash: string): Promise<void>;
  /** Deletes a character for good: the player, their chat messages and uploads, and the login
   *  (with its sessions) if there is one. Moderation reports are kept. */
  eraseCharacter(playerId: string, accountId: string | null): Promise<void>;
  /** Crash reports (kept for 30 days). */
  logError(e: Omit<ErrorLog, "id" | "at">): Promise<void>;
  listErrors(limit: number): Promise<ErrorLog[]>;

  /** Runs `fn` inside one transaction with row locks. */
  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Most recently active players in a country. */
  listPlayers(country: string, limit: number): Promise<Player[]>;
  /** The street regulars living in a country (never included in listPlayers). */
  listRegulars(country: string): Promise<Player[]>;
  /** Players with a home or a parked car in this city, wherever they are now. */
  listPropertyOwners(country: string, limit: number): Promise<Player[]>;
  listCrews(limit: number): Promise<Crew[]>;
  getCrew(id: string): Promise<Crew | null>;
  postMessage(m: Omit<ChatMessage, "id" | "at">): Promise<void>;
  listMessages(channel: string, limit: number): Promise<ChatMessage[]>;
  getMessage(id: number): Promise<ChatMessage | null>;
  deleteMessage(id: number): Promise<void>;

  /** Moderation reports. */
  addReport(r: Omit<Report, "id" | "at" | "status">): Promise<void>;
  listReports(status: Report["status"], limit: number): Promise<Report[]>;
  updateReport(id: number, patch: Partial<Pick<Report, "status" | "resolvedBy" | "action">>): Promise<Report | null>;
  /** Uploaded frames and banners. */
  addUpload(u: Upload): Promise<void>;
  getUpload(id: string): Promise<Upload | null>;
  listUploads(status: Upload["status"], limit: number): Promise<Upload[]>;
  setUploadStatus(id: string, status: Upload["status"], reviewedBy: string, reason?: string): Promise<Upload | null>;
  /** Newest case files in a country. */
  listCases(country: string, limit: number): Promise<CaseFile[]>;
  getCity(country: string): Promise<City | null>;
  listCities(): Promise<City[]>;
}

export class StoreConfigError extends Error {}

export interface ErrorLog {
  id: number;
  at: number;
  source: "client" | "server";
  message: string;
  place: string;
  stack: string;
  version: string;
}



const titleOf = (p: Player) => rankTitle(p) ?? "Nobody";

// ─── Local JSON file (development) ──────────────────────────────────────────

interface FileAccount extends AccountRow {
  failedLogins: number;
}
interface FileData {
  players: Record<string, Player>;
  accounts: Record<string, FileAccount>;
  sessions: Record<string, { accountId: string; expiresAt: number }>;
  crews: Record<string, Crew>;
  messages: ChatMessage[];
  cases: Record<string, CaseFile>;
  cities: Record<string, City>;
  reports: Report[];
  uploads?: Upload[];
  errors?: ErrorLog[];
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
        ? {
            players: raw.players,
            accounts: raw.accounts ?? {},
            sessions: raw.sessions ?? {},
            crews: raw.crews ?? {},
            messages: raw.messages ?? [],
            cases: raw.cases ?? {},
            cities: raw.cities ?? {},
            reports: raw.reports ?? [],
          }
        : { players: raw, accounts: {}, sessions: {}, crews: {}, messages: [], cases: {}, cities: {}, reports: [] };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      this.data = { players: {}, accounts: {}, sessions: {}, crews: {}, messages: [], cases: {}, cities: {}, reports: [] };
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
      .filter((p) => !p.regular)
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
    return a
      ? { id: a.id, username: a.username, passwordHash: a.passwordHash, lockedUntil: a.lockedUntil, recoveryHash: a.recoveryHash ?? null }
      : null;
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

  setRecovery(accountId: string, recoveryHash: string) {
    return this.serial((d) => {
      if (d.accounts[accountId]) d.accounts[accountId].recoveryHash = recoveryHash;
    });
  }

  logError(e: Omit<ErrorLog, "id" | "at">) {
    return this.serial((d) => {
      const list = d.errors ?? [];
      d.errors = [...list, { ...e, id: (list[list.length - 1]?.id ?? 0) + 1, at: Date.now() }].slice(-500);
    });
  }

  async listErrors(limit: number) {
    return [...((await this.load()).errors ?? [])].reverse().slice(0, limit);
  }

  eraseCharacter(playerId: string, accountId: string | null) {
    return this.serial((d) => {
      delete d.players[playerId];
      d.messages = d.messages.filter((m) => m.authorId !== playerId);
      d.uploads = (d.uploads ?? []).filter((u) => u.playerId !== playerId);
      if (accountId) {
        delete d.accounts[accountId];
        for (const [k, s] of Object.entries(d.sessions)) if (s.accountId === accountId) delete d.sessions[k];
      }
    });
  }

  setPassword(accountId: string, passwordHash: string) {
    return this.serial((d) => {
      const a = d.accounts[accountId];
      if (a) {
        a.passwordHash = passwordHash;
        a.failedLogins = 0;
        a.lockedUntil = null;
      }
      for (const [k, s] of Object.entries(d.sessions)) if (s.accountId === accountId) delete d.sessions[k];
    });
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.serial(async (d) => {
      // Work on copies; only commit if fn succeeds.
      const players = new Map<string, Player>();
      const crews = new Map<string, Crew | null>();
      const cases = new Map<string, CaseFile>();
      const cities = new Map<string, City>();
      const tx: Tx = {
        getPlayers: async (ids) => ids.map((id) => (d.players[id] ? structuredClone(d.players[id]) : null)),
        putPlayer: async (p) => void players.set(p.id, structuredClone(p)),
        getCrew: async (id) => (d.crews[id] ? structuredClone(d.crews[id]) : null),
        putCrew: async (c) => void crews.set(c.id, structuredClone(c)),
        deleteCrew: async (id) => void crews.set(id, null),
        getCase: async (id) => (d.cases[id] ? structuredClone(d.cases[id]) : null),
        putCase: async (c) => void cases.set(c.id, structuredClone(c)),
        getCity: async (country) => (d.cities[country] ? structuredClone(d.cities[country]) : null),
        putCity: async (c) => void cities.set(c.country, structuredClone(c)),
      };
      const result = await fn(tx);
      for (const [id, p] of players) d.players[id] = p;
      for (const [id, c] of crews) {
        if (c) d.crews[id] = c;
        else delete d.crews[id];
      }
      for (const [id, c] of cases) d.cases[id] = c;
      for (const [id, c] of cities) d.cities[id] = c;
      // Keep the local file small: drop the oldest cases.
      const all = Object.values(d.cases).sort((a, b) => b.at - a.at);
      for (const c of all.slice(300)) delete d.cases[c.id];
      return result;
    });
  }

  async listPropertyOwners(country: string, limit: number) {
    return Object.values((await this.load()).players)
      .filter(
        (p) =>
          !p.regular &&
          !p.dead &&
          (((p.country ?? "varrow") === country ? p.housing : (p.homes?.[country as keyof typeof p.homes] ?? 0)) >= 1 ||
            (p.garage ?? []).some((c) => c.country === country)),
      )
      .sort((a, b) => b.tickAt - a.tickAt)
      .slice(0, limit)
      .map((p) => structuredClone(p));
  }

  async listRegulars(country: string) {
    return Object.values((await this.load()).players)
      .filter((p) => !!p.regular && (p.country ?? "varrow") === country)
      .map((p) => structuredClone(p));
  }

  async listPlayers(country: string, limit: number) {
    return Object.values((await this.load()).players)
      .filter((p) => !p.regular && (p.country ?? "varrow") === country)
      .sort((a, b) => b.tickAt - a.tickAt)
      .slice(0, limit)
      .map((p) => structuredClone(p));
  }

  async listCrews(limit: number) {
    return Object.values((await this.load()).crews)
      .sort((a, b) => b.members.length - a.members.length)
      .slice(0, limit)
      .map((c) => structuredClone(c));
  }

  async getCrew(id: string) {
    const c = (await this.load()).crews[id];
    return c ? structuredClone(c) : null;
  }

  postMessage(m: Omit<ChatMessage, "id" | "at">) {
    return this.serial((d) => {
      const id = (d.messages.at(-1)?.id ?? 0) + 1;
      d.messages.push({ ...m, id, at: Date.now() });
      d.messages = d.messages.slice(-500);
    });
  }

  async listMessages(channel: string, limit: number) {
    return (await this.load()).messages.filter((m) => m.channel === channel).slice(-limit);
  }

  async getMessage(id: number) {
    return (await this.load()).messages.find((m) => m.id === id) ?? null;
  }

  deleteMessage(id: number) {
    return this.serial((d) => {
      d.messages = d.messages.filter((m) => m.id !== id);
    });
  }

  addReport(r: Omit<Report, "id" | "at" | "status">) {
    return this.serial((d) => {
      const id = (d.reports.at(-1)?.id ?? 0) + 1;
      d.reports.push({ ...r, id, at: Date.now(), status: "open" });
      d.reports = d.reports.slice(-1000);
    });
  }

  async listReports(status: Report["status"], limit: number) {
    return (await this.load()).reports.filter((r) => r.status === status).slice(-limit).reverse().map((r) => structuredClone(r));
  }

  updateReport(id: number, patch: Partial<Pick<Report, "status" | "resolvedBy" | "action">>) {
    return this.serial((d) => {
      const r = d.reports.find((x) => x.id === id);
      if (!r) return null;
      Object.assign(r, patch);
      return structuredClone(r);
    });
  }

  addUpload(u: Upload) {
    return this.serial((d) => {
      d.uploads = [...(d.uploads ?? []), u].slice(-500);
    });
  }

  async getUpload(id: string) {
    const u = ((await this.load()).uploads ?? []).find((x) => x.id === id);
    return u ? structuredClone(u) : null;
  }

  async listUploads(status: Upload["status"], limit: number) {
    return ((await this.load()).uploads ?? []).filter((u) => u.status === status).slice(0, limit).map((u) => structuredClone(u));
  }

  setUploadStatus(id: string, status: Upload["status"], reviewedBy: string, reason?: string) {
    return this.serial((d) => {
      const u = (d.uploads ?? []).find((x) => x.id === id);
      if (!u) return null;
      Object.assign(u, { status, reviewedBy, ...(reason ? { reason } : {}) });
      return structuredClone(u);
    });
  }

  async getCity(country: string) {
    const c = (await this.load()).cities[country];
    return c ? structuredClone(c) : null;
  }

  async listCities() {
    return Object.values((await this.load()).cities).map((c) => structuredClone(c));
  }

  async listCases(country: string, limit: number) {
    return Object.values((await this.load()).cases)
      .filter((c) => c.country === country)
      .sort((a, b) => b.at - a.at)
      .slice(0, limit)
      .map((c) => structuredClone(c));
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
      where data->'regular' is null
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
    const rows = await this.sql<{ id: string; username: string; password_hash: string; locked_until: Date | null; recovery_hash: string | null }[]>`
      select id, username, password_hash, locked_until, recovery_hash from injustice.accounts
      where lower(username) = lower(${username})`;
    const r = rows[0];
    return r
      ? {
          id: r.id,
          username: r.username,
          passwordHash: r.password_hash,
          lockedUntil: r.locked_until?.getTime() ?? null,
          recoveryHash: r.recovery_hash,
        }
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

  async setRecovery(accountId: string, recoveryHash: string) {
    await this.sql`update injustice.accounts set recovery_hash = ${recoveryHash} where id = ${accountId}`;
  }

  async setPassword(accountId: string, passwordHash: string) {
    await this.sql.begin(async (tx) => {
      await tx`update injustice.accounts set password_hash = ${passwordHash}, failed_logins = 0, locked_until = null where id = ${accountId}`;
      // A password reset logs out every device.
      await tx`delete from injustice.sessions where account_id = ${accountId}`;
    });
  }

  async transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return (await this.sql.begin(async (q) => {
      const tx: Tx = {
        getPlayers: async (ids) => {
          const sorted = [...new Set(ids)].sort();
          const rows = await q<{ id: string; data: Player }[]>`
            select id, data from injustice.players where id = any(${sorted}) order by id for update`;
          const byId = new Map(rows.map((r) => [r.id, r.data]));
          return ids.map((id) => byId.get(id) ?? null);
        },
        putPlayer: async (p) => {
          await q`
            update injustice.players set
              name = ${p.name}, reputation = ${p.reputation}, title = ${titleOf(p)},
              data = ${q.json(p as unknown as postgres.JSONValue)}, updated_at = now()
            where id = ${p.id}`;
        },
        getCrew: async (id) => {
          const rows = await q<{ data: Crew }[]>`select data from injustice.crews where id = ${id} for update`;
          return rows[0]?.data ?? null;
        },
        putCrew: async (c) => {
          await q`
            insert into injustice.crews (id, tag, name, data) values (${c.id}, ${c.tag}, ${c.name}, ${q.json(c as unknown as postgres.JSONValue)})
            on conflict (id) do update set name = excluded.name, data = excluded.data`;
        },
        deleteCrew: async (id) => {
          await q`delete from injustice.crews where id = ${id}`;
        },
        getCase: async (id) => {
          const rows = await q<{ data: CaseFile }[]>`select data from injustice.cases where id = ${id} for update`;
          return rows[0]?.data ?? null;
        },
        putCase: async (c) => {
          await q`
            insert into injustice.cases (id, country, data) values (${c.id}, ${c.country}, ${q.json(c as unknown as postgres.JSONValue)})
            on conflict (id) do update set data = excluded.data`;
        },
        getCity: async (country) => {
          const rows = await q<{ data: City }[]>`select data from injustice.cities where country = ${country} for update`;
          return rows[0]?.data ?? null;
        },
        putCity: async (c) => {
          await q`
            insert into injustice.cities (country, data, updated_at) values (${c.country}, ${q.json(c as unknown as postgres.JSONValue)}, now())
            on conflict (country) do update set data = excluded.data, updated_at = now()`;
        },
      };
      return fn(tx);
    })) as T;
  }

  async listPlayers(country: string, limit: number) {
    const rows = await this.sql<{ data: Player }[]>`
      select data from injustice.players
      where coalesce(data->>'country', 'varrow') = ${country} and data->'regular' is null
      order by updated_at desc limit ${limit}`;
    return rows.map((r) => r.data);
  }

  async listPropertyOwners(country: string, limit: number) {
    const rows = await this.sql<{ data: Player }[]>`
      select data from injustice.players
      where data->'regular' is null and coalesce(data->'dead', 'null'::jsonb) = 'null'::jsonb
        and (
          coalesce((data->'homes'->>${country})::int, 0) >= 1
          or (coalesce(data->>'country', 'varrow') = ${country} and coalesce((data->>'housing')::int, 0) >= 1)
          or coalesce(data->'garage', '[]'::jsonb) @> ${this.sql.json([{ country }])}
        )
      order by updated_at desc limit ${limit}`;
    return rows.map((r) => r.data);
  }

  async listRegulars(country: string) {
    const rows = await this.sql<{ data: Player }[]>`
      select data from injustice.players
      where id like 'reg-%' and coalesce(data->>'country', 'varrow') = ${country}`;
    return rows.map((r) => r.data);
  }

  async listCrews(limit: number) {
    const rows = await this.sql<{ data: Crew }[]>`
      select data from injustice.crews order by jsonb_array_length(data->'members') desc, created_at asc limit ${limit}`;
    return rows.map((r) => r.data);
  }

  async getCrew(id: string) {
    const rows = await this.sql<{ data: Crew }[]>`select data from injustice.crews where id = ${id}`;
    return rows[0]?.data ?? null;
  }

  async postMessage(m: Omit<ChatMessage, "id" | "at">) {
    await this.sql`
      insert into injustice.messages (channel, author_id, author_name, body)
      values (${m.channel}, ${m.authorId}, ${m.authorName}, ${m.body})`;
  }

  async listMessages(channel: string, limit: number) {
    const rows = await this.sql<{ id: string; channel: string; author_id: string; author_name: string; body: string; created_at: Date }[]>`
      select id, channel, author_id, author_name, body, created_at from injustice.messages
      where channel = ${channel} order by id desc limit ${limit}`;
    return rows
      .reverse()
      .map((r) => ({ id: Number(r.id), channel: r.channel, authorId: r.author_id, authorName: r.author_name, body: r.body, at: r.created_at.getTime() }));
  }

  async getMessage(id: number) {
    const rows = await this.sql<{ id: string; channel: string; author_id: string; author_name: string; body: string; created_at: Date }[]>`
      select id, channel, author_id, author_name, body, created_at from injustice.messages where id = ${id}`;
    const r = rows[0];
    return r ? { id: Number(r.id), channel: r.channel, authorId: r.author_id, authorName: r.author_name, body: r.body, at: r.created_at.getTime() } : null;
  }

  async deleteMessage(id: number) {
    await this.sql`delete from injustice.messages where id = ${id}`;
  }

  async logError(e: Omit<ErrorLog, "id" | "at">) {
    await this.sql`insert into injustice.errors (source, message, place, stack, version)
      values (${e.source}, ${e.message}, ${e.place}, ${e.stack}, ${e.version})`;
    // Keep a month; trim now and then rather than on every write.
    if (Math.random() < 0.05) await this.sql`delete from injustice.errors where created_at < now() - interval '30 days'`;
  }

  async listErrors(limit: number) {
    const rows = await this.sql<{ id: string; source: ErrorLog["source"]; message: string; place: string; stack: string; version: string; created_at: Date }[]>`
      select id, source, message, place, stack, version, created_at from injustice.errors order by id desc limit ${limit}`;
    return rows.map((r) => ({ id: Number(r.id), at: new Date(r.created_at).getTime(), source: r.source, message: r.message, place: r.place, stack: r.stack, version: r.version }));
  }

  async eraseCharacter(playerId: string, accountId: string | null) {
    await this.sql.begin(async (tx) => {
      await tx`delete from injustice.messages where author_id = ${playerId}`;
      await tx`delete from injustice.uploads where player_id = ${playerId}`;
      await tx`delete from injustice.players where id = ${playerId}`;
      if (accountId) await tx`delete from injustice.accounts where id = ${accountId}`;
    });
  }

  async addReport(r: Omit<Report, "id" | "at" | "status">) {
    await this.sql`insert into injustice.reports (data) values (${this.sql.json(r as unknown as postgres.JSONValue)})`;
  }

  async listReports(status: Report["status"], limit: number) {
    const rows = await this.sql<{ id: string; status: Report["status"]; data: Omit<Report, "id" | "at" | "status">; created_at: Date }[]>`
      select id, status, data, created_at from injustice.reports where status = ${status} order by id desc limit ${limit}`;
    return rows.map((r) => ({ ...r.data, id: Number(r.id), status: r.status, at: r.created_at.getTime() }) as Report);
  }

  async updateReport(id: number, patch: Partial<Pick<Report, "status" | "resolvedBy" | "action">>) {
    const rows = await this.sql<{ id: string; status: Report["status"]; data: Omit<Report, "id" | "at" | "status">; created_at: Date }[]>`
      update injustice.reports
      set status = coalesce(${patch.status ?? null}, status),
          data = data || ${this.sql.json({ ...(patch.resolvedBy ? { resolvedBy: patch.resolvedBy } : {}), ...(patch.action ? { action: patch.action } : {}) } as unknown as postgres.JSONValue)}
      where id = ${id}
      returning id, status, data, created_at`;
    const r = rows[0];
    return r ? ({ ...r.data, id: Number(r.id), status: r.status, at: r.created_at.getTime() } as Report) : null;
  }

  async addUpload(u: Upload) {
    const { id, playerId, kind, status, data, ...meta } = u;
    await this.sql`insert into injustice.uploads (id, player_id, kind, status, data, meta)
      values (${id}, ${playerId}, ${kind}, ${status}, ${data}, ${this.sql.json(meta as unknown as postgres.JSONValue)})`;
  }

  private uploadRow(r: { id: string; player_id: string; kind: Upload["kind"]; status: Upload["status"]; data: string; meta: Omit<Upload, "id" | "playerId" | "kind" | "status" | "data"> }): Upload {
    return { ...r.meta, id: r.id, playerId: r.player_id, kind: r.kind, status: r.status, data: r.data };
  }

  async getUpload(id: string) {
    const rows = await this.sql<Parameters<PostgresStore["uploadRow"]>[0][]>`select id, player_id, kind, status, data, meta from injustice.uploads where id = ${id}`;
    return rows[0] ? this.uploadRow(rows[0]) : null;
  }

  async listUploads(status: Upload["status"], limit: number) {
    const rows = await this.sql<Parameters<PostgresStore["uploadRow"]>[0][]>`
      select id, player_id, kind, status, data, meta from injustice.uploads where status = ${status} order by created_at limit ${limit}`;
    return rows.map((r) => this.uploadRow(r));
  }

  async setUploadStatus(id: string, status: Upload["status"], reviewedBy: string, reason?: string) {
    const rows = await this.sql<Parameters<PostgresStore["uploadRow"]>[0][]>`
      update injustice.uploads
      set status = ${status}, meta = meta || ${this.sql.json({ reviewedBy, ...(reason ? { reason } : {}) } as unknown as postgres.JSONValue)}
      where id = ${id}
      returning id, player_id, kind, status, data, meta`;
    return rows[0] ? this.uploadRow(rows[0]) : null;
  }

  async getCity(country: string) {
    const rows = await this.sql<{ data: City }[]>`select data from injustice.cities where country = ${country}`;
    return rows[0]?.data ?? null;
  }

  async listCities() {
    const rows = await this.sql<{ data: City }[]>`select data from injustice.cities`;
    return rows.map((r) => r.data);
  }

  async listCases(country: string, limit: number) {
    const rows = await this.sql<{ data: CaseFile }[]>`
      select data from injustice.cases where country = ${country} order by created_at desc limit ${limit}`;
    return rows.map((r) => r.data);
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
