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
    // Check critical new tables and columns from recent migrations
    console.log("=== SCHEMA VERIFICATION ===\n");
    
    // Check otpVerifications table (migration 0039)
    try {
      const [otp] = await c.query("SHOW TABLES LIKE 'otpVerifications'");
      console.log(`✓ otpVerifications table: ${otp.length ? 'EXISTS' : 'MISSING'}`);
    } catch (e) {
      console.log(`✗ otpVerifications table: ERROR - ${e.message}`);
    }
    
    // Check passwordResets table (migration 0039)
    try {
      const [pwd] = await c.query("SHOW TABLES LIKE 'passwordResets'");
      console.log(`✓ passwordResets table: ${pwd.length ? 'EXISTS' : 'MISSING'}`);
    } catch (e) {
      console.log(`✗ passwordResets table: ERROR - ${e.message}`);
    }
    
    // Check users table new columns (migration 0039)
    const userColumns = [
      'phone', 'gender', 'dateOfBirth', 'state', 'city', 
      'interests', 'eventFormat', 'eventFrequency', 
      'notificationPrefs', 'profileCompleted', 'phoneVerified'
    ];
    
    console.log("\n=== users TABLE COLUMNS ===");
    for (const col of userColumns) {
      try {
        const [result] = await c.query(`SHOW COLUMNS FROM users LIKE '${col}'`);
        console.log(`✓ users.${col}: ${result.length ? 'EXISTS' : 'MISSING'}`);
      } catch (e) {
        console.log(`✗ users.${col}: ERROR - ${e.message}`);
      }
    }
    
    // Check registrations columns (migration 0037)
    console.log("\n=== registrations TABLE COLUMNS ===");
    const regColumns = ['ticketSubtotalPaise', 'gstPaise'];
    for (const col of regColumns) {
      try {
        const [result] = await c.query(`SHOW COLUMNS FROM registrations LIKE '${col}'`);
        console.log(`✓ registrations.${col}: ${result.length ? 'EXISTS' : 'MISSING'}`);
      } catch (e) {
        console.log(`✗ registrations.${col}: ERROR - ${e.message}`);
      }
    }
    
    // List all applied migrations
    console.log("\n=== APPLIED MIGRATIONS (last 5) ===");
    const [migrations] = await c.query(
      "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5"
    );
    for (const m of migrations) {
      const date = new Date(m.created_at).toISOString().split('T')[0];
      console.log(`  ${m.hash.substring(0, 16)}... - ${date}`);
    }
    
  } finally {
    await c.end();
  }
}

main().catch((e) => console.log("DB_ERR", e.message));
