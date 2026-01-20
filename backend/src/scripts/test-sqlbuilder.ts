/**
 * Тестовый скрипт для проверки работы SQL Builder
 */

import { buildQuery, validateConfig } from "../services/queryBuilder/index.js";
import type { QueryConfig } from "../services/queryBuilder/types.js";

// JSON конфиг из запроса пользователя
const jsonConfig = {
  "from": {
    "schema": "mart",
    "table": "balance"
  },
  "select": [
    { "type": "column", "field": "class" },
    {
      "type": "case_agg",
      "func": "sum",
      "when": { "field": "period_date", "op": "=", "value": ":p1" },
      "then": { "field": "value" },
      "else": null,
      "as": "value"
    }
  ],
  "where": {
    "op": "and",
    "items": [
      { "field": "class", "op": "=", "value": ":class" },
      { "field": "period_date", "op": "in", "value": [":p1", ":p2"] }
    ]
  },
  "groupBy": ["class"],
  "params": {
    "p1": "2025-08-01",
    "p2": "2025-07-01",
    "class": "assets"
  },
  "paramTypes": {
    "p1": "date",
    "p2": "date",
    "class": "string"
  }
};

async function testSQLBuilder() {
  try {
    console.log("=== Тестирование SQL Builder ===\n");
    
    // Выводим входной JSON
    console.log("📥 Входной JSON конфиг:");
    console.log(JSON.stringify(jsonConfig, null, 2));
    console.log("\n");
    
    // Валидация (если есть функция validateConfig)
    try {
      if (validateConfig) {
        validateConfig(jsonConfig as QueryConfig);
        console.log("✅ Валидация конфига: OK\n");
      }
    } catch (error: any) {
      console.error("❌ Ошибка валидации:", error.message);
      throw error;
    }
    
    // Построение SQL
    const result = buildQuery(jsonConfig as QueryConfig);
    
    // Выводим результат
    console.log("📤 Результат SQL Builder:");
    console.log("---");
    console.log("SQL:");
    console.log(result.sql);
    console.log("\nПараметры (в порядке использования):");
    console.log(JSON.stringify(result.params, null, 2));
    console.log("---\n");
    
    // Красивый вывод для удобства
    console.log("📋 Форматированный SQL:");
    const formattedSQL = result.sql
      .replace(/SELECT /g, "SELECT\n  ")
      .replace(/FROM /g, "\nFROM ")
      .replace(/WHERE /g, "\nWHERE ")
      .replace(/GROUP BY /g, "\nGROUP BY ")
      .replace(/ORDER BY /g, "\nORDER BY ")
      .replace(/LIMIT /g, "\nLIMIT ")
      .replace(/OFFSET /g, "\nOFFSET ")
      .replace(/,/g, ",\n  ");
    console.log(formattedSQL);
    console.log("\n");
    
    console.log("✅ Тест завершен успешно!");
    
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

testSQLBuilder();
