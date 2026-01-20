/**
 * Script to check assets_table config - should use direct value "assets" instead of ":class"
 */

import { pool } from "../config/database.js";

async function checkAssetsTableConfig() {
  const client = await pool.connect();
  try {
    console.log("=== Проверка конфига assets_table ===\n");

    const configResult = await client.query(`
      SELECT config_json
      FROM config.component_queries
      WHERE query_id = 'assets_table'
        AND deleted_at IS NULL
    `);

    if (configResult.rows.length === 0) {
      console.log("❌ Конфиг assets_table не найден!");
      return;
    }

    const config = configResult.rows[0].config_json;

    // Проверяем WHERE условия
    if (config.where && config.where.items) {
      const classItem = config.where.items.find((item: any) => item.field === "class");
      if (classItem) {
        console.log(`Текущее значение: ${JSON.stringify(classItem.value)}`);
        
        if (classItem.value === ":class") {
          console.log("\n⚠️ Конфиг использует параметр ':class'");
          console.log("Для работы без параметра class нужно использовать прямое значение 'assets'");
          console.log("Исправляю...");

          // Обновляем конфиг
          classItem.value = "assets";

          // Удаляем class из params и paramTypes, если есть
          if (config.params && config.params.class) {
            delete config.params.class;
          }
          if (config.paramTypes && config.paramTypes.class) {
            delete config.paramTypes.class;
          }

          // Сохраняем обратно в БД
          await client.query(`
            UPDATE config.component_queries
            SET config_json = $1
            WHERE query_id = 'assets_table'
              AND deleted_at IS NULL
          `, [JSON.stringify(config)]);

          console.log("✅ Конфиг обновлен!");
          console.log("Теперь используется прямое значение 'assets' вместо ':class'");
        } else if (classItem.value === "assets") {
          console.log("\n✅ Конфиг уже использует прямое значение 'assets'");
          console.log("API должен работать без параметра class");
        } else {
          console.log(`\n⚠️ Неожиданное значение: ${JSON.stringify(classItem.value)}`);
        }
      }
    }

  } catch (error) {
    console.error("Ошибка:", error);
    throw error;
  } finally {
    client.release();
  }
}

checkAssetsTableConfig()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
