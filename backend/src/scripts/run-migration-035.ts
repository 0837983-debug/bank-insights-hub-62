import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration035() {
  const client = await pool.connect();
  try {
    console.log("Running migration 035: Remove deprecated columns...\n");

    // Check columns before migration
    const columnsBefore = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'config' 
        AND table_name = 'component_fields'
        AND column_name IN ('is_dimension', 'is_measure', 'compact_display', 'is_groupable')
      ORDER BY column_name
    `);
    
    console.log("Deprecated columns before migration:");
    if (columnsBefore.rows.length === 0) {
      console.log("  (none found - already removed)");
    } else {
      columnsBefore.rows.forEach(row => {
        console.log(`  - ${row.column_name}`);
      });
    }

    // Run migration
    const migration035 = await readFile(
      join(__dirname, "../migrations/035_remove_deprecated_columns.sql"),
      "utf-8"
    );
    await client.query(migration035);
    console.log("\n✅ Migration 035 completed\n");

    // Verify columns after migration
    const columnsAfter = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'config' 
        AND table_name = 'component_fields'
        AND column_name IN ('is_dimension', 'is_measure', 'compact_display', 'is_groupable')
      ORDER BY column_name
    `);

    console.log("Deprecated columns after migration:");
    if (columnsAfter.rows.length === 0) {
      console.log("  ✅ All deprecated columns removed successfully");
    } else {
      console.log("  ⚠️ Some columns still exist:");
      columnsAfter.rows.forEach(row => {
        console.log(`  - ${row.column_name}`);
      });
    }

    // Show current table structure
    const currentColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'config' 
        AND table_name = 'component_fields'
      ORDER BY ordinal_position
    `);

    console.log("\nCurrent component_fields columns:");
    currentColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration035().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
