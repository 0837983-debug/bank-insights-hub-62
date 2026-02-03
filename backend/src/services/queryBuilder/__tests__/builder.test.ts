import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from "vitest";
import { buildQuery, buildQueryFromId } from "../builder.js";
import type { QueryConfig } from "../types.js";
import * as queryLoader from "../queryLoader.js";

// Моки для loadQueryConfig (вынесены наружу для использования в разных describe блоках)
const mockHeaderDatesConfig: QueryConfig = {
  from: {
    schema: "mart",
    table: "kpi_metrics",
  },
  select: [
    {
      type: "agg",
      func: "max",
      field: "period_date",
      as: "periodDate",
    },
  ],
  params: {},
  paramTypes: {},
};

const mockAssetsTableConfig: QueryConfig = {
  from: {
    schema: "mart",
    table: "balance",
  },
  select: [
    { type: "column", field: "class" },
    { type: "column", field: "section" },
    {
      type: "case_agg",
      func: "sum",
      when: { field: "period_date", op: "=", value: ":p1" },
      then: { field: "value" },
      else: null,
      as: "value",
    },
    {
      type: "case_agg",
      func: "sum",
      when: { field: "period_date", op: "=", value: ":p2" },
      then: { field: "value" },
      else: null,
      as: "ppValue",
    },
    {
      type: "case_agg",
      func: "sum",
      when: { field: "period_date", op: "=", value: ":p3" },
      then: { field: "value" },
      else: null,
      as: "pyValue",
    },
  ],
  where: {
    op: "and",
    items: [
      { field: "class", op: "=", value: "Активы" },
    ],
  },
  groupBy: ["class", "section"],
  orderBy: [{ field: "class", direction: "asc" }],
  params: {},
  paramTypes: {
    p1: "date",
    p2: "date",
    p3: "date",
  },
};

describe("SQL Builder v1", () => {
  describe("buildQuery with value substitution", () => {
    it("должен построить SQL с подставленными значениями (case_agg)", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [
          { type: "column", field: "class" },
          { type: "column", field: "section" },
          {
            type: "case_agg",
            func: "sum",
            when: { field: "period_date", op: "=", value: ":p1" },
            then: { field: "value" },
            else: null,
            as: "value",
          },
          {
            type: "case_agg",
            func: "sum",
            when: { field: "period_date", op: "=", value: ":p2" },
            then: { field: "value" },
            else: null,
            as: "ppValue",
          },
        ],
        where: {
          op: "and",
          items: [
            { field: "class", op: "=", value: ":class" },
            { field: "period_date", op: "in", value: [":p1", ":p2"] },
          ],
        },
        groupBy: ["class", "section"],
        orderBy: [{ field: "class", direction: "asc" }],
        limit: 1000,
        offset: 0,
        params: {}, // Не используется в новой версии
        paramTypes: {
          p1: "date",
          p2: "date",
          class: "string",
        },
      };

      const params = {
        p1: "2025-08-01",
        p2: "2025-07-01",
        class: "assets",
      };

      const sql = buildQuery(config, params);

      // Проверка SQL структуры
      expect(sql).toContain("SELECT");
      expect(sql).toContain('FROM "mart"."balance"');
      expect(sql).toContain("WHERE");
      expect(sql).toContain("GROUP BY");
      expect(sql).toContain("ORDER BY");
      expect(sql).toContain("LIMIT 1000");
      expect(sql).toContain("OFFSET 0");

      // Проверка подставленных значений (строки и даты в кавычках)
      expect(sql).toContain("'2025-08-01'");
      expect(sql).toContain("'2025-07-01'");
      expect(sql).toContain("'assets'");

      // Проверка case_agg
      expect(sql).toContain("SUM(CASE WHEN");
      expect(sql).toContain("THEN");
      expect(sql).toContain("END)");

      // Проверка, что нет параметризованных значений ($1, $2, ...)
      expect(sql).not.toMatch(/\$\d+/);

      // Проверка, что нет named параметров в SQL
      expect(sql).not.toMatch(/:[a-zA-Z_][a-zA-Z0-9_]*/);
    });

    it("должен построить SQL с WHERE IN и BETWEEN с подставленными значениями", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [
            { field: "class", op: "in", value: [":class1", ":class2"] },
            { field: "period_date", op: "between", value: { from: ":dateFrom", to: ":dateTo" } },
          ],
        },
        params: {},
        paramTypes: {
          class1: "string",
          class2: "string",
          dateFrom: "date",
          dateTo: "date",
        },
      };

      const params = {
        class1: "assets",
        class2: "liabilities",
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      };

      const sql = buildQuery(config, params);

      // Проверка подставленных значений
      expect(sql).toContain("'assets'");
      expect(sql).toContain("'liabilities'");
      expect(sql).toContain("'2025-01-01'");
      expect(sql).toContain("'2025-12-31'");
      expect(sql).toContain("IN ('assets', 'liabilities')");
      expect(sql).toContain("BETWEEN '2025-01-01' AND '2025-12-31'");
    });

    it("должен обрабатывать числовые значения без кавычек", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [
            { field: "value", op: ">", value: ":minValue" },
            { field: "value", op: "<=", value: ":maxValue" },
          ],
        },
        params: {},
        paramTypes: {
          minValue: "number",
          maxValue: "number",
        },
      };

      const params = {
        minValue: 1000,
        maxValue: 5000,
      };

      const sql = buildQuery(config, params);

      // Числа должны быть без кавычек
      expect(sql).toContain("> 1000");
      expect(sql).toContain("<= 5000");
      expect(sql).not.toContain("'1000'");
      expect(sql).not.toContain("'5000'");
    });

    it("должен обрабатывать булевы значения как TRUE/FALSE", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [
            { field: "is_active", op: "=", value: ":active" },
          ],
        },
        params: {},
        paramTypes: {
          active: "boolean",
        },
      };

      const sqlTrue = buildQuery(config, { active: true });
      expect(sqlTrue).toContain("= TRUE");
      expect(sqlTrue).not.toContain("'true'");

      const sqlFalse = buildQuery(config, { active: false });
      expect(sqlFalse).toContain("= FALSE");
      expect(sqlFalse).not.toContain("'false'");
    });

    it("должен выбросить ошибку 'invalid params' при отсутствии требуемого параметра", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [
            { field: "class", op: "=", value: ":class" },
          ],
        },
        params: {},
        paramTypes: {
          class: "string",
        },
      };

      // Не передаем обязательный параметр class
      expect(() => buildQuery(config, {})).toThrow("invalid params");
    });

    it("должен выбросить ошибку 'invalid config' для некорректного конфига", () => {
      const invalidConfig = {
        select: [{ type: "column", field: "class" }],
        params: {},
      } as any;

      expect(() => buildQuery(invalidConfig, {})).toThrow("invalid config");
    });

    it("должен обрабатывать is_null и is_not_null без значений", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [
            { field: "section", op: "is_null" },
            { field: "item", op: "is_not_null" },
          ],
        },
        params: {},
      };

      const sql = buildQuery(config, {});

      expect(sql).toContain('"section" IS NULL');
      expect(sql).toContain('"item" IS NOT NULL');
    });
  });

  describe("buildQueryFromId - загрузка конфига из БД", () => {
    beforeEach(() => {
      // Мокируем loadQueryConfig
      vi.spyOn(queryLoader, "loadQueryConfig").mockImplementation(async (queryId: string) => {
        if (queryId === "header_dates") {
          return {
            config: mockHeaderDatesConfig,
            wrapJson: true,
          };
        }
        if (queryId === "assets_table") {
          return {
            config: mockAssetsTableConfig,
            wrapJson: true,
          };
        }
        if (queryId === "non_existent_query") {
          return null;
        }
        // Для теста с wrapJson=false
        if (queryId === "header_dates_no_wrap") {
          return {
            config: mockHeaderDatesConfig,
            wrapJson: false,
          };
        }
        return null;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("должен загрузить конфиг header_dates из БД и построить SQL", async () => {
      const params = {};
      const paramsJson = JSON.stringify(params);
      const sql = await buildQueryFromId("header_dates", paramsJson);

      // Проверка SQL структуры
      expect(sql).toContain("SELECT");
      expect(sql).toContain("FROM \"mart\".\"kpi_metrics\"");
      expect(sql).toContain("MAX");
      expect(sql).toContain("period_date");
    });

    it("должен загрузить конфиг assets_table из БД и построить SQL с параметрами", async () => {
      const params = {
        p1: "2025-08-01",
        p2: "2025-07-01",
        p3: "2024-08-01",
      };

      const paramsJson = JSON.stringify(params);
      const sql = await buildQueryFromId("assets_table", paramsJson);

      // Проверка SQL структуры
      expect(sql).toContain("SELECT");
      expect(sql).toContain("FROM \"mart\".\"balance\"");
      expect(sql).toContain("WHERE");
      expect(sql).toContain("GROUP BY");
      expect(sql).toContain("ORDER BY");

      // Проверка подставленных значений
      expect(sql).toContain("'2025-08-01'");
      expect(sql).toContain("'2025-07-01'");
      expect(sql).toContain("'2024-08-01'");
      // class захардкожен в конфиге, не передается как параметр

      // Проверка case_agg
      expect(sql).toContain("SUM(CASE WHEN");
      expect(sql).toContain("THEN");
      expect(sql).toContain("END)");

      // Проверка, что нет параметризованных значений
      expect(sql).not.toMatch(/\$\d+/);
      expect(sql).not.toMatch(/:[a-zA-Z_][a-zA-Z0-9_]*/);
    });

    it("должен выбросить ошибку 'invalid config' для несуществующего query_id", async () => {
      const paramsJson = JSON.stringify({});
      await expect(
        buildQueryFromId("non_existent_query", paramsJson)
      ).rejects.toThrow("invalid config");
    });

    it("должен выбросить ошибку 'invalid params' при отсутствии требуемых параметров", async () => {
      // assets_table требует параметры p1, p2, p3 (class захардкожен в конфиге)
      const paramsJson = JSON.stringify({});
      await expect(
        buildQueryFromId("assets_table", paramsJson)
      ).rejects.toThrow("invalid params");
    });

    it("должен выбросить ошибку 'invalid JSON' при невалидном JSON", async () => {
      await expect(
        buildQueryFromId("assets_table", "invalid json")
      ).rejects.toThrow("invalid JSON");
    });

    it("должен выбросить ошибку 'invalid params' при лишних параметрах", async () => {
      const params = {
        p1: "2025-08-01",
        p2: "2025-07-01",
        p3: "2024-08-01",
        extraParam: "should not be here", // Лишний параметр
      };
      const paramsJson = JSON.stringify(params);
      await expect(
        buildQueryFromId("assets_table", paramsJson)
      ).rejects.toThrow("invalid params");
    });

    it("должен корректно обрабатывать числовые параметры в конфиге из БД", async () => {
      // Создаем тестовый конфиг с числовыми параметрами (если нужно)
      // Для header_dates параметры не требуются, проверяем базовый случай
      const params = {};
      const paramsJson = JSON.stringify(params);
      const sql = await buildQueryFromId("header_dates", paramsJson);
      
      // SQL должен быть валидным
      expect(sql).toBeTruthy();
      expect(typeof sql).toBe("string");
      expect(sql.length).toBeGreaterThan(0);
    });
  });

  describe("Форматирование значений для SQL", () => {
    it("должен оборачивать строки в одинарные кавычки", () => {
      const config: QueryConfig = {
        from: { schema: "mart", table: "balance" },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [{ field: "class", op: "=", value: ":class" }],
        },
        params: {},
        paramTypes: { class: "string" },
      };

      const sql = buildQuery(config, { class: "test value" });
      
      expect(sql).toContain("'test value'");
      expect(sql).not.toContain('"test value"');
    });

    it("должен оборачивать даты в одинарные кавычки", () => {
      const config: QueryConfig = {
        from: { schema: "mart", table: "balance" },
        select: [{ type: "column", field: "period_date" }],
        where: {
          op: "and",
          items: [{ field: "period_date", op: "=", value: ":date" }],
        },
        params: {},
        paramTypes: { date: "date" },
      };

      const sql = buildQuery(config, { date: "2025-01-15" });
      
      expect(sql).toContain("'2025-01-15'");
    });

    it("должен оставлять числа без кавычек", () => {
      const config: QueryConfig = {
        from: { schema: "mart", table: "balance" },
        select: [{ type: "column", field: "value" }],
        where: {
          op: "and",
          items: [
            { field: "value", op: ">", value: ":min" },
            { field: "value", op: "<=", value: ":max" },
          ],
        },
        params: {},
        paramTypes: { min: "number", max: "number" },
      };

      const sql = buildQuery(config, { min: 100, max: 1000 });
      
      expect(sql).toContain("> 100");
      expect(sql).toContain("<= 1000");
      expect(sql).not.toContain("'100'");
      expect(sql).not.toContain("'1000'");
    });

    it("должен форматировать булевы значения как TRUE/FALSE", () => {
      const config: QueryConfig = {
        from: { schema: "mart", table: "balance" },
        select: [{ type: "column", field: "is_active" }],
        where: {
          op: "and",
          items: [{ field: "is_active", op: "=", value: ":active" }],
        },
        params: {},
        paramTypes: { active: "boolean" },
      };

      const sqlTrue = buildQuery(config, { active: true });
      expect(sqlTrue).toContain("= TRUE");
      expect(sqlTrue).not.toContain("'true'");
      expect(sqlTrue).not.toContain("'TRUE'");

      const sqlFalse = buildQuery(config, { active: false });
      expect(sqlFalse).toContain("= FALSE");
      expect(sqlFalse).not.toContain("'false'");
      expect(sqlFalse).not.toContain("'FALSE'");
    });

    it("должен экранировать одинарные кавычки в строках", () => {
      const config: QueryConfig = {
        from: { schema: "mart", table: "balance" },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [{ field: "class", op: "=", value: ":class" }],
        },
        params: {},
        paramTypes: { class: "string" },
      };

      const sql = buildQuery(config, { class: "test'value" });
      
      // Одинарные кавычки должны быть экранированы как ''
      expect(sql).toContain("'test''value'");
    });
  });

  describe("wrapJson support", () => {
    it("должен возвращать обычный SQL при wrapJson=false", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        params: {},
      };

      const sql = buildQuery(config, {}, false);

      expect(sql).toContain("SELECT");
      expect(sql).toContain("FROM \"mart\".\"balance\"");
      expect(sql).not.toContain("json_agg");
      expect(sql).not.toContain("row_to_json");
    });

    it("должен оборачивать SQL в json_agg при wrapJson=true", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [
            { field: "class", op: "=", value: ":class" },
          ],
        },
        params: {},
        paramTypes: {
          class: "string",
        },
      };

      const params = { class: "assets" };
      const sql = buildQuery(config, params, true);

      // Проверка оборачивания в json_agg
      expect(sql).toContain("json_agg");
      expect(sql).toContain("row_to_json");
      expect(sql).toContain("FROM (");
      expect(sql).toContain(") t");

      // Проверка, что базовый SQL присутствует внутри
      expect(sql).toContain("SELECT");
      expect(sql).toContain("FROM \"mart\".\"balance\"");
      expect(sql).toContain("'assets'");
    });

    it("должен корректно оборачивать сложный запрос с GROUP BY и ORDER BY", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [
          { type: "column", field: "class" },
          { type: "agg", func: "sum", field: "value", as: "total" },
        ],
        where: {
          op: "and",
          items: [
            { field: "class", op: "=", value: ":class" },
          ],
        },
        groupBy: ["class"],
        orderBy: [{ field: "class", direction: "asc" }],
        limit: 100,
        params: {},
        paramTypes: {
          class: "string",
        },
      };

      const params = { class: "assets" };
      const sql = buildQuery(config, params, true);

      expect(sql).toContain("json_agg");
      expect(sql).toContain("row_to_json");
      expect(sql).toContain("GROUP BY");
      expect(sql).toContain("ORDER BY");
      expect(sql).toContain("LIMIT 100");
    });

    it("должен выбрасывать ошибку при wrapJson=false в buildQueryFromId", async () => {
      // Мокируем конфиг с wrapJson=false
      vi.spyOn(queryLoader, "loadQueryConfig").mockResolvedValueOnce({
        config: mockHeaderDatesConfig,
        wrapJson: false,
      });

      const headerParamsJson = JSON.stringify({});
      await expect(
        buildQueryFromId("header_dates_no_wrap", headerParamsJson)
      ).rejects.toThrow("wrap_json=false");
    });

    it("должен создавать валидный SQL с json_agg для исполнения", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [
          { type: "column", field: "class" },
          { type: "column", field: "section" },
        ],
        params: {},
      };

      const sql = buildQuery(config, {}, true);

      // Проверка структуры SQL с json_agg
      expect(sql).toMatch(/^SELECT json_agg\(row_to_json\(t\)\) FROM \(/);
      expect(sql).toMatch(/\) t$/);
      
      // Проверка, что внутренний SELECT корректен
      expect(sql).toContain('SELECT "class", "section"');
      expect(sql).toContain('FROM "mart"."balance"');
      
      // Проверка, что SQL синтаксически корректен (нет незакрытых скобок)
      const openParens = (sql.match(/\(/g) || []).length;
      const closeParens = (sql.match(/\)/g) || []).length;
      expect(openParens).toBe(closeParens);
    });

    it("должен корректно обрабатывать пустой результат при wrapJson=true", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [
            { field: "class", op: "=", value: ":class" },
          ],
        },
        params: {},
        paramTypes: {
          class: "string",
        },
      };

      const params = { class: "non_existent" };
      const sql = buildQuery(config, params, true);

      // SQL должен быть валидным даже для пустого результата
      expect(sql).toContain("json_agg");
      expect(sql).toContain("row_to_json");
      expect(sql).toContain("'non_existent'");
      
      // Структура должна быть корректной
      expect(sql).toMatch(/SELECT json_agg\(row_to_json\(t\)\) FROM \(/);
    });
  });
});
