/**
 * Script to test assets_table API call
 */

import { buildQueryFromId } from "../services/queryBuilder/builder.js";

async function testAssetsTableAPI() {
  try {
    console.log("=== Тест API assets_table ===\n");

    const params = {
      p1: "2025-12-31",
      p2: "2025-11-30",
      p3: "2024-12-31",
      class: "assets",
    };

    console.log("Параметры запроса:");
    console.log(JSON.stringify(params, null, 2));

    console.log("\nВызов buildQueryFromId...");
    const paramsJson = JSON.stringify(params);
    const sql = await buildQueryFromId("assets_table", paramsJson);

    console.log("\n✅ SQL успешно сгенерирован:");
    console.log(sql.substring(0, 500));
    console.log("...\n");

    console.log("✅ Тест пройден успешно!");

  } catch (error: any) {
    console.error("\n❌ Ошибка:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAssetsTableAPI()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
