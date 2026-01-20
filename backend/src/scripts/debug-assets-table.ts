/**
 * Debug script to check what's happening with assets_table
 */

import { pool } from "../config/database.js";
import { buildQuery } from "../services/queryBuilder/builder.js";

async function debugAssetsTable() {
  const client = await pool.connect();
  try {
    console.log("=== Debug assets_table ===\n");

    // Загружаем конфиг из БД
    const configResult = await client.query(`
      SELECT config_json, wrap_json
      FROM config.component_queries
      WHERE query_id = 'assets_table'
        AND is_active = TRUE
        AND deleted_at IS NULL
    `);

    if (configResult.rows.length === 0) {
      console.log("❌ Конфиг assets_table не найден!");
      return;
    }

    const config = configResult.rows[0].config_json;
    const wrapJson = configResult.rows[0].wrap_json;

    console.log("Конфиг из БД:");
    console.log(JSON.stringify(config, null, 2));
    console.log(`\nwrap_json: ${wrapJson}`);

    // Проверяем WHERE условия
    console.log("\n=== WHERE условия ===");
    if (config.where && config.where.items) {
      for (const item of config.where.items) {
        console.log(`Field: ${item.field}, Op: ${item.op}, Value: ${JSON.stringify(item.value)}`);
        console.log(`  Type: ${typeof item.value}`);
        if (typeof item.value === "string") {
          console.log(`  Starts with ':': ${item.value.startsWith(":")}`);
        }
      }
    }

    // Пробуем построить запрос
    console.log("\n=== Построение запроса ===");
    const params = {
      p1: "2025-12-31",
      p2: "2025-11-30",
      p3: "2024-12-31",
      class: "assets",
    };

    console.log("Параметры:");
    console.log(JSON.stringify(params, null, 2));

    try {
      const sql = buildQuery(config, params, wrapJson);
      console.log("\n✅ SQL успешно сгенерирован:");
      console.log(sql.substring(0, 500));
    } catch (error: any) {
      console.error("\n❌ Ошибка при построении SQL:");
      console.error(error.message);
      console.error(error.stack);
    }

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
  }
}

debugAssetsTable()
  .then(() => {
    console.log("\nСкрипт выполнен");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
