import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration015() {
  const client = await pool.connect();
  try {
    console.log("Starting migration 015: Remove unused formats...");

    // Read migration file
    const migration = await readFile(
      join(__dirname, "../migrations/015_remove_unused_formats.sql"),
      "utf-8"
    );

    // Execute migration
    await client.query(migration);

    console.log("✅ Migration 015 completed successfully!");
    console.log("Unused formats have been removed from the database.");
  } catch (error) {
    console.error("❌ Migration 015 failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration015().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
