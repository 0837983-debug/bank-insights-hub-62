/**
 * Применение миграции 019: создание таблицы конфигов запросов для SQL Builder
 */

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration019() {
  const client = await pool.connect();
  try {
    console.log("Starting migration 019: Create component_queries table...");

    const migrationComponentQueries = await readFile(
      join(__dirname, "../migrations/019_create_component_queries.sql"),
      "utf-8"
    );

    await client.query(migrationComponentQueries);
    console.log("✅ Migration 019 (component_queries) completed successfully!");
  } catch (error) {
    console.error("❌ Migration 019 failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration019().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
