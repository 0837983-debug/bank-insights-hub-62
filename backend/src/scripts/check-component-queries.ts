/**
 * Проверка конфигов component_queries
 */

import { pool } from "../config/database.js";

async function checkQueries() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT query_id, title, is_active 
       FROM config.component_queries 
       WHERE deleted_at IS NULL 
       ORDER BY query_id`
    );
    console.log("Component queries:", JSON.stringify(result.rows, null, 2));

    const headerDates = await client.query(
      `SELECT config_json FROM config.component_queries WHERE query_id = $1`,
      ["header_dates"]
    );
    console.log("\nheader_dates config:", JSON.stringify(headerDates.rows[0]?.config_json, null, 2));

    const assetsTable = await client.query(
      `SELECT config_json FROM config.component_queries WHERE query_id = $1`,
      ["assets_table"]
    );
    console.log("\nassets_table config:", JSON.stringify(assetsTable.rows[0]?.config_json, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

checkQueries().catch(console.error);
