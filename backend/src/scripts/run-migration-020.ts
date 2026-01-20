/**
 * Применение миграции 020: удаление поля component_id из config.component_queries
 */

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration020() {
  const client = await pool.connect();
  try {
    console.log("Starting migration 020: Remove component_id from component_queries...");

    const migrationRemoveComponentId = await readFile(
      join(__dirname, "../migrations/020_remove_component_id_from_queries.sql"),
      "utf-8"
    );

    await client.query(migrationRemoveComponentId);
    console.log("✅ Migration 020 (remove component_id) completed successfully!");
  } catch (error) {
    console.error("❌ Migration 020 failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration020().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
