import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration023() {
  const client = await pool.connect();
  try {
    console.log("Starting migration 023: Create layout views...");

    // Read migration file
    const migration = await readFile(
      join(__dirname, "../migrations/023_create_layout_views.sql"),
      "utf-8"
    );

    // Execute migration
    await client.query(migration);
    console.log("✅ Migration 023 completed successfully!");

    // Verify views were created
    const viewsCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'config' 
        AND table_name IN ('layout_formats_view', 'layout_header_view', 'layout_sections_view', 'layout_sections_agg_view')
      ORDER BY table_name
    `);

    console.log("\nCreated views:");
    viewsCheck.rows.forEach((row) => {
      console.log(`  - config.${row.table_name}`);
    });

    if (viewsCheck.rows.length === 4) {
      console.log("\n✅ All 4 views created successfully!");
    } else {
      console.warn(`\n⚠️  Expected 4 views, but found ${viewsCheck.rows.length}`);
    }
  } catch (error) {
    console.error("❌ Migration 023 failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

runMigration023().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
