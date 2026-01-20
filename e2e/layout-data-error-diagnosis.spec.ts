import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("Layout Data Endpoint - Error Diagnosis", () => {
  test.describe("Проверка ошибок 500", () => {
    test("should return 400 (not 500) when parametrs is empty object", async ({ request }) => {
      // Пустой объект {} - должен вернуть 400, а не 500
      const paramsJson = JSON.stringify({});
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );

      // Должен вернуть 400, а не 500
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("error");
      expect(error.error).toContain("layout_id");
    });

    test("should return 200 when parametrs contains layout_id", async ({ request }) => {
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty("sections");
    });

    test("should handle missing parametrs parameter", async ({ request }) => {
      // Без parametrs вообще
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout`
      );

      // Может вернуть 200 (если layout_id опционален) или 400
      expect([200, 400]).toContain(response.status());
    });
  });

  test.describe("Проверка структуры ответа", () => {
    test("should return sections array in correct format", async ({ request }) => {
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // Проверяем структуру
      expect(data).toHaveProperty("sections");
      expect(Array.isArray(data.sections)).toBe(true);
      expect(data.sections.length).toBeGreaterThan(0);
      
      // Проверяем наличие секций formats и header
      const formatsSection = data.sections.find((s: any) => s.id === "formats");
      const headerSection = data.sections.find((s: any) => s.id === "header");
      
      expect(formatsSection).toBeDefined();
      expect(headerSection).toBeDefined();
    });
  });

  test.describe("Проверка Frontend запросов", () => {
    test("should check what Frontend sends to /api/data", async ({ page }) => {
      // Перехватываем все запросы
      const requests: any[] = [];
      
      page.on("request", (request) => {
        if (request.url().includes("/api/data") && request.url().includes("query_id=layout")) {
          requests.push({
            url: request.url(),
            method: request.method(),
          });
        }
      });

      // Переходим на страницу
      await page.goto("http://localhost:8080/");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Проверяем запросы
      if (requests.length > 0) {
        const layoutRequest = requests[0];
        const url = new URL(layoutRequest.url);
        
        // Проверяем параметры
        const queryId = url.searchParams.get("query_id");
        const componentId = url.searchParams.get("component_Id");
        const parametrs = url.searchParams.get("parametrs");
        
        console.log("Frontend request params:", {
          query_id: queryId,
          component_Id: componentId,
          parametrs: parametrs,
        });
        
        // Проверяем, что parametrs содержит layout_id
        if (parametrs) {
          try {
            const params = JSON.parse(decodeURIComponent(parametrs));
            expect(params).toHaveProperty("layout_id");
            expect(params.layout_id).toBe("main_dashboard");
          } catch (e) {
            // Если не удалось распарсить, это ошибка
            throw new Error(`Failed to parse parametrs: ${parametrs}`);
          }
        } else {
          // Если parametrs отсутствует, это может быть проблемой
          console.warn("⚠️ parametrs отсутствует в запросе");
        }
      } else {
        console.warn("⚠️ Запросы к /api/data?query_id=layout не обнаружены");
      }
    });

    test("should check console errors in browser", async ({ page }) => {
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        } else if (msg.type() === "warning") {
          consoleWarnings.push(msg.text());
        }
      });

      await page.goto("http://localhost:8080/");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Фильтруем критичные ошибки (исключаем favicon, React Router warnings)
      const criticalErrors = consoleErrors.filter(
        (error) =>
          !error.includes("favicon") &&
          !error.includes("React Router Future Flag") &&
          error.includes("500") // Ошибки 500
      );

      if (criticalErrors.length > 0) {
        console.log("Critical errors found:", criticalErrors);
        
        // Проверяем, что ошибки связаны с layout
        const layoutErrors = criticalErrors.filter((error) =>
          error.includes("layout") || error.includes("/api/data")
        );
        
        if (layoutErrors.length > 0) {
          throw new Error(`Layout errors found: ${layoutErrors.join(", ")}`);
        }
      }
    });
  });
});
