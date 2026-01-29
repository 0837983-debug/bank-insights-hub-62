import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loadQueryConfig } from "../queryLoader.js";
import { pool } from "../../../config/database.js";

describe("queryLoader", () => {
  beforeAll(async () => {
    // Проверяем подключение к БД
    const client = await pool.connect();
    client.release();
  });

  describe("loadQueryConfig", () => {
    it("должен загрузить конфиг для существующего query_id", async () => {
      const result = await loadQueryConfig("header_dates");

      expect(result).not.toBeNull();
      expect(result).toHaveProperty("config");
      expect(result).toHaveProperty("wrapJson");
      expect(result?.config).toHaveProperty("from");
      expect(typeof result?.wrapJson).toBe("boolean");
    });

    it("должен вернуть null для несуществующего query_id", async () => {
      const result = await loadQueryConfig("non_existent_query_id_12345");

      expect(result).toBeNull();
    });

    it("должен загрузить конфиг для assets_table", async () => {
      const result = await loadQueryConfig("assets_table");

      expect(result).not.toBeNull();
      expect(result?.config).toHaveProperty("from");
      expect(result?.config.from).toHaveProperty("schema");
      expect(result?.config.from).toHaveProperty("table");
    });

    it("должен вернуть правильное значение wrapJson", async () => {
      const result = await loadQueryConfig("assets_table");

      expect(result).not.toBeNull();
      // assets_table должен иметь wrapJson = true
      expect(result?.wrapJson).toBe(true);
    });

    it("должен вернуть null для неактивного query_id", async () => {
      // Сначала создаем неактивный query
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
          VALUES ('test_inactive', 'Test', '{"from": {"schema": "mart", "table": "balance"}}', true, false)
          ON CONFLICT (query_id) DO UPDATE SET is_active = false
        `);

        const result = await loadQueryConfig("test_inactive");
        expect(result).toBeNull();

        // Очистка
        await client.query(`DELETE FROM config.component_queries WHERE query_id = 'test_inactive'`);
      } finally {
        client.release();
      }
    });
  });
});
