/**
 * Test script to verify getValue fix
 */

import { buildQueryFromId } from "../services/queryBuilder/builder.js";

async function testGetValueFix() {
  try {
    console.log("=== Тест getValue fix ===\n");

    // Тест 1: API без параметра class (должен использовать прямое значение "assets" из конфига)
    console.log("Тест 1: API без параметра class");
    const params1 = {
      p1: "2025-12-31",
      p2: "2025-11-30",
      p3: "2024-12-31",
      // class отсутствует - должен использовать прямое значение "assets" из конфига
    };

    console.log("Параметры:", JSON.stringify(params1, null, 2));

    try {
      const paramsJson1 = JSON.stringify(params1);
      const sql1 = await buildQueryFromId("assets_table", paramsJson1);
      console.log("✅ SQL успешно сгенерирован (без class параметра)");
      console.log("SQL (первые 300 символов):", sql1.substring(0, 300));
      console.log("\n✅ Тест 1 пройден!");
    } catch (error: any) {
      console.error("❌ Ошибка в тесте 1:", error.message);
      throw error;
    }

    // Тест 2: API с параметром class (должен использовать параметр)
    console.log("\n=== Тест 2: API с параметром class ===");
    const params2 = {
      p1: "2025-12-31",
      p2: "2025-11-30",
      p3: "2024-12-31",
      class: "assets",
    };

    console.log("Параметры:", JSON.stringify(params2, null, 2));

    try {
      const paramsJson2 = JSON.stringify(params2);
      const sql2 = await buildQueryFromId("assets_table", paramsJson2);
      console.log("✅ SQL успешно сгенерирован (с class параметром)");
      console.log("SQL (первые 300 символов):", sql2.substring(0, 300));
      console.log("\n✅ Тест 2 пройден!");
    } catch (error: any) {
      console.error("❌ Ошибка в тесте 2:", error.message);
      throw error;
    }

    console.log("\n✅ Все тесты пройдены успешно!");

  } catch (error: any) {
    console.error("\n❌ Ошибка:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testGetValueFix()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
