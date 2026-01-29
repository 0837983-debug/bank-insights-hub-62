/**
 * Скрипт для выполнения одиночной миграции
 * Использование: tsx src/scripts/run-single-migration.ts <migration_file>
 */
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runSingleMigration(migrationFile: string) {
  const client = await pool.connect();
  try {
    console.log(`Starting migration: ${migrationFile}...`);

    const migrationPath = join(__dirname, "../migrations", migrationFile);
    const migrationSql = await readFile(migrationPath, "utf-8");

    await client.query(migrationSql);
    console.log(`✅ Migration ${migrationFile} completed successfully!`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: tsx src/scripts/run-single-migration.ts <migration_file>");
  console.error("Example: tsx src/scripts/run-single-migration.ts 026_create_fin_results_tables.sql");
  process.exit(1);
}

runSingleMigration(migrationFile).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
