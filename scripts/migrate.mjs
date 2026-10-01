import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first (Neon connection string).");
  process.exit(1);
}
const sql = neon(url);

const schema = readFileSync(join(root, "schema.sql"), "utf8");
const statements = schema
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (const stmt of statements) {
  await sql.query(stmt);
}
console.log(`Migrated ${statements.length} statements to Neon.`);
