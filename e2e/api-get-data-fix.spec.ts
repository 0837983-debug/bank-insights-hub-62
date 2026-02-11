import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("GET /api/data - Fixed Format", () => {
  test.describe("New format response", () => {
    test("should return { componentId, type, rows } format", async ({ request }) => {
      const params = {
        p1: "2025-12-01",
        p2: "2025-11-01",
        p3: "2024-12-01",
      };

      const paramsStr = encodeURIComponent(JSON.stringify(params));
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${paramsStr}`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      
      // Проверка нового формата
      expect(data).toHaveProperty("componentId");
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("rows");
      
      expect(data.componentId).toBe("assets_table");
      expect(data.type).toBe("table");
      expect(Array.isArray(data.rows)).toBe(true);
    });

    test("should return rows array with correct structure", async ({ request }) => {
      const params = {
        p1: "2025-12-01",
        p2: "2025-11-01",
        p3: "2024-12-01",
      };

      const paramsStr = encodeURIComponent(JSON.stringify(params));
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${paramsStr}`
      );

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      const rows = data.rows;
      
      expect(Array.isArray(rows)).toBe(true);
      
      // Если есть данные, проверяем структуру первой строки
      if (rows.length > 0) {
        const firstRow = rows[0];
        // assets_table возвращает строки с class, section, item, value
        expect(firstRow).toHaveProperty("class");
        expect(firstRow).toHaveProperty("section");
        expect(firstRow).toHaveProperty("value");
      }
    });
  });

  test.describe("Error handling - wrapJson=false", () => {
    test.skip("should return 400 when wrapJson=false", async ({ request }) => {
      // header_dates теперь обрабатывается специально и не требует wrapJson=true
      // Этот тест устарел, так как header_dates использует getPeriodDates() напрямую
      test.skip();
    });
  });

  test.describe("POST endpoint removal", () => {
    test("should return 404 for POST /api/data", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "assets_table",
          params: {},
        },
      });

      expect(response.status()).toBe(404);
    });

    test("should return 404 for POST /api/data/ with body", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data/`, {
        data: {
          query_id: "assets_table",
          params: {
            p1: "2025-08-01",
            p2: "2025-07-01",
            p3: "2024-08-01",
            class: "assets",
          },
        },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe("Query parameters", () => {
    test("should accept component_Id as query parameter", async ({ request }) => {
      const params = {
        p1: "2025-12-01",
        p2: "2025-11-01",
        p3: "2024-12-01",
      };

      const paramsStr = encodeURIComponent(JSON.stringify(params));
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${paramsStr}`
      );

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.componentId).toBe("assets_table");
    });

    test("should parse date parameters correctly", async ({ request }) => {
      const params = {
        p1: "2025-12-01",
        p2: "2025-11-01",
        p3: "2024-12-01",
      };

      const paramsStr = encodeURIComponent(JSON.stringify(params));
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${paramsStr}`
      );

      expect(response.ok()).toBeTruthy();
      
      // Проверяем, что запрос прошел успешно с датами
      const data = await response.json();
      expect(data.rows).toBeDefined();
    });
  });

  test.describe("Response format validation", () => {
    test("should have correct Content-Type", async ({ request }) => {
      const params = {
        p1: "2025-12-01",
        p2: "2025-11-01",
        p3: "2024-12-01",
      };

      const paramsStr = encodeURIComponent(JSON.stringify(params));
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${paramsStr}`
      );

      expect(response.ok()).toBeTruthy();
      
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");
    });

    test("should return valid JSON structure", async ({ request }) => {
      const params = {
        p1: "2025-12-01",
        p2: "2025-11-01",
        p3: "2024-12-01",
      };

      const paramsStr = encodeURIComponent(JSON.stringify(params));
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${paramsStr}`
      );

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // Проверка обязательных полей
      expect(typeof data.componentId).toBe("string");
      expect(data.type).toBe("table");
      expect(Array.isArray(data.rows)).toBe(true);
    });
  });
});
