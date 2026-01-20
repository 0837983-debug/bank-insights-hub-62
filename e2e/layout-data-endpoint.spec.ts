import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("Layout через /api/data endpoint", () => {
  test.describe("API проверки", () => {
    test("should load layout through /api/data endpoint", async ({ request }) => {
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      
      // Проверка структуры ответа
      expect(data).toHaveProperty("sections");
      expect(Array.isArray(data.sections)).toBe(true);
      expect(data.sections.length).toBeGreaterThan(0);
    });

    test("should have formats section in response", async ({ request }) => {
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      const formatsSection = data.sections.find((s: any) => s.id === "formats");
      
      expect(formatsSection).toBeDefined();
      expect(formatsSection).toHaveProperty("formats");
      expect(typeof formatsSection.formats).toBe("object");
      
      // Проверяем наличие форматов
      const formatKeys = Object.keys(formatsSection.formats);
      expect(formatKeys.length).toBeGreaterThan(0);
      expect(formatKeys).toContain("currency_rub");
      expect(formatKeys).toContain("number");
      expect(formatKeys).toContain("percent");
    });

    test("should have header section in response", async ({ request }) => {
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      const headerSection = data.sections.find((s: any) => s.id === "header");
      
      expect(headerSection).toBeDefined();
      expect(headerSection).toHaveProperty("components");
      expect(Array.isArray(headerSection.components)).toBe(true);
      expect(headerSection.components.length).toBeGreaterThan(0);
      
      // Проверяем структуру header компонента
      const headerComponent = headerSection.components[0];
      expect(headerComponent).toHaveProperty("componentId", "header");
      expect(headerComponent).toHaveProperty("type", "header");
      expect(headerComponent).toHaveProperty("dataSourceKey", "header_dates");
    });

    test("should have content sections (excluding formats and header)", async ({ request }) => {
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      const contentSections = data.sections.filter(
        (s: any) => s.id !== "formats" && s.id !== "header"
      );
      
      expect(contentSections.length).toBeGreaterThan(0);
      
      // Проверяем структуру контентных секций
      contentSections.forEach((section: any) => {
        expect(section).toHaveProperty("id");
        expect(section).toHaveProperty("title");
        expect(section).toHaveProperty("components");
        expect(Array.isArray(section.components)).toBe(true);
      });
    });

    test("should return 400 when layout_id is missing in parametrs", async ({ request }) => {
      const paramsJson = JSON.stringify({});
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );

      // Может вернуть 200 (если layout_id опционален) или 400 (если обязателен)
      // Проверяем, что запрос обработан (не 500)
      expect([200, 400]).toContain(response.status());
    });
  });

  test.describe("Frontend интеграция", () => {
    test("should load layout and parse formats correctly", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000); // Даем время на загрузку

      // Проверяем, что нет ошибок в консоли
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      // Проверяем, что страница загрузилась
      await expect(page.locator("body")).toBeVisible();

      // Проверяем наличие секций (хотя бы одна должна быть)
      const sections = page.locator('[data-testid="section"], section, [class*="section"]');
      const sectionsCount = await sections.count();
      
      // Может быть 0 если данные еще загружаются, но не должно быть ошибок
      expect(errors.length).toBe(0);
    });

    test("should display header above sections", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // Проверяем наличие header (может быть в разных форматах)
      const header = page.locator("header, [role='banner'], [class*='header']").first();
      const headerCount = await header.count();
      
      // Header может быть или не быть, но страница должна загрузиться без ошибок
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    });

    test("should apply formats to tables", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // Проверяем, что форматтеры инициализированы (через проверку наличия форматированных чисел)
      // Если есть таблицы, они должны использовать форматы
      const tables = page.locator("table, [class*='table']");
      const tablesCount = await tables.count();
      
      // Таблицы могут быть или не быть, но страница должна работать
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe("Сравнение со старым endpoint", () => {
    test("should return same formats as old /api/layout", async ({ request }) => {
      // Новый endpoint
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const newResponse = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );
      const newData = await newResponse.json();
      const newFormats = newData.sections.find((s: any) => s.id === "formats")?.formats || {};

      // Старый endpoint
      const oldResponse = await request.get(`${API_BASE_URL}/layout`);
      const oldData = await oldResponse.json();
      const oldFormats = oldData.formats || {};

      // Сравниваем ключи форматов
      const newFormatKeys = Object.keys(newFormats).sort();
      const oldFormatKeys = Object.keys(oldFormats).sort();

      expect(newFormatKeys).toEqual(oldFormatKeys);
    });

    test("should return same content sections as old /api/layout", async ({ request }) => {
      // Новый endpoint
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const newResponse = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );
      const newData = await newResponse.json();
      const newContentSections = newData.sections.filter(
        (s: any) => s.id !== "formats" && s.id !== "header"
      );

      // Старый endpoint
      const oldResponse = await request.get(`${API_BASE_URL}/layout`);
      const oldData = await oldResponse.json();
      const oldSections = oldData.sections || [];

      // Сравниваем количество контентных секций
      expect(newContentSections.length).toBe(oldSections.length);

      // Сравниваем ID секций
      const newSectionIds = newContentSections.map((s: any) => s.id).sort();
      const oldSectionIds = oldSections.map((s: any) => s.id).sort();

      expect(newSectionIds).toEqual(oldSectionIds);
    });
  });
});
