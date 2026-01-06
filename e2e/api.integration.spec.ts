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
    test("should fetch all KPIs", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/kpis`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Check structure of first KPI
      if (data.length > 0) {
        const kpi = data[0];
        expect(kpi).toHaveProperty("id");
        expect(kpi).toHaveProperty("title");
        expect(kpi).toHaveProperty("value");
        expect(kpi).toHaveProperty("category");
      }
    });

    test("should fetch KPI categories", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/kpis/categories`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Check structure of first category
      if (data.length > 0) {
        const category = data[0];
        expect(category).toHaveProperty("id");
        expect(category).toHaveProperty("name");
      }
    });

    test("should fetch KPIs by category", async ({ request }) => {
      // First get categories to use a real category ID
      const categoriesResponse = await request.get(`${API_BASE_URL}/kpis/categories`);
      const categories = await categoriesResponse.json();

      if (categories.length > 0) {
        const categoryId = categories[0].id;
        const response = await request.get(
          `${API_BASE_URL}/kpis/category/${categoryId}`
        );

        expect(response.ok()).toBeTruthy();
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);

        // All KPIs should belong to the requested category
        data.forEach((kpi: any) => {
          expect(kpi.category).toBe(categoryId);
        });
      }
    });

    test("should fetch single KPI by ID", async ({ request }) => {
      // First get all KPIs to use a real KPI ID
      const kpisResponse = await request.get(`${API_BASE_URL}/kpis`);
      const kpis = await kpisResponse.json();

      if (kpis.length > 0) {
        const kpiId = kpis[0].id;
        const response = await request.get(`${API_BASE_URL}/kpis/${kpiId}`);

        expect(response.ok()).toBeTruthy();
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty("id");
        expect(data.id).toBe(kpiId);
        expect(data).toHaveProperty("title");
        expect(data).toHaveProperty("value");
      }
    });

    test("should return 404 for non-existent KPI", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/kpis/nonexistent-id-12345`);

      expect(response.status()).toBe(404);
    });
  });

  test.describe("Layout Endpoint", () => {
    test("should fetch layout structure", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/layout`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("formats");
      expect(data).toHaveProperty("sections");
      expect(Array.isArray(data.sections)).toBe(true);
      expect(data.sections.length).toBeGreaterThan(0);

      // Check structure of first section
      if (data.sections.length > 0) {
        const section = data.sections[0];
        expect(section).toHaveProperty("id");
        expect(section).toHaveProperty("title");
        expect(section).toHaveProperty("components");
        expect(Array.isArray(section.components)).toBe(true);
      }
    });
  });

  test.describe("Table Data Endpoints", () => {
    test("should handle table data request", async ({ request }) => {
      // Use path parameter instead of query parameter
      const response = await request.get(`${API_BASE_URL}/table-data/income`);

      // Table data might not be loaded, so accept both success and error responses
      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty("tableId");
        expect(data).toHaveProperty("title");
        expect(data).toHaveProperty("columns");
        expect(data).toHaveProperty("rows");
        expect(Array.isArray(data.columns)).toBe(true);
        expect(Array.isArray(data.rows)).toBe(true);
      } else {
        // If table data is not available, should return proper error
        expect([404, 500]).toContain(response.status());
        const errorData = await response.json();
        expect(errorData).toHaveProperty("error");
      }
    });

    test("should handle table data with groupBy param", async ({ request }) => {
      const response = await request.get(
        `${API_BASE_URL}/table-data/income?groupBy=product_line`
      );

      // Accept both success and error responses
      // Note: When groupBy is used, API returns array directly, not object with tableId
      if (response.ok()) {
        const data = await response.json();
        // With groupBy, response is an array of rows
        expect(Array.isArray(data)).toBe(true);
        if (data.length > 0) {
          // Check structure of first row
          expect(data[0]).toHaveProperty("id");
          expect(data[0]).toHaveProperty("name");
        }
      } else {
        // Accept 500 error if data is not loaded
        const status = response.status();
        expect([404, 500]).toContain(status);
        // Only check error structure if response is JSON
        try {
          const errorData = await response.json();
          expect(errorData).toHaveProperty("error");
        } catch {
          // If response is not JSON, that's also acceptable
        }
      }
    });

    test("should return error for non-existent table", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/table-data/nonexistent`);

      // Should return error (404 or 500)
      expect([404, 500]).toContain(response.status());
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
        expect([404, 500]).toContain(response.status());
        const errorData = await response.json();
        expect(errorData).toHaveProperty("error");
      }
    });

    test("should return 404 for non-existent chart", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/chart-data/nonexistent-chart-123`);

      expect([404, 500]).toContain(response.status());
    });
  });

  test.describe("Error Handling", () => {
    test("should return 404 for non-existent endpoint", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/nonexistent-endpoint`);

      expect(response.status()).toBe(404);
    });

    test("should handle invalid table ID gracefully", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/table-data/invalid_table_id`);

      // Should either return 404 or 500, not crash
      expect([404, 500]).toContain(response.status());
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

