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

  // Make DDL idempotent so re-runs on a partially-migrated DB don't fail.
  // The production DB may already have some tables/columns from before this
  // script existed, so "already exists" is expected and safe to skip.
  const idempotentSql = sql
    .replace(/CREATE TABLE "([^"]+)"/g, 'CREATE TABLE IF NOT EXISTS "$1"')
    .replace(/CREATE UNIQUE INDEX "([^"]+)"/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "$1"')
    .replace(/CREATE INDEX "([^"]+)"/g, 'CREATE INDEX IF NOT EXISTS "$1"')
    .replace(/DROP TABLE "([^"]+)"/g, 'DROP TABLE IF EXISTS "$1"');

  // Parse into individual statements, skipping comment and PRAGMA lines.
  const stmts = idempotentSql
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
    .filter((s) => s.length > 0);

  console.log(`  → applying ${name} (${stmts.length} statements)...`);

  let skipped = 0;
  try {
    for (const stmt of stmts) {
      try {
        await client.execute(stmt);
      } catch (err) {
        const msg = err.message ?? "";
        // "already exists" = table/index/column was created by a prior run — safe to skip
        // "duplicate column" = ADD COLUMN on a column that already exists — safe to skip
        if (
          msg.includes("already exists") ||
          msg.includes("duplicate column") ||
          msg.includes("SQLITE_ERROR: duplicate column")
        ) {
          skipped++;
        } else {
          throw err;
        }
      }
    }

    await client.execute({
      sql: `INSERT OR IGNORE INTO "_migrations" (name) VALUES (?)`,
      args: [name],
    });
    newCount++;
    console.log(`    ✓ done${skipped ? ` (${skipped} already-existed, skipped)` : ""}`);
  } catch (err) {
    console.error(`    ✗ FAILED: ${err.message}`);
    process.exit(1);
  }
}

console.log(`\nMigrations complete — ${newCount} new, ${applied.size} already applied.`);
client.close();
