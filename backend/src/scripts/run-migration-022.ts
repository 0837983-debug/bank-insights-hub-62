/**
 * Применение миграции 022: добавление кнопок-компонентов для замены groupableFields
 */

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration022() {
  const client = await pool.connect();
  try {
    console.log("Starting migration 022: Add button components...");

    const migrationAddButtons = await readFile(
      join(__dirname, "../migrations/022_add_button_components.sql"),
      "utf-8"
    );

    await client.query(migrationAddButtons);
    console.log("✅ Migration 022 (add button components) completed successfully!");
  } catch (error) {
    console.error("❌ Migration 022 failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration022().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
