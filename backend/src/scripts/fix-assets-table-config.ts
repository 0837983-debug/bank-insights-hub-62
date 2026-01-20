/**
 * Script to fix assets_table config - replace direct value with parameter
 */

import { pool } from "../config/database.js";

async function fixAssetsTableConfig() {
  const client = await pool.connect();
  try {
    console.log("=== Исправление конфига assets_table ===\n");

    // Получаем текущий конфиг
    const currentConfig = await client.query(`
      SELECT config_json
      FROM config.component_queries
      WHERE query_id = 'assets_table'
        AND deleted_at IS NULL
    `);

    if (currentConfig.rows.length === 0) {
      console.log("❌ Конфиг assets_table не найден!");
      return;
    }

    const config = currentConfig.rows[0].config_json;

    // Проверяем, нужно ли исправлять
    if (config.where && config.where.items) {
      const classItem = config.where.items.find((item: any) => item.field === "class");
      if (classItem && classItem.value === "assets") {
        console.log("Найдено прямое значение 'assets' вместо ':class'");
        console.log("Исправляю...");

        // Обновляем конфиг
        classItem.value = ":class";

        // Обновляем params, если нужно
        if (!config.params) {
          config.params = {};
        }
        config.params.class = "assets";

        // Обновляем paramTypes
        if (!config.paramTypes) {
          config.paramTypes = {};
        }
        config.paramTypes.class = "string";

        // Сохраняем обратно в БД
        await client.query(`
          UPDATE config.component_queries
          SET config_json = $1
          WHERE query_id = 'assets_table'
            AND deleted_at IS NULL
        `, [JSON.stringify(config)]);

        console.log("✅ Конфиг обновлен!");
        console.log("Теперь используется ':class' вместо 'assets'");
      } else {
        console.log("✅ Конфиг уже корректен (использует ':class')");
      }
    }

  } catch (error) {
    console.error("Ошибка:", error);
    throw error;
  } finally {
    client.release();
  }
}

fixAssetsTableConfig()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
