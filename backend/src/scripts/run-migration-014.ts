import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration014() {
  const client = await pool.connect();
  try {
    console.log("Starting migration 014: Remove sections except balance...");

    // Read migration file
    const migration = await readFile(
      join(__dirname, "../migrations/014_remove_sections_except_balance.sql"),
      "utf-8"
    );

    // Execute migration
    await client.query(migration);

    console.log("✅ Migration 014 completed successfully!");
    console.log("All sections except 'Баланс' have been removed from the database.");
  } catch (error) {
    console.error("❌ Migration 014 failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration014().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
