// Apply migrations to hosted Postgres, and optionally load the sample data:
//   DATABASE_URL=... npm run db:migrate            (migrations only)
//   DATABASE_URL=... npm run db:migrate -- --seed  (also seeds when the database has no ads)
// Use the unpooled connection string for migrations.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { seedIfEmpty } from "../src/db/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied");
  if (process.argv.includes("--seed")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedIfEmpty(db as any);
    console.log("Seed step done (skipped automatically if ads already exist)");
  }
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
