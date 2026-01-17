/**
 * Find balance-related components
 */

import { pool } from "../config/database.js";

async function findBalanceComponents() {
  const client = await pool.connect();
  try {
    console.log("=== Поиск компонентов balance ===\n");

    // Check all table components
    const allTables = await client.query(`
      SELECT id, component_type, title, data_source_key, is_active
      FROM config.components
      WHERE component_type = 'table'
        AND deleted_at IS NULL
      ORDER BY id
    `);

    console.log(`Все таблицы (${allTables.rows.length}):`);
    allTables.rows.forEach((row) => {
      console.log(`  - ${row.id}: ${row.title || row.id} (active: ${row.is_active}, data_source: ${row.data_source_key || 'none'})`);
    });

    // Check if balance components exist (by data_source_key)
    const balanceByKey = await client.query(`
      SELECT id, component_type, title, data_source_key, is_active
      FROM config.components
      WHERE data_source_key IN ('balance_assets', 'balance_liabilities')
        AND deleted_at IS NULL
      ORDER BY id
    `);

    console.log(`\nКомпоненты с data_source_key balance_assets/balance_liabilities (${balanceByKey.rows.length}):`);
    balanceByKey.rows.forEach((row) => {
      console.log(`  - ${row.id}: ${row.title || row.id} (active: ${row.is_active}, data_source: ${row.data_source_key})`);
    });

    // Check if components exist by id but might be inactive
    const byId = await client.query(`
      SELECT id, component_type, title, data_source_key, is_active, deleted_at
      FROM config.components
      WHERE id IN ('balance_assets_table', 'balance_liabilities_table')
    `);

    console.log(`\nКомпоненты по ID balance_assets_table/balance_liabilities_table (${byId.rows.length}):`);
    byId.rows.forEach((row) => {
      console.log(`  - ${row.id}: ${row.title || row.id} (active: ${row.is_active}, deleted: ${row.deleted_at || 'no'})`);
    });

  } catch (error) {
    console.error("Ошибка:", error);
    throw error;
  } finally {
    client.release();
  }
}

findBalanceComponents()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
