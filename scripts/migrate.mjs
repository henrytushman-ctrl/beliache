// Custom migration runner for Turso/libSQL
// Replaces `prisma migrate deploy` which doesn't support the driver-adapter setup.
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../prisma/migrations");

const url = (process.env.DATABASE_URL ?? "").trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

// Skip for local dev (file-based SQLite — Prisma handles it natively)
if (!url || url.startsWith("file:")) {
  console.log("Local SQLite database — skipping remote migrations.");
  process.exit(0);
}

const client = createClient({ url, authToken });

// Track which migrations have been applied
await client.execute(`
  CREATE TABLE IF NOT EXISTS "_migrations" (
    "name" TEXT PRIMARY KEY,
    "appliedAt" TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const { rows } = await client.execute(`SELECT name FROM "_migrations"`);
const applied = new Set(rows.map((r) => String(r.name)));

// Read migration folders in chronological order (sorted by timestamp prefix)
const folders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let newCount = 0;

for (const name of folders) {
  if (applied.has(name)) {
    console.log(`  ✓ ${name} (already applied)`);
    continue;
  }

  const sqlPath = join(migrationsDir, name, "migration.sql");
  if (!existsSync(sqlPath)) {
    console.log(`  ~ ${name} (no migration.sql)`);
    continue;
  }

  const sql = readFileSync(sqlPath, "utf8");

  // Split into individual statements.
  // Filter comment lines and PRAGMA lines (PRAGMA defer_foreign_keys is a
  // no-op in Turso's remote protocol; PRAGMA foreign_keys is session-only).
  const stmts = sql
    .split(";")
    .map((block) =>
      block
        .split("\n")
        .filter((line) => {
          const t = line.trim();
          return t.length > 0 && !t.startsWith("--") && !/^PRAGMA\s/i.test(t);
        })
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0)
    .map((s) => ({ sql: s }));

  console.log(`  → applying ${name} (${stmts.length} statements)...`);

  try {
    await client.batch(stmts, "write");
    await client.execute({
      sql: `INSERT INTO "_migrations" (name) VALUES (?)`,
      args: [name],
    });
    newCount++;
    console.log(`    ✓ done`);
  } catch (err) {
    console.error(`    ✗ FAILED: ${err.message}`);
    process.exit(1);
  }
}

console.log(`\nMigrations complete — ${newCount} new, ${applied.size} already applied.`);
client.close();
