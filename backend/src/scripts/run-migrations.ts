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
    const migrationSchemas = await readFile(
      join(__dirname, "../migrations/001_create_schemas.sql"),
      "utf-8"
    );
    const migrationKPI = await readFile(
      join(__dirname, "../migrations/001_create_kpi_tables.sql"),
      "utf-8"
    );
    const migrationInitialData = await readFile(
      join(__dirname, "../migrations/002_insert_initial_data.sql"),
      "utf-8"
    );
    const migrationFormatsTable = await readFile(
      join(__dirname, "../migrations/005_create_formats_table.sql"),
      "utf-8"
    );
    const migrationFormatsData = await readFile(
      join(__dirname, "../migrations/006_load_formats_data.sql"),
      "utf-8"
    );
    const migrationConfigSchema = await readFile(
      join(__dirname, "../migrations/007_create_config_schema.sql"),
      "utf-8"
    );
    const migrationConfigHistory = await readFile(
      join(__dirname, "../migrations/008_create_config_history_table.sql"),
      "utf-8"
    );
    const migrationLayoutData = await readFile(
      join(__dirname, "../migrations/009_migrate_layout_data.sql"),
      "utf-8"
    );

    // Execute migrations in order
    console.log("Running migration 001: Create schemas...");
    await client.query(migrationSchemas);
    console.log("✅ Migration 001 (schemas) completed");

    console.log("Running migration 001: Create KPI tables...");
    await client.query(migrationKPI);
    console.log("✅ Migration 001 (KPI tables) completed");

    console.log("Running migration 002: Insert initial data...");
    await client.query(migrationInitialData);
    console.log("✅ Migration 002 completed");

    console.log("Running migration 005: Create formats table...");
    await client.query(migrationFormatsTable);
    console.log("✅ Migration 005 completed");

    console.log("Running migration 006: Load formats data...");
    await client.query(migrationFormatsData);
    console.log("✅ Migration 006 completed");

    console.log("Running migration 007: Create config schema tables...");
    await client.query(migrationConfigSchema);
    console.log("✅ Migration 007 completed");

    console.log("Running migration 008: Create config changes history...");
    await client.query(migrationConfigHistory);
    console.log("✅ Migration 008 completed");

    console.log("Running migration 009: Migrate layout data (placeholder)...");
    await client.query(migrationLayoutData);
    console.log("✅ Migration 009 completed (note: actual data migration via npm run migrate-data)");

    console.log("✅ All migrations completed successfully!");
    console.log("💡 To migrate layout data from layout.json, run: npm run migrate-data");
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

