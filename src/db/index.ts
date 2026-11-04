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
  // Local dev persists to .data/. On Vercel the filesystem is read-only, so without DATABASE_URL we fall back to an
  // in-memory database seeded with the dummy data: fine for demos, but changes reset on every cold start and are
  // not shared between serverless instances. Set DATABASE_URL for anything real.
  const ephemeral = !!process.env.VERCEL;
  if (ephemeral) console.warn("DATABASE_URL is not set: using an in-memory demo database. Changes will not persist.");
  if (!ephemeral) mkdirSync(".data", { recursive: true });
  const db = drizzlePglite(ephemeral ? new PGlite() : new PGlite(".data/pglite"), { schema });
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
