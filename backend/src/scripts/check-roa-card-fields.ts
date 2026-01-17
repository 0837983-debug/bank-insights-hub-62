/**
 * Check roa_card component_fields structure
 */

import { pool } from "../config/database.js";

async function checkRoaCardFields() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка полей roa_card ===\n");

    // Check component
    const component = await client.query(`
      SELECT id, component_type, title, data_source_key
      FROM config.components
      WHERE id = 'roa_card'
        AND deleted_at IS NULL
    `);

    console.log("Компонент roa_card:");
    if (component.rows.length > 0) {
      console.log(JSON.stringify(component.rows[0], null, 2));
    } else {
      console.log("  (не найден)");
    }

    // Check component_fields
    const fields = await client.query(`
      SELECT 
        id,
        component_id,
        field_id,
        field_type,
        label,
        description,
        format_id,
        is_visible,
        is_groupable,
        parent_field_id,
        display_order,
        is_active,
        settings
      FROM config.component_fields
      WHERE component_id = 'roa_card'
        AND deleted_at IS NULL
      ORDER BY display_order, field_id
    `);

    console.log(`\nПоля component_fields (${fields.rows.length}):`);
    fields.rows.forEach((field) => {
      console.log(`\n  - field_id: ${field.field_id}`);
      console.log(`    field_type: ${field.field_type}`);
      console.log(`    label: ${field.label || 'null'}`);
      console.log(`    format_id: ${field.format_id || 'null'}`);
      console.log(`    is_visible: ${field.is_visible}`);
      console.log(`    is_groupable: ${field.is_groupable}`);
      console.log(`    display_order: ${field.display_order}`);
      console.log(`    settings: ${field.settings || 'null'}`);
    });

    // Also check assets_table for comparison
    console.log("\n=== Проверка полей assets_table ===\n");
    const assetsFields = await client.query(`
      SELECT 
        field_id,
        field_type,
        label,
        format_id,
        is_visible,
        is_groupable,
        display_order
      FROM config.component_fields
      WHERE component_id = 'assets_table'
        AND deleted_at IS NULL
      ORDER BY display_order, field_id
    `);

    console.log(`Поля assets_table (${assetsFields.rows.length}):`);
    assetsFields.rows.forEach((field) => {
      console.log(`  - ${field.field_id}: type=${field.field_type}, format=${field.format_id || 'none'}, visible=${field.is_visible}, order=${field.display_order}`);
    });

  } catch (error) {
    console.error("Ошибка:", error);
    throw error;
  } finally {
    client.release();
  }
}

checkRoaCardFields()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
