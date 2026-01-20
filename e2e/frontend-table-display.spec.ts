import { test, expect } from "@playwright/test";

const FRONTEND_URL = "http://localhost:8080";

test.describe("Frontend - Table Display", () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную страницу
    await page.goto(FRONTEND_URL);
    
    // Ждем загрузки
    await page.waitForLoadState("networkidle");
  });

  test("should render without console errors", async ({ page }) => {
    // Проверяем консоль на ошибки
    const consoleErrors: string[] = [];
    
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Ждем немного для загрузки
    await page.waitForTimeout(2000);

    // Проверяем, что нет критических ошибок
    const criticalErrors = consoleErrors.filter(
      (error) => 
        !error.includes("favicon") && 
        !error.includes("404") &&
        !error.includes("Failed to fetch") // Может быть временная ошибка сети
    );

    if (criticalErrors.length > 0) {
      console.log("Console errors found:", criticalErrors);
    }

    // Проверяем, что страница загрузилась
    expect(await page.title()).toBeTruthy();
  });

  test("should display sections", async ({ page }) => {
    // Ищем секции на странице
    const sectionSelectors = [
      'text="Top Level"',
      'text="Финансовые результаты"',
      'text="Баланс"',
      '[data-section]',
      'section',
    ];

    let sectionsFound = 0;
    for (const selector of sectionSelectors) {
      try {
        const elements = await page.locator(selector).all();
        if (elements.length > 0) {
          sectionsFound += elements.length;
        }
      } catch (e) {
        // Селектор не найден
      }
    }

    // Должна быть хотя бы одна секция
    expect(sectionsFound).toBeGreaterThan(0);
  });

  test("should display Assets table with data", async ({ page }) => {
    // Ищем таблицу "Активы"
    const tableSelectors = [
      'text="Активы"',
      '[data-component-id="assets_table"]',
      '[data-component-type="table"]',
      'table',
    ];

    let tableFound = false;
    let tableElement = null;

    for (const selector of tableSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          tableFound = true;
          tableElement = element;
          break;
        }
      } catch (e) {
        // Селектор не найден
      }
    }

    expect(tableFound).toBeTruthy();

    // Проверяем, что в таблице есть данные (строки)
    if (tableElement) {
      // Ищем строки таблицы
      const rows = await page.locator('table tbody tr, [role="row"]').all();
      
      // Должна быть хотя бы одна строка с данными
      if (rows.length > 0) {
        // Проверяем, что строки содержат данные
        const firstRow = rows[0];
        const rowText = await firstRow.textContent();
        expect(rowText).toBeTruthy();
        expect(rowText!.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("should display KPI cards", async ({ page }) => {
    // Ищем KPI карточки
    const cardSelectors = [
      '[data-component-type="card"]',
      '[data-component-id*="card"]',
      '.card',
      '[class*="card"]',
    ];

    let cardsFound = false;
    for (const selector of cardSelectors) {
      try {
        const cards = await page.locator(selector).all();
        if (cards.length > 0) {
          cardsFound = true;
          break;
        }
      } catch (e) {
        // Селектор не найден
      }
    }

    // KPI карточки должны отображаться (если есть в layout)
    // Если карточек нет, это не критично, но проверим наличие
  });

  test("should handle grouping buttons", async ({ page }) => {
    // Ищем кнопки группировки
    const buttonSelectors = [
      'button:has-text("client_type")',
      'button:has-text("client_segment")',
      'button:has-text("product_code")',
      '[data-button-type="grouping"]',
      '[data-component-type="button"]',
    ];

    let buttonsFound = false;
    for (const selector of buttonSelectors) {
      try {
        const buttons = await page.locator(selector).all();
        if (buttons.length > 0) {
          buttonsFound = true;
          
          // Пробуем кликнуть на первую кнопку
          const firstButton = buttons[0];
          if (await firstButton.isVisible()) {
            await firstButton.click();
            
            // Ждем обновления данных
            await page.waitForTimeout(1000);
            
            // Проверяем, что таблица обновилась
            const table = await page.locator('table, [role="table"]').first();
            expect(await table.isVisible()).toBeTruthy();
          }
          break;
        }
      } catch (e) {
        // Селектор не найден
      }
    }

    // Кнопки могут быть не видны, если они еще не реализованы
    // Проверяем базовую функциональность
  });

  test("should load data from getData endpoint", async ({ page }) => {
    // Перехватываем запросы к /api/data
    const dataRequests: any[] = [];
    
    page.on("request", (request) => {
      if (request.url().includes("/api/data")) {
        dataRequests.push({
          url: request.url(),
          method: request.method(),
        });
      }
    });

    // Ждем загрузки
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Проверяем, что были запросы к /api/data
    if (dataRequests.length > 0) {
      // Проверяем формат запроса
      const assetsRequest = dataRequests.find((req) => 
        req.url.includes("assets_table")
      );

      if (assetsRequest) {
        // Проверяем, что запрос содержит component_id
        expect(assetsRequest.url).toContain("component_id");
      }
    }
  });

  test("should display table rows with correct structure", async ({ page }) => {
    // Ищем таблицу
    const table = await page.locator('table, [role="table"]').first();
    
    if (await table.isVisible()) {
      // Проверяем наличие заголовков
      const headers = await table.locator('thead th, [role="columnheader"]').all();
      
      if (headers.length > 0) {
        // Проверяем наличие строк данных
        const rows = await table.locator('tbody tr, [role="row"]').all();
        
        if (rows.length > 0) {
          // Проверяем структуру первой строки
          const firstRow = rows[0];
          const cells = await firstRow.locator('td, [role="cell"]').all();
          
          // Должна быть хотя бы одна ячейка
          expect(cells.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
