import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("Удаление /api/kpis endpoint", () => {
  test("should return 404 for /api/kpis", async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/kpis`);
    
    // Должен вернуть 404 или error "Route not found"
    expect([404, 400]).toContain(response.status());
    
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toMatch(/Route not found|Not found|404/i);
  });

  test("should use /api/data?query_id=kpis instead", async ({ request }) => {
    // Получаем даты из header_dates
    const headerResponse = await request.get(
      `${API_BASE_URL}/data?query_id=header_dates&component_Id=header&parametrs=${encodeURIComponent("{}")}`
    );
    expect(headerResponse.ok()).toBeTruthy();
    const headerData = await headerResponse.json();
    const headerDates = headerData.rows[0];

    const paramsJson = JSON.stringify({
      layout_id: "main_dashboard",
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
    
    // Новый endpoint возвращает массив напрямую (не { componentId, type, rows })
    if (Array.isArray(data)) {
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("value");
    } else if (data.rows && Array.isArray(data.rows)) {
      expect(data.rows.length).toBeGreaterThan(0);
      expect(data.rows[0]).toHaveProperty("id");
      expect(data.rows[0]).toHaveProperty("value");
    } else {
      throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
    }
  });

  test("should return KPI data in correct format", async ({ request }) => {
    // Получаем даты из header_dates
    const headerResponse = await request.get(
      `${API_BASE_URL}/data?query_id=header_dates&component_Id=header&parametrs=${encodeURIComponent("{}")}`
    );
    const headerData = await headerResponse.json();
    const headerDates = headerData.rows[0];

    const paramsJson = JSON.stringify({
      layout_id: "main_dashboard",
      p1: headerDates.periodDate,
      p2: headerDates.ppDate,
      p3: headerDates.pyDate,
    });

    const response = await request.get(
      `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
    );

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Проверяем формат данных
    const kpis = Array.isArray(data) ? data : (data.rows || []);
    expect(kpis.length).toBeGreaterThan(0);
    
    // Проверяем структуру первого KPI
    const firstKPI = kpis[0];
    const requiredFields = [
      "id",
      "periodDate",
      "value",
      "previousValue",
      "ytdValue",
      "ppChange",
      "ppChangeAbsolute",
      "ytdChange",
      "ytdChangeAbsolute",
    ];

    for (const field of requiredFields) {
      expect(firstKPI).toHaveProperty(field);
    }
  });
});
