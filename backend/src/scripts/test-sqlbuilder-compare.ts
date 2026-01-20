/**
 * Создание JSON конфига для SQL запроса и сравнение результата с исходным
 */

import { buildQuery } from "../services/queryBuilder/index.js";
import type { QueryConfig } from "../services/queryBuilder/types.js";

// Исходный SQL запрос для сравнения
const originalSQL = `SELECT
  SUM(CASE WHEN period_date = $1 THEN value END) AS value,
  SUM(CASE WHEN period_date = $2 THEN value END) AS prev_period,
  SUM(CASE WHEN period_date = $3 THEN value END) AS prev_year,
  class,
  section,
  item,
  sub_item
FROM mart.balance
WHERE class = 'assets'
  AND period_date IN ($1, $2, $3)
GROUP BY class, section, item, sub_item
ORDER BY class, section, item, sub_item;`;

// JSON конфиг, соответствующий исходному SQL
const jsonConfig: QueryConfig = {
  from: {
    schema: "mart",
    table: "balance"
  },
  select: [
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
    },
    { type: "column", field: "class" },
    { type: "column", field: "section" },
    { type: "column", field: "item" },
    { type: "column", field: "sub_item" }
  ],
  where: {
    op: "and",
    items: [
      { field: "class", op: "=", value: ":class" },
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
    p1: "2025-08-01",  // Текущий период
    p2: "2025-07-01",  // Предыдущий период
    p3: "2024-08-01",  // Прошлый год
    class: "assets"
  },
  paramTypes: {
    p1: "date",
    p2: "date",
    p3: "date",
    class: "string"
  }
};

function normalizeSQL(sql: string): string {
  // Убираем экранирование кавычек, множественные пробелы, переносы строк
  return sql
    .replace(/"/g, '')  // Убираем кавычки
    .replace(/\s+/g, ' ')  // Множественные пробелы в один
    .replace(/\s*,\s*/g, ', ')  // Нормализуем запятые
    .replace(/\s*=\s*/g, ' = ')  // Нормализуем равно
    .replace(/\s*IN\s*\(/gi, ' IN (')  // Нормализуем IN
    .replace(/\s*THEN\s*/gi, ' THEN ')  // Нормализуем THEN
    .replace(/\s*END\s*/gi, ' END ')  // Нормализуем END
    .replace(/\s*AS\s*/gi, ' AS ')  // Нормализуем AS
    .replace(/\s*GROUP BY\s*/gi, ' GROUP BY ')  // Нормализуем GROUP BY
    .replace(/\s*ORDER BY\s*/gi, ' ORDER BY ')  // Нормализуем ORDER BY
    .trim()
    .toUpperCase();
}

function compareSQL(sql1: string, sql2: string): { match: boolean; differences: string[] } {
  const normalized1 = normalizeSQL(sql1);
  const normalized2 = normalizeSQL(sql2);
  
  const differences: string[] = [];
  
  if (normalized1 !== normalized2) {
    differences.push("SQL запросы различаются");
    
    // Поиск различий по частям
    const parts1 = normalized1.split(/\s+(SELECT|FROM|WHERE|GROUP BY|ORDER BY)/i);
    const parts2 = normalized2.split(/\s+(SELECT|FROM|WHERE|GROUP BY|ORDER BY)/i);
    
    if (parts1.length !== parts2.length) {
      differences.push(`Разное количество частей: ${parts1.length} vs ${parts2.length}`);
    }
  }
  
  return {
    match: normalized1 === normalized2,
    differences
  };
}

async function testAndCompare() {
  try {
    console.log("=== Тестирование SQL Builder с сравнением ===\n");
    
    // Выводим исходный SQL
    console.log("📋 Исходный SQL запрос:");
    console.log(originalSQL);
    console.log("\n");
    
    // Выводим JSON конфиг
    console.log("📥 JSON конфиг:");
    console.log(JSON.stringify(jsonConfig, null, 2));
    console.log("\n");
    
    // Строим SQL через builder
    const result = buildQuery(jsonConfig);
    
    console.log("📤 Результат SQL Builder:");
    console.log("---");
    console.log("SQL:");
    console.log(result.sql);
    console.log("\nПараметры (в порядке использования):");
    console.log(JSON.stringify(result.params, null, 2));
    console.log("---\n");
    
    // Форматированный вывод
    console.log("📋 Форматированный SQL (результат builder):");
    const formattedSQL = result.sql
      .replace(/SELECT /g, "SELECT\n  ")
      .replace(/FROM /g, "\nFROM ")
      .replace(/WHERE /g, "\nWHERE ")
      .replace(/GROUP BY /g, "\nGROUP BY ")
      .replace(/ORDER BY /g, "\nORDER BY ")
      .replace(/,/g, ",\n  ");
    console.log(formattedSQL);
    console.log("\n");
    
    // Сравнение
    console.log("🔍 Сравнение:");
    console.log("---");
    
    // Для сравнения нужно подставить значения параметров в исходный SQL
    // Заменяем $1, $2, $3 на значения из params
    const originalSQLWithParams = originalSQL
      .replace(/\$1/g, `'${result.params[0]}'`)
      .replace(/\$2/g, `'${result.params[1]}'`)
      .replace(/\$3/g, `'${result.params[2]}'`)
      .replace(/class = 'assets'/g, `class = '${result.params[3] || "assets"}'`);
    
    console.log("Исходный SQL (с подставленными параметрами):");
    console.log(originalSQLWithParams);
    console.log("\n");
    
    const comparison = compareSQL(originalSQLWithParams, result.sql);
    
    if (comparison.match) {
      console.log("✅ SQL запросы СОВПАДАЮТ!");
    } else {
      console.log("⚠️ SQL запросы РАЗЛИЧАЮТСЯ:");
      comparison.differences.forEach(diff => console.log(`  - ${diff}`));
      
      console.log("\nДетальное сравнение:");
      console.log("\nИсходный (нормализованный):");
      console.log(normalizeSQL(originalSQLWithParams));
      console.log("\nРезультат builder (нормализованный):");
      console.log(normalizeSQL(result.sql));
    }
    
    console.log("\n");
    console.log("📊 Статистика:");
    console.log(`  - Количество параметров: ${result.params.length}`);
    console.log(`  - Длина SQL: ${result.sql.length} символов`);
    
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

testAndCompare();
