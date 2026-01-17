import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration017() {
  const client = await pool.connect();
  try {
    console.log("Running migration 017: Remove instance_id, add parent_component_id...");
    
    const migrationSQL = await readFile(
      join(__dirname, "../migrations/017_remove_instance_id_add_parent_component_id.sql"),
      "utf-8"
    );
    
    await client.query(migrationSQL);
    console.log("✅ Migration 017 completed successfully!");
  } catch (error) {
    console.error("❌ Migration 017 failed:", error);
    throw error;
  } finally {
    client.release();
    // Don't close pool here - it's shared and managed by database.ts
  }
}

runMigration017().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
