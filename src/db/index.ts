import "server-only";
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { cleanStored } from "@/lib/specs/custom";
import { setCustomPlatforms } from "@/lib/specs/platforms";
import { SETTING_KEYS } from "@/lib/settings";
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

// Platforms added in Settings are global, so every request refreshes the in-memory registry from the database here
// (at most every few seconds). That way pages, actions and exports all see the same list without each loading it.
const PLATFORM_REFRESH_MS = 3000;
let platformsAt = 0;
async function refreshPlatforms(db: Db) {
  if (Date.now() - platformsAt < PLATFORM_REFRESH_MS) return;
  platformsAt = Date.now();
  const [row] = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, SETTING_KEYS.platforms));
  setCustomPlatforms(cleanStored((row?.value as { platforms?: unknown } | undefined)?.platforms));
}
/** Call after saving platforms so the next getDb() reloads them immediately. */
export const invalidatePlatforms = () => { platformsAt = 0; };

export async function getDb(): Promise<Db> {
  g.__adStudioDb ??= init().catch((e) => {
    g.__adStudioDb = undefined; // don't cache a failed startup
    throw e;
  });
  const db = await g.__adStudioDb;
  await refreshPlatforms(db);
  return db;
}
