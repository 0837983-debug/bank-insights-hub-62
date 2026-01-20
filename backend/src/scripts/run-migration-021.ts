/**
 * Применение миграции 021: добавление header компонента с data_source_key = header_dates
 */

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration021() {
  const client = await pool.connect();
  try {
    console.log("Starting migration 021: Add header component...");

    const migrationAddHeader = await readFile(
      join(__dirname, "../migrations/021_add_header_component.sql"),
      "utf-8"
    );

    await client.query(migrationAddHeader);
    console.log("✅ Migration 021 (add header component) completed successfully!");
  } catch (error) {
    console.error("❌ Migration 021 failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration021().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
