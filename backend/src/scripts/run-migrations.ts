import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("Starting database migrations...");

    // Read migration files
    const migration1 = await readFile(
      join(__dirname, "../migrations/001_create_kpi_tables.sql"),
      "utf-8"
    );
    const migration2 = await readFile(
      join(__dirname, "../migrations/002_insert_initial_data.sql"),
      "utf-8"
    );

    // Execute migrations
    console.log("Running migration 001: Create KPI tables...");
    await client.query(migration1);
    console.log("✅ Migration 001 completed");

    console.log("Running migration 002: Insert initial data...");
    await client.query(migration2);
    console.log("✅ Migration 002 completed");

    console.log("✅ All migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

