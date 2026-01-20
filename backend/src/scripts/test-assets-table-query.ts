/**
 * Тест SQL Builder для assets_table с указанными параметрами
 */

import { buildQuery } from "../services/queryBuilder/index.js";
import type { QueryConfig } from "../services/queryBuilder/types.js";

// JSON конфиг для запроса данных assets_table
const jsonConfig: QueryConfig = {
  from: {
    schema: "mart",
    table: "balance"
  },
  select: [
    { type: "column", field: "class" },
    { type: "column", field: "section" },
    { type: "column", field: "item" },
    { type: "column", field: "sub_item" },
    {
      type: "case_agg",
      func: "sum",
      when: { field: "period_date", op: "=", value: ":p1" },
      then: { field: "value" },
      else: null,
      as: "value"
    },
    {
      type: "case_agg",
      func: "sum",
      when: { field: "period_date", op: "=", value: ":p2" },
      then: { field: "value" },
      else: null,
      as: "prev_period"
    },
    {
      type: "case_agg",
      func: "sum",
      when: { field: "period_date", op: "=", value: ":p3" },
      then: { field: "value" },
      else: null,
      as: "prev_year"
    }
  ],
  where: {
    op: "and",
    items: [
      { field: "period_date", op: "in", value: [":p1", ":p2", ":p3"] }
    ]
  },
  groupBy: ["class", "section", "item", "sub_item"],
  orderBy: [
    { field: "class", direction: "asc" },
    { field: "section", direction: "asc" },
    { field: "item", direction: "asc" },
    { field: "sub_item", direction: "asc" }
  ],
  params: {
    p1: "2025-08-01",
    p2: "2025-07-01",
    p3: "2024-08-01"
  },
  paramTypes: {
    p1: "date",
    p2: "date",
    p3: "date"
  }
};

async function testAssetsTableQuery() {
  try {
    console.log("=== SQL Builder для assets_table ===\n");
    
    // Выводим входной конфиг
    console.log("📥 Входной JSON конфиг:");
    console.log(JSON.stringify(jsonConfig, null, 2));
    console.log("\n");
    
    // Валидация перед построением
    console.log("🔍 Валидация конфига...");
    const { validateConfig } = await import("../services/queryBuilder/validator.js");
    try {
      validateConfig(jsonConfig);
      console.log("✅ Валидация пройдена\n");
    } catch (validationError: any) {
      console.error("❌ Ошибка валидации:", validationError.message);
      console.error("Stack:", validationError.stack);
      throw validationError;
    }
    
    // Строим SQL через builder
    // API: buildQuery(config, params, wrapJson?)
    const sql = buildQuery(jsonConfig, jsonConfig.params);
    
    const result = {
      sql,
      params: [
        jsonConfig.params.p1,
        jsonConfig.params.p2,
        jsonConfig.params.p3
      ]
    };
    
    console.log("📤 Результат SQL Builder:");
    console.log("---");
    console.log("SQL:");
    console.log(result.sql);
    console.log("\nПараметры (в порядке использования):");
    console.log(JSON.stringify(result.params, null, 2));
    console.log("---\n");
    
    // Форматированный вывод SQL
    console.log("📋 Форматированный SQL:");
    const formattedSQL = result.sql
      .replace(/SELECT /g, "SELECT\n  ")
      .replace(/FROM /g, "\nFROM ")
      .replace(/WHERE /g, "\nWHERE ")
      .replace(/GROUP BY /g, "\nGROUP BY ")
      .replace(/ORDER BY /g, "\nORDER BY ")
      .replace(/,/g, ",\n  ");
    console.log(formattedSQL);
    console.log("\n");
    
    console.log("✅ Тест завершен успешно!");
    
    return result;
    
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

testAssetsTableQuery();
