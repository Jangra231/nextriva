import mysql from "mysql2/promise";
import fs from "node:fs";

const env = fs
  .readFileSync(new URL("../.env", import.meta.url), "utf8")
  .split(/\r?\n/)
  .filter((l) => l && !l.trim().startsWith("#"))
  .map((l) => l.split("=", 2));
const get = (k) => {
  const row = env.find((kv) => kv[0] === k);
  return row ? row[1] : "";
};

async function main() {
  const url = get("DATABASE_URL");
  if (!url) {
    console.log("NO_DATABASE_URL");
    return;
  }
  const c = await mysql.createConnection(url);
  try {
    // Check which migrations have been applied
    const [migrations] = await c.query(
      "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 10"
    );
    console.log("Applied migrations (last 10):");
    for (const m of migrations) {
      console.log(`  ${m.hash} - ${m.created_at}`);
    }
  } catch (error) {
    console.log("Migration table query error:", error.message);
  } finally {
    await c.end();
  }
}

main().catch((e) => console.log("DB_ERR", e.message));
