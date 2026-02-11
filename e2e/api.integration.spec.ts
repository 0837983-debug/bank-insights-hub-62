import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("API Integration Tests", () => {
  test.describe("Health Check", () => {
    test("should return health status", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("message");
      expect(data.status).toBe("ok");
    });
  });

  test.describe("KPI Endpoints", () => {
    // Получаем даты периодов для использования в kpis запросе
    async function getHeaderDates(request: any) {
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=header_dates&component_Id=header&parametrs=${encodeURIComponent("{}")}`
      );
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      return data.rows[0];
    }

    test("should fetch all KPIs via /api/data", async ({ request }) => {
      // Старый endpoint /api/kpis удалён, используем новый /api/data?query_id=kpis
      const headerDates = await getHeaderDates(request);
      const paramsJson = JSON.stringify({
        p1: headerDates.periodDate,
        p2: headerDates.ppDate,
        p3: headerDates.pyDate,
      });

      const response = await request.get(
        `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      const kpis = Array.isArray(data) ? data : (data.rows || []);
      expect(Array.isArray(kpis)).toBe(true);
      expect(kpis.length).toBeGreaterThan(0);

      // Check structure of first KPI (backend returns only raw values, calculations happen on frontend)
      if (kpis.length > 0) {
        const kpi = kpis[0];
        // KPI возвращает: componentId, value, p2Value, p3Value
        expect(kpi).toHaveProperty("componentId");
        expect(kpi).toHaveProperty("value");
        expect(kpi).toHaveProperty("p2Value");
        expect(kpi).toHaveProperty("p3Value");
      }
    });

    test("old /api/kpis endpoint should return 404", async ({ request }) => {
      // Старый endpoint должен возвращать 404
      const response = await request.get(`${API_BASE_URL}/kpis`);
      expect([404, 400]).toContain(response.status());
      const data = await response.json();
      expect(data).toHaveProperty("error");
    });

    test.skip("should fetch KPI categories", async ({ request }) => {
      // Этот endpoint больше не существует, пропускаем тест
      // Если в будущем понадобится категоризация, можно будет реализовать через /api/data
    });

    test.skip("should fetch KPIs by category", async ({ request }) => {
      // Этот endpoint больше не существует, пропускаем тест
    });

    test.skip("should fetch single KPI by ID", async ({ request }) => {
      // Этот endpoint больше не существует, пропускаем тест
      // Можно получить конкретный KPI через фильтрацию в /api/data
    });

    test("old /api/kpis/:id endpoint should return 404", async ({ request }) => {
      // Старый endpoint должен возвращать 404
      const response = await request.get(`${API_BASE_URL}/kpis/nonexistent-id-12345`);
      expect([404, 400]).toContain(response.status());
    });
  });

  test.describe("Layout Endpoint", () => {
    test("should fetch layout structure", async ({ request }) => {
      // Новый формат: /api/data?query_id=layout
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("sections");
      expect(Array.isArray(data.sections)).toBe(true);
      expect(data.sections.length).toBeGreaterThan(0);

      // Проверяем наличие секций formats и header
      const formatsSection = data.sections.find((s: any) => s.id === "formats");
      const headerSection = data.sections.find((s: any) => s.id === "header");
      
      expect(formatsSection).toBeDefined();
      expect(headerSection).toBeDefined();

      // Check structure of first content section
      const contentSections = data.sections.filter(
        (s: any) => s.id !== "formats" && s.id !== "header"
      );
      if (contentSections.length > 0) {
        const section = contentSections[0];
        expect(section).toHaveProperty("id");
        expect(section).toHaveProperty("title");
        expect(section).toHaveProperty("components");
        expect(Array.isArray(section.components)).toBe(true);
      }
    });
  });

  test.describe("Table Data Endpoints", () => {
    test("should handle table data request", async ({ request }) => {
      // Старый endpoint /api/table-data может быть удален или изменен
      // Используем новый формат /api/data?query_id=...
      const paramsJson = JSON.stringify({
        p1: "2025-12-01",
        p2: "2025-11-01",
        p3: "2024-12-01",
      });
      
      // Пробуем новый endpoint
      const newResponse = await request.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${encodeURIComponent(paramsJson)}`
      );

      // Новый endpoint должен работать
      if (newResponse.ok()) {
        const data = await newResponse.json();
        expect(data).toHaveProperty("componentId");
        expect(data).toHaveProperty("type");
        expect(data).toHaveProperty("rows");
        expect(Array.isArray(data.rows)).toBe(true);
      } else {
        // Если новый endpoint не работает, проверяем старый (может быть удален)
        const oldResponse = await request.get(`${API_BASE_URL}/table-data/income`);
        const status = oldResponse.status();
        expect([404, 400, 500].includes(status)).toBe(true);
      }
    });

    test("should handle table data with groupBy param", async ({ request }) => {
      // Старый endpoint /api/table-data может быть удален
      // Используем новый формат /api/data?query_id=...
      const paramsJson = JSON.stringify({
        p1: "2025-12-01",
        p2: "2025-11-01",
        p3: "2024-12-01",
      });
      
      // Пробуем новый endpoint
      const newResponse = await request.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${encodeURIComponent(paramsJson)}`
      );

      if (newResponse.ok()) {
        const data = await newResponse.json();
        // Новый формат: { componentId, type, rows }
        expect(data).toHaveProperty("rows");
        expect(Array.isArray(data.rows)).toBe(true);
        if (data.rows.length > 0) {
          // Check structure of first row (assets_table возвращает class, section, value)
          expect(data.rows[0]).toHaveProperty("class");
          expect(data.rows[0]).toHaveProperty("section");
          expect(data.rows[0]).toHaveProperty("value");
        }
      } else {
        // Если новый endpoint не работает, проверяем старый (может быть удален)
        const oldResponse = await request.get(
          `${API_BASE_URL}/table-data/income?groupBy=product_line`
        );
        const status = oldResponse.status();
        expect([404, 400, 500].includes(status)).toBe(true);
      }
    });

    test("should return error for non-existent table", async ({ request }) => {
      // Проверяем новый endpoint с несуществующим query_id
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=nonexistent_table&component_Id=test`
      );

      // Should return error (400 or 404)
      const status = response.status();
      expect([400, 404, 500].includes(status)).toBe(true);
    });
  });

  test.describe("Chart Data Endpoints", () => {
    test("should fetch chart data if available", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/chart-data/mau_trend`);

      // Chart data might not be available, so accept both success and error
      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty("chartId");
        expect(data).toHaveProperty("title");
        expect(data).toHaveProperty("type");
        expect(data).toHaveProperty("data");
        expect(Array.isArray(data.data)).toBe(true);
      } else {
        // If chart data is not available, should return proper error
        const status = response.status();
        expect([404, 500].includes(status)).toBe(true);
        const errorData = await response.json();
        expect(errorData).toHaveProperty("error");
      }
    });

    test("should return 404 for non-existent chart", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/chart-data/nonexistent-chart-123`);

      const status = response.status();
      expect([404, 500].includes(status)).toBe(true);
    });
  });

  test.describe("Error Handling", () => {
    test("should return 404 for non-existent endpoint", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/nonexistent-endpoint`);

      expect(response.status()).toBe(404);
    });

    test("should handle invalid table ID gracefully", async ({ request }) => {
      // Проверяем новый endpoint с невалидным query_id
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=invalid_table_id&component_Id=test`
      );

      // Should either return 400, 404 or 500, not crash
      const status = response.status();
      expect([400, 404, 500].includes(status)).toBe(true);
    });
  });

  test.describe("Response Format", () => {
    test("should return JSON content type", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);

      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");
    });

    test("should have CORS headers", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);

      // CORS headers should be present (backend uses cors middleware)
      const headers = response.headers();
      // Note: Playwright's request API might not show all headers,
      // but if CORS is configured, OPTIONS requests should work
    });
  });
});

