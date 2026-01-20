import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration024() {
  const client = await pool.connect();
  try {
    console.log("Starting migration 024: Add layout query config...");

    // Read migration file
    const migration = await readFile(
      join(__dirname, "../migrations/024_add_layout_query_config.sql"),
      "utf-8"
    );

    // Execute migration
    await client.query(migration);
    console.log("✅ Migration 024 completed successfully!");

    // Verify config was created
    const configCheck = await client.query(`
      SELECT query_id, title, wrap_json, is_active
      FROM config.component_queries
      WHERE query_id = 'layout'
    `);

    if (configCheck.rows.length > 0) {
      console.log("\n✅ Config 'layout' created:");
      console.log("  - query_id:", configCheck.rows[0].query_id);
      console.log("  - title:", configCheck.rows[0].title);
      console.log("  - wrap_json:", configCheck.rows[0].wrap_json);
      console.log("  - is_active:", configCheck.rows[0].is_active);
    } else {
      console.warn("\n⚠️  Config 'layout' not found");
    }
  } catch (error) {
    console.error("❌ Migration 024 failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration024().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
