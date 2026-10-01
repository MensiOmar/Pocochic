export type SqlParams = readonly unknown[];

export type SqlStatement = {
  sql: string;
  params?: SqlParams;
};

export type SqlPort = {
  all<T extends Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T[]>;
  get<T extends Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T | undefined>;
  run(sql: string, params?: SqlParams): Promise<void>;
  batch(statements: SqlStatement[]): Promise<void>;
};

export type PreparedLike = {
  bind(...params: unknown[]): PreparedLike;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};

export type D1Like = {
  prepare(sql: string): PreparedLike;
  batch(statements: PreparedLike[]): Promise<unknown>;
};

export function d1Port(db: D1Like): SqlPort {
  return {
    async all(sql, params = []) {
      const res = await db.prepare(sql).bind(...params).all();
      return (res.results ?? []) as Record<string, unknown>[] as never;
    },
    async get(sql, params = []) {
      const row = await db.prepare(sql).bind(...params).first();
      return (row ?? undefined) as never;
    },
    async run(sql, params = []) {
      await db.prepare(sql).bind(...params).run();
    },
    async batch(statements) {
      const prepared = statements.map((s) => db.prepare(s.sql).bind(...(s.params ?? [])));
      await db.batch(prepared);
    },
  };
}
