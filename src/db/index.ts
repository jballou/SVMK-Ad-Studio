import "server-only";
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as unknown as { __adStudioDb?: Promise<Db> };

async function init(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Hosted Postgres: migrations are applied deliberately with `npm run db:migrate`.
    return drizzlePg(postgres(url, { max: 5 }), { schema }) as unknown as Db;
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL is required on Vercel (the embedded dev database is local-only)");
  // Local dev: embedded Postgres (PGlite) persisted under .data/, migrated and seeded on first use.
  mkdirSync(".data", { recursive: true });
  const db = drizzlePglite(new PGlite(".data/pglite"), { schema });
  await migratePglite(db, { migrationsFolder: "./drizzle" });
  await seedIfEmpty(db as unknown as Db);
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  g.__adStudioDb ??= init().catch((e) => {
    g.__adStudioDb = undefined; // don't cache a failed startup
    throw e;
  });
  return g.__adStudioDb;
}
