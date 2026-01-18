/**
 * Применение миграции 018: создание структуры для загрузки файлов
 */

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration018() {
  const client = await pool.connect();
  try {
    console.log("Starting migration 018: Create upload tables...");

    const migrationUploadTables = await readFile(
      join(__dirname, "../migrations/018_create_upload_tables.sql"),
      "utf-8"
    );

    await client.query(migrationUploadTables);
    console.log("✅ Migration 018 (upload tables) completed successfully!");
  } catch (error) {
    console.error("❌ Migration 018 failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration018().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
