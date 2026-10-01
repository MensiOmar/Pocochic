import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { D1Like, PreparedLike, SqlPort } from "./sql-port.js";

export function pocochicRoot(): string {
  return path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
}

export function openSqlite(filename: string): Database.Database {
  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  if (filename !== ":memory:") {
    db.pragma("journal_mode = WAL");
  }
  db.pragma("busy_timeout = 5000");
  return db;
}

export function applyMigrations(db: Database.Database): void {
  const dir = path.resolve(fileURLToPath(new URL("../drizzle", import.meta.url)));
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const raw = readFileSync(path.join(dir, file), "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const statement of statements) {
      db.exec(statement);
    }
  }
}

type Bound = PreparedLike & { _sql: string; _params: () => unknown[] };

export function asD1(db: Database.Database): D1Like {
  return {
    prepare(sql: string): Bound {
      let params: unknown[] = [];
      const bound: Bound = {
        _sql: sql,
        _params: () => params,
        bind(...next: unknown[]) {
          params = next;
          return bound;
        },
        async all() {
          return { results: db.prepare(sql).all(...params) as never[] };
        },
        async first() {
          return (db.prepare(sql).get(...params) as never) ?? null;
        },
        async run() {
          db.prepare(sql).run(...params);
          return { success: true };
        },
      };
      return bound;
    },
    async batch(statements) {
      const run = db.transaction(() => {
        for (const statement of statements) {
          const bound = statement as Bound;
          db.prepare(bound._sql).run(...bound._params());
        }
      });
      run.immediate();
    },
  };
}

export function sqlitePort(db: Database.Database): SqlPort {
  return {
    async all(sql, params = []) {
      return db.prepare(sql).all(...params) as never;
    },
    async get(sql, params = []) {
      return db.prepare(sql).get(...params) as never;
    },
    async run(sql, params = []) {
      db.prepare(sql).run(...params);
    },
    async batch(statements) {
      const run = db.transaction(() => {
        for (const statement of statements) {
          db.prepare(statement.sql).run(...(statement.params ?? []));
        }
      });
      run.immediate();
    },
  };
}
