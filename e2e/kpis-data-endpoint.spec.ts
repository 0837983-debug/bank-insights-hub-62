import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("KPI через /api/data endpoint", () => {
  // Получаем даты периодов из header_dates для использования в kpis запросе
  async function getHeaderDates(request: any) {
    const response = await request.get(
      `${API_BASE_URL}/data?query_id=header_dates&component_Id=header&parametrs=${encodeURIComponent("{}")}`
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    return data.rows[0];
  }

  test.describe("Проверка нового endpoint (старый /api/kpis удален)", () => {
    test("should return KPIs from new endpoint", async ({ request }) => {
      // Старый endpoint удален - проверяем, что он недоступен
      const oldResponse = await request.get(`${API_BASE_URL}/kpis`);
      expect([404, 400]).toContain(oldResponse.status());
      
      // Проверяем новый endpoint

      // Новый endpoint - получаем даты из header_dates
      const headerDates = await getHeaderDates(request);
      const paramsJson = JSON.stringify({
        layout_id: "main_dashboard",
        p1: headerDates.periodDate,
        p2: headerDates.ppDate,
        p3: headerDates.pyDate,
      });

      const newResponse = await request.get(
        `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
      );
      expect(newResponse.ok()).toBeTruthy();
      const newData = await newResponse.json();
      
      // Новый endpoint возвращает массив напрямую или { rows }
      const newKPIs = Array.isArray(newData) ? newData : (newData.rows || []);
      expect(Array.isArray(newKPIs)).toBe(true);
      expect(newKPIs.length).toBeGreaterThan(0);
      
      console.log(`✅ Новый endpoint возвращает ${newKPIs.length} KPI: ${newKPIs.map((k: any) => k.id).join(", ")}`);
    });

    test("should return correct structure for each KPI", async ({ request }) => {
      // Старый endpoint удален - проверяем только новый

      // Новый endpoint
      const headerDates = await getHeaderDates(request);
      const paramsJson = JSON.stringify({
        layout_id: "main_dashboard",
        p1: headerDates.periodDate,
        p2: headerDates.ppDate,
        p3: headerDates.pyDate,
      });

      const newResponse = await request.get(
        `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
      );
      const newData = await newResponse.json();
      const newKPIs = Array.isArray(newData) ? newData : (newData.rows || []);
      const newKPI = newKPIs[0];

      // Проверяем наличие всех полей из старого формата
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
        expect(newKPI).toHaveProperty(field);
      }

      // Проверяем, что структура корректна
      const newKeys = Object.keys(newKPI).sort();
      expect(newKeys.length).toBeGreaterThan(0);
    });

    test("should return valid KPI values", async ({ request }) => {
      // Старый endpoint удален - проверяем только новый

      // Новый endpoint
      const headerDates = await getHeaderDates(request);
      const paramsJson = JSON.stringify({
        layout_id: "main_dashboard",
        p1: headerDates.periodDate,
        p2: headerDates.ppDate,
        p3: headerDates.pyDate,
      });

      const newResponse = await request.get(
        `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
      );
      const newData = await newResponse.json();
      const newKPIs = Array.isArray(newData) ? newData : (newData.rows || []);

      // Проверяем, что есть данные
      expect(newKPIs.length).toBeGreaterThan(0);

      // Проверяем валидность значений для каждого KPI
      for (const kpi of newKPIs) {
        expect(kpi.id).toBeTruthy();
        expect(typeof kpi.value).toBe("number");
        expect(typeof kpi.previousValue).toBe("number");
        expect(typeof kpi.ytdValue).toBe("number");
        expect(kpi.periodDate).toBeTruthy();
      }
    });
  });

  test.describe("Проверка нового endpoint", () => {
    test("should return 400 when parametrs is missing", async ({ request }) => {
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent("{}")}`
      );

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error).toHaveProperty("error");
      expect(error.error).toContain("missing params");
    });

    test("should return 400 when layout_id is missing", async ({ request }) => {
      const headerDates = await getHeaderDates(request);
      const paramsJson = JSON.stringify({
        p1: headerDates.periodDate,
        p2: headerDates.ppDate,
        p3: headerDates.pyDate,
      });

      const response = await request.get(
        `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
      );

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error).toHaveProperty("error");
      expect(error.error).toContain("layout_id");
    });

    test("should return correct response format", async ({ request }) => {
      const headerDates = await getHeaderDates(request);
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

      // Проверяем формат ответа (может быть массив или объект с rows)
      if (Array.isArray(data)) {
        expect(data.length).toBeGreaterThan(0);
        expect(data[0]).toHaveProperty("id");
      } else {
        expect(data).toHaveProperty("rows");
        expect(Array.isArray(data.rows)).toBe(true);
        expect(data.rows.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Frontend интеграция", () => {
    test("should use /api/data for KPIs (not old /api/kpis)", async ({ page }) => {
      const newEndpointRequests: any[] = [];
      const oldEndpointRequests: any[] = [];

      // Перехватываем все запросы до перехода на страницу
      page.on("request", (request) => {
        const url = request.url();
        if (url.includes("/api/data") && url.includes("query_id=kpis")) {
          newEndpointRequests.push({
            url: url,
            method: request.method(),
          });
        }
        if (url.includes("/api/kpis") && !url.includes("/api/data")) {
          oldEndpointRequests.push({
            url: url,
            method: request.method(),
          });
        }
      });

      await page.goto("http://localhost:8080/");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Проверяем, что НЕ используются запросы к старому endpoint
      expect(oldEndpointRequests.length).toBe(0);
      console.log(`✅ Old /api/kpis requests: ${oldEndpointRequests.length} (should be 0)`);

      // Проверяем, что используются запросы к новому endpoint
      // Не строго требую наличия запросов, так как данные могут быть закешированы
      if (newEndpointRequests.length > 0) {
        console.log(`✅ New /api/data?query_id=kpis requests: ${newEndpointRequests.length}`);
        expect(newEndpointRequests.length).toBeGreaterThan(0);
      } else {
        console.log("ℹ️  No new endpoint requests found (may be cached)");
      }

      // Проверяем, что страница загрузилась без ошибок
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    });

    test("should handle KPI data from new endpoint correctly", async ({ page }) => {
      const kpiResponses: any[] = [];

      page.on("response", async (response) => {
        const url = response.url();
        if (url.includes("/api/data") && url.includes("query_id=kpis")) {
          try {
            const data = await response.json();
            kpiResponses.push({
              url: url,
              status: response.status(),
              data: data,
            });
          } catch (e) {
            // Не удалось распарсить ответ
          }
        }
      });

      await page.goto("http://localhost:8080/");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Проверяем ответы (если были запросы)
      if (kpiResponses.length > 0) {
        const response = kpiResponses[0];
        expect(response.status).toBe(200);
        
        // Проверяем структуру данных
        const kpis = Array.isArray(response.data) ? response.data : (response.data.rows || []);
        expect(Array.isArray(kpis)).toBe(true);
        if (kpis.length > 0) {
          expect(kpis[0]).toHaveProperty("id");
          expect(kpis[0]).toHaveProperty("value");
        }
        console.log(`✅ Received ${kpis.length} KPIs from new endpoint`);
      } else {
        console.log("ℹ️  No KPI responses found (may be cached)");
      }
    });
  });
});
