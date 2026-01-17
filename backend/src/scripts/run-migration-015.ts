import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration015() {
  const client = await pool.connect();
  try {
    console.log("Running migration 015: Add assets table to Balance section...");
    
    const migrationSQL = await readFile(
      join(__dirname, "../migrations/015_add_assets_table_to_balance.sql"),
      "utf-8"
    );
    
    await client.query(migrationSQL);
    console.log("✅ Migration 015 completed successfully!");
    
    // Check if assets_table component exists
    const componentCheck = await client.query(`
      SELECT id, component_type, title, data_source_key 
      FROM config.components 
      WHERE id = 'assets_table' AND deleted_at IS NULL
    `);
    console.log(`\n📋 Assets table component:`, componentCheck.rows.length > 0 ? componentCheck.rows[0] : 'NOT FOUND');
    
    // Check if mapping exists
    const mappingCheck = await client.query(`
      SELECT lcm.id, lcm.component_id, lcm.parent_component_id, lcm.display_order, lcm.deleted_at
      FROM config.layout_component_mapping lcm
      WHERE lcm.component_id = 'assets_table' AND lcm.layout_id = 'main_dashboard'
    `);
    console.log(`\n📋 Assets table mapping:`, mappingCheck.rows.length > 0 ? mappingCheck.rows[0] : 'NOT FOUND');
    
    // Find section_balance component_id
    const sectionCheck = await client.query(`
      SELECT lcm.component_id, c.title
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE lcm.parent_component_id IS NULL
        AND c.component_type = 'container'
        AND c.title = 'Баланс'
        AND lcm.deleted_at IS NULL
    `);
    console.log(`\n📋 Balance section component:`, sectionCheck.rows.length > 0 ? sectionCheck.rows[0] : 'NOT FOUND');
    
    // Verify the result
    const verifyResult = await client.query(`
      SELECT 
        lcm.id,
        lcm.component_id,
        c.component_type,
        c.title,
        lcm.display_order
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE lcm.parent_component_id IN (
        SELECT component_id 
        FROM config.layout_component_mapping
        WHERE parent_component_id IS NULL
          AND component_id IN (
            SELECT id FROM config.components 
            WHERE component_type = 'container' AND title = 'Баланс'
          )
      )
        AND lcm.deleted_at IS NULL
      ORDER BY lcm.display_order
    `);
    
    console.log(`\n✅ Found ${verifyResult.rows.length} components in Balance section:`);
    verifyResult.rows.forEach((row: any) => {
      console.log(`   - ${row.component_id}: ${row.component_type} "${row.title}"`);
    });
    
  } catch (error) {
    console.error("❌ Migration 015 failed:", error);
    throw error;
  } finally {
    client.release();
    // Don't close pool here - it's shared and managed by database.ts
  }
}

runMigration015().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
