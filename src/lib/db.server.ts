import { neon } from "@neondatabase/serverless";

type LooseQuery = (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

let queryFn: LooseQuery | null = null;

function getQuery(): LooseQuery {
  if (!queryFn) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    queryFn = neon(url).query as unknown as LooseQuery;
  }
  return queryFn;
}

function toPg(sqlText: string): string {
  let i = 0;
  return sqlText.replace(/\?/g, () => `$${++i}`);
}

export type MiniDb = {
  prepare: (sqlText: string) => {
    bind: (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      first: <T = any>() => Promise<T | null>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      all: <T = any>() => Promise<{ results: T[] }>;
      run: () => Promise<unknown>;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    first: <T = any>() => Promise<T | null>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all: <T = any>() => Promise<{ results: T[] }>;
  };
};

export function getDb(): MiniDb {
  const q = getQuery();
  return {
    prepare: (sqlText: string) => {
      const query = toPg(sqlText);
      const bound = (...args: unknown[]) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        first: async <T = any>(): Promise<T | null> => {
          const rows = (await q(query, args)) as T[];
          return rows[0] ?? null;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all: async <T = any>(): Promise<{ results: T[] }> => {
          const rows = (await q(query, args)) as T[];
          return { results: rows };
        },
        run: async () => {
          await q(query, args);
          return {};
        },
      });
      return {
        bind: bound,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        first: <T = any>() => bound().first<T>(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all: <T = any>() => bound().all<T>(),
      };
    },
  };
}
