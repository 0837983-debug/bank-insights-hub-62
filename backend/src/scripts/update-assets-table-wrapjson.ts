/**
 * Обновление wrap_json для assets_table и liabilities_table
 */

import { pool } from "../config/database.js";

async function updateWrapJson() {
  const client = await pool.connect();
  try {
    // Обновляем wrap_json для assets_table
    await client.query(
      `UPDATE config.component_queries 
       SET wrap_json = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE query_id = 'assets_table'`
    );
    console.log("✅ Updated wrap_json for assets_table");

    // Обновляем wrap_json для liabilities_table (если существует)
    await client.query(
      `UPDATE config.component_queries 
       SET wrap_json = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE query_id = 'liabilities_table'`
    );
    console.log("✅ Updated wrap_json for liabilities_table");

    // Проверяем результат
    const result = await client.query(
      `SELECT query_id, wrap_json 
       FROM config.component_queries 
       WHERE query_id IN ('assets_table', 'liabilities_table')`
    );
    console.log("Current wrap_json status:", JSON.stringify(result.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

updateWrapJson().catch(console.error);
