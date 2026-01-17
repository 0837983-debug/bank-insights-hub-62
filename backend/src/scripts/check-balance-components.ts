/**
 * Check balance components and fields
 */

import { pool } from "../config/database.js";

async function checkBalanceComponents() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка компонентов balance ===\n");

    // Check components
    const components = await client.query(`
      SELECT id, component_type, title, data_source_key
      FROM config.components
      WHERE id IN ('balance_assets_table', 'balance_liabilities_table')
        AND deleted_at IS NULL
    `);

    console.log("Компоненты:");
    components.rows.forEach((row) => {
      console.log(`  - ${row.id}: ${row.title || row.id} (type: ${row.component_type})`);
    });

    // Check component_fields
    const fields = await client.query(`
      SELECT 
        component_id,
        field_id,
        field_type,
        label,
        is_visible,
        is_groupable,
        parent_field_id,
        display_order
      FROM config.component_fields
      WHERE component_id IN ('balance_assets_table', 'balance_liabilities_table')
        AND deleted_at IS NULL
      ORDER BY component_id, display_order, field_id
    `);

    console.log(`\nПоля в component_fields: ${fields.rows.length}`);
    const fieldsByComponent: Record<string, typeof fields.rows> = {};
    fields.rows.forEach((row) => {
      if (!fieldsByComponent[row.component_id]) {
        fieldsByComponent[row.component_id] = [];
      }
      fieldsByComponent[row.component_id].push(row);
    });

    for (const componentId of ['balance_assets_table', 'balance_liabilities_table']) {
      console.log(`\n${componentId}:`);
      if (fieldsByComponent[componentId]) {
        fieldsByComponent[componentId].forEach((field) => {
          console.log(`  - ${field.field_id}: visible=${field.is_visible}, groupable=${field.is_groupable}, parent=${field.parent_field_id || 'none'}, order=${field.display_order}`);
        });
      } else {
        console.log("  (нет полей)");
      }
    }

    // Check mart.balance structure
    console.log("\nСтруктура mart.balance (пример строки):");
    const sample = await client.query(`
      SELECT *
      FROM mart.balance
      LIMIT 1
    `);

    if (sample.rows.length > 0) {
      const columns = Object.keys(sample.rows[0]);
      console.log("  Колонки:", columns.join(", "));
      console.log("\n  Пример:");
      console.log(JSON.stringify(sample.rows[0], null, 2));
    } else {
      console.log("  (нет данных)");
    }

    // Check distinct table_component_id
    console.log("\nУникальные table_component_id в mart.balance:");
    const tableIds = await client.query(`
      SELECT DISTINCT table_component_id, COUNT(*) as count
      FROM mart.balance
      GROUP BY table_component_id
      ORDER BY table_component_id
    `);

    tableIds.rows.forEach((row) => {
      console.log(`  - ${row.table_component_id}: ${row.count} записей`);
    });

  } catch (error) {
    console.error("Ошибка:", error);
    throw error;
  } finally {
    client.release();
  }
}

checkBalanceComponents()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
