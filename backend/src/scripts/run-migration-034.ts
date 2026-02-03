import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration034() {
  const client = await pool.connect();
  try {
    console.log("Running migration 034: Fix field_types...\n");
    
    const migration034 = await readFile(
      join(__dirname, "../migrations/034_fix_field_types.sql"),
      "utf-8"
    );
    await client.query(migration034);
    console.log("✅ Migration 034 completed\n");

    // Verify results
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

    // Check calculated fields
    const calculatedResult = await client.query(`
      SELECT field_id, calculation_config 
      FROM config.component_fields 
      WHERE field_type = 'calculated'
      LIMIT 10
    `);
    console.log("\nCalculated fields:");
    calculatedResult.rows.forEach(row => {
      console.log(`  ${row.field_id}: ${JSON.stringify(row.calculation_config)}`);
    });

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration034().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
