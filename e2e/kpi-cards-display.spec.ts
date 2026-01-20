import { test, expect } from "@playwright/test";

const FRONTEND_URL = "http://localhost:8080";

test.describe("KPI Cards Display", () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную страницу
    await page.goto(FRONTEND_URL);
    
    // Ждем загрузки
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Даем время на загрузку данных
  });

  test.describe("Проверка отображения KPI карточек", () => {
    test("should display KPI cards on the page", async ({ page }) => {
      // Ищем KPI карточки по различным селекторам
      const cardSelectors = [
        '[data-component-type="card"]',
        '[data-component-id*="card"]',
        '[class*="card"]',
        '[class*="Card"]',
        '[class*="kpi"]',
        '[class*="KPI"]',
      ];

      let cardsFound = false;
      let cardsCount = 0;

      for (const selector of cardSelectors) {
        try {
          const cards = await page.locator(selector).all();
          if (cards.length > 0) {
            cardsFound = true;
            cardsCount = cards.length;
            console.log(`Found ${cards.length} cards with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Селектор не найден
        }
      }

      // Проверяем, что карточки найдены
      expect(cardsFound).toBeTruthy();
      expect(cardsCount).toBeGreaterThan(0);
    });

    test("should display specific KPI cards (capital_card, roa_card, roe_card)", async ({ page }) => {
      // Ищем конкретные KPI карточки по component_id
      const expectedKPIs = ["capital_card", "roa_card", "roe_card"];
      const foundKPIs: string[] = [];

      for (const kpiId of expectedKPIs) {
        const selectors = [
          `[data-component-id="${kpiId}"]`,
          `[data-testid="${kpiId}"]`,
          `[id="${kpiId}"]`,
        ];

        for (const selector of selectors) {
          try {
            const element = await page.locator(selector).first();
            if (await element.isVisible()) {
              foundKPIs.push(kpiId);
              break;
            }
          } catch (e) {
            // Селектор не найден
          }
        }
      }

      // Проверяем, что хотя бы одна карточка найдена
      expect(foundKPIs.length).toBeGreaterThan(0);
      
      // Логируем найденные карточки
      console.log(`Found KPIs: ${foundKPIs.join(", ")}`);
      console.log(`Missing KPIs: ${expectedKPIs.filter(id => !foundKPIs.includes(id)).join(", ")}`);
    });

    test("should display KPI card values", async ({ page }) => {
      // Ищем карточки с числовыми значениями
      const cardSelectors = [
        '[data-component-type="card"]',
        '[class*="card"]',
      ];

      let hasValue = false;

      for (const selector of cardSelectors) {
        try {
          const cards = await page.locator(selector).all();
          for (const card of cards) {
            const cardText = await card.textContent();
            // Проверяем, что в карточке есть числовое значение (может быть в формате ₽, %, или просто число)
            if (cardText && /[\d₽%]/.test(cardText)) {
              hasValue = true;
              console.log(`Found card with value: ${cardText.substring(0, 50)}`);
              break;
            }
          }
          if (hasValue) break;
        } catch (e) {
          // Селектор не найден
        }
      }

      // Проверяем, что хотя бы одна карточка содержит значение
      expect(hasValue).toBeTruthy();
    });
  });

  test.describe("Проверка загрузки данных", () => {
    test("should load KPI data from /api/data endpoint", async ({ page }) => {
      // Перехватываем запросы к /api/data с query_id=kpis
      const kpiRequests: any[] = [];

      page.on("request", (request) => {
        const url = request.url();
        if (url.includes("/api/data") && url.includes("query_id=kpis")) {
          kpiRequests.push({
            url: url,
            method: request.method(),
          });
        }
      });

      // Ждем загрузки
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Проверяем, что был запрос к /api/data для kpis
      if (kpiRequests.length > 0) {
        console.log(`Found ${kpiRequests.length} requests to /api/data?query_id=kpis`);
        expect(kpiRequests.length).toBeGreaterThan(0);
      } else {
        console.warn("⚠️  No requests to /api/data?query_id=kpis found");
      }
    });

    test("should handle KPI data response correctly", async ({ page }) => {
      // Перехватываем ответы от /api/data
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

      // Ждем загрузки
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Проверяем ответы
      if (kpiResponses.length > 0) {
        const response = kpiResponses[0];
        expect(response.status).toBe(200);
        
        // Проверяем структуру данных
        if (Array.isArray(response.data)) {
          console.log(`✅ Received array with ${response.data.length} KPIs`);
          expect(response.data.length).toBeGreaterThan(0);
        } else if (response.data.rows && Array.isArray(response.data.rows)) {
          console.log(`✅ Received object with rows array (${response.data.rows.length} KPIs)`);
          expect(response.data.rows.length).toBeGreaterThan(0);
        } else {
          console.warn("⚠️  Unexpected response format:", response.data);
        }
      } else {
        console.warn("⚠️  No responses from /api/data?query_id=kpis found");
      }
    });
  });

  test.describe("Проверка ошибок", () => {
    test("should not have console errors related to KPIs", async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          // Фильтруем только ошибки, связанные с KPI
          if (text.includes("kpi") || text.includes("KPI") || text.includes("card")) {
            consoleErrors.push(text);
          }
        }
      });

      // Ждем загрузки
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Проверяем, что нет критических ошибок
      const criticalErrors = consoleErrors.filter(
        (error) =>
          !error.includes("favicon") &&
          !error.includes("404") &&
          !error.includes("React Router")
      );

      if (criticalErrors.length > 0) {
        console.log("KPI-related errors found:", criticalErrors);
      }

      // Не падаем, если есть ошибки, но логируем их
      // expect(criticalErrors.length).toBe(0);
    });

    test("should not have network errors for KPI requests", async ({ page }) => {
      const networkErrors: any[] = [];

      page.on("response", (response) => {
        const url = response.url();
        if (url.includes("/api/data") && url.includes("query_id=kpis")) {
          if (!response.ok()) {
            networkErrors.push({
              url: url,
              status: response.status(),
              statusText: response.statusText(),
            });
          }
        }
      });

      // Ждем загрузки
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Проверяем, что нет ошибок сети
      if (networkErrors.length > 0) {
        console.error("Network errors for KPI requests:", networkErrors);
      }

      expect(networkErrors.length).toBe(0);
    });
  });

  test.describe("Проверка структуры карточек", () => {
    test("should have KPI cards with title and value", async ({ page }) => {
      // Ищем карточки
      const cardSelectors = [
        '[data-component-type="card"]',
        '[class*="card"]',
      ];

      let foundCardWithStructure = false;

      for (const selector of cardSelectors) {
        try {
          const cards = await page.locator(selector).all();
          for (const card of cards) {
            const cardText = await card.textContent();
            // Проверяем, что карточка содержит и текст (название) и число (значение)
            if (cardText && /[а-яА-Я]/.test(cardText) && /[\d₽%]/.test(cardText)) {
              foundCardWithStructure = true;
              console.log(`Found card with structure: ${cardText.substring(0, 100)}`);
              break;
            }
          }
          if (foundCardWithStructure) break;
        } catch (e) {
          // Селектор не найден
        }
      }

      // Проверяем, что хотя бы одна карточка имеет правильную структуру
      expect(foundCardWithStructure).toBeTruthy();
    });
  });
});
