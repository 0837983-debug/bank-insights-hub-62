import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runFieldTypeMigrations() {
  const client = await pool.connect();
  try {
    console.log("Starting field_type migrations (030-033)...\n");

    // Migration 030: Add field_type column
    console.log("Running migration 030: Add field_type column...");
    const migration030 = await readFile(
      join(__dirname, "../migrations/030_add_field_type.sql"),
      "utf-8"
    );
    await client.query(migration030);
    console.log("✅ Migration 030 completed\n");

    // Migration 031: Migrate field_types from is_dimension/is_measure
    console.log("Running migration 031: Migrate field_types...");
    const migration031 = await readFile(
      join(__dirname, "../migrations/031_migrate_field_types.sql"),
      "utf-8"
    );
    await client.query(migration031);
    console.log("✅ Migration 031 completed\n");

    // Migration 032: Add calculation_config for calculated fields
    console.log("Running migration 032: Add calculation_config...");
    const migration032 = await readFile(
      join(__dirname, "../migrations/032_add_calculated_fields.sql"),
      "utf-8"
    );
    await client.query(migration032);
    console.log("✅ Migration 032 completed\n");

    // Migration 033: Update layout view
    console.log("Running migration 033: Update layout view...");
    const migration033 = await readFile(
      join(__dirname, "../migrations/033_update_layout_view_field_type.sql"),
      "utf-8"
    );
    await client.query(migration033);
    console.log("✅ Migration 033 completed\n");

    // Migration 034: Fix field_types for ppValue/pyValue
    console.log("Running migration 034: Fix field_types...");
    const migration034 = await readFile(
      join(__dirname, "../migrations/034_fix_field_types.sql"),
      "utf-8"
    );
    await client.query(migration034);
    console.log("✅ Migration 034 completed\n");

    // Verify results
    console.log("Verifying migration results...\n");

    // Check field_type distribution
    const fieldTypeResult = await client.query(`
      SELECT field_type, COUNT(*) as count 
      FROM config.component_fields 
      GROUP BY field_type 
      ORDER BY field_type
    `);
    console.log("field_type distribution:");
    fieldTypeResult.rows.forEach(row => {
      console.log(`  ${row.field_type || 'NULL'}: ${row.count}`);
    });

    // Check calculated fields with calculation_config
    const calculatedResult = await client.query(`
      SELECT field_id, calculation_config 
      FROM config.component_fields 
      WHERE field_type = 'calculated' 
      AND calculation_config IS NOT NULL
      LIMIT 10
    `);
    console.log("\nCalculated fields with config:");
    calculatedResult.rows.forEach(row => {
      console.log(`  ${row.field_id}: ${JSON.stringify(row.calculation_config)}`);
    });

    // Check measure fields with aggregation
    const measureResult = await client.query(`
      SELECT field_id, aggregation 
      FROM config.component_fields 
      WHERE field_type = 'measure' 
      LIMIT 5
    `);
    console.log("\nMeasure fields with aggregation:");
    measureResult.rows.forEach(row => {
      console.log(`  ${row.field_id}: ${row.aggregation}`);
    });

    console.log("\n✅ All field_type migrations completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runFieldTypeMigrations().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
