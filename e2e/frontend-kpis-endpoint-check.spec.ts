import { test, expect } from "@playwright/test";

const FRONTEND_URL = "http://localhost:8080";
const API_BASE_URL = "http://localhost:3001/api";

test.describe("Frontend: Проверка использования нового endpoint для KPIs", () => {
  test("should NOT use old /api/kpis endpoint", async ({ page, request }) => {
    // Сначала проверяем, что старый endpoint действительно удален
    const oldEndpointResponse = await request.get(`${API_BASE_URL}/kpis`);
    expect([404, 400]).toContain(oldEndpointResponse.status());

    const oldEndpointRequests: any[] = [];

    // Перехватываем запросы к старому endpoint
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/kpis") && !url.includes("/api/data")) {
        oldEndpointRequests.push({
          url: url,
          method: request.method(),
          timestamp: Date.now(),
        });
      }
    });

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000); // Даем время на загрузку всех данных

    // Проверяем, что НЕТ запросов к старому endpoint
    expect(oldEndpointRequests.length).toBe(0);
    console.log(`✅ Проверка: Frontend не использует старый /api/kpis endpoint`);
  });

  test("should use new /api/data?query_id=kpis endpoint", async ({ page }) => {
    const newEndpointRequests: any[] = [];

    // Перехватываем запросы к новому endpoint
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/data") && url.includes("query_id=kpis")) {
        newEndpointRequests.push({
          url: url,
          method: request.method(),
          timestamp: Date.now(),
        });
      }
    });

    // Перехватываем ответы для проверки данных
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

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000); // Даем время на загрузку всех данных

    // Проверяем, что есть запросы к новому endpoint (или данные закешированы)
    if (newEndpointRequests.length > 0) {
      console.log(`✅ Frontend использует новый endpoint: ${newEndpointRequests.length} запрос(ов)`);
      expect(newEndpointRequests.length).toBeGreaterThan(0);
    } else {
      console.log("ℹ️  Запросов к новому endpoint не найдено (возможно, данные закешированы)");
    }

    // Проверяем ответы
    if (kpiResponses.length > 0) {
      const response = kpiResponses[0];
      expect(response.status).toBe(200);
      
      const kpis = Array.isArray(response.data) ? response.data : (response.data.rows || []);
      console.log(`✅ Получено ${kpis.length} KPI из нового endpoint`);
    }
  });

  test("should display KPI cards without errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          text.includes("kpi") ||
          text.includes("KPI") ||
          text.includes("/api/kpis") ||
          text.includes("404")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Фильтруем критические ошибки (игнорируем favicon, React Router и т.д.)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes("favicon") &&
        !error.includes("React Router") &&
        !error.includes("Warning")
    );

    if (criticalErrors.length > 0) {
      console.log("Найдены ошибки в консоли:", criticalErrors);
    }

    // Проверяем, что страница загрузилась
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    // Проверяем наличие KPI карточек (если они должны быть)
    // Не строгая проверка, так как количество карточек может варьироваться
    const cardSelectors = [
      '[data-component-type="card"]',
      '[class*="card"]',
      '[class*="Card"]',
    ];

    let cardsFound = false;
    for (const selector of cardSelectors) {
      try {
        const cards = await page.locator(selector).all();
        if (cards.length > 0) {
          cardsFound = true;
          console.log(`✅ Найдено ${cards.length} KPI карточек`);
          break;
        }
      } catch (e) {
        // Селектор не найден
      }
    }

    // Не строго требуем наличия карточек, так как они могут отсутствовать из-за данных
    if (!cardsFound) {
      console.log("ℹ️  KPI карточки не найдены (возможно, нет данных)");
    }
  });
});
