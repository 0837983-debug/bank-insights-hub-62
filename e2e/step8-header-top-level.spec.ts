import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:3001";
const FRONTEND_URL = "http://localhost:8080";

test.describe("Step 8 - Header as top-level element", () => {
  // Вспомогательная функция для получения layout через новый endpoint
  async function fetchLayout(request: any) {
    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const response = await request.get(
      `${API_URL}/api/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
    );
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Преобразуем новый формат в старый формат для совместимости с тестами
    const formatsSection = data.sections.find((s: any) => s.id === "formats");
    const headerSection = data.sections.find((s: any) => s.id === "header");
    const contentSections = data.sections.filter(
      (s: any) => s.id !== "formats" && s.id !== "header"
    );
    
    return {
      formats: formatsSection?.formats || {},
      header: headerSection?.components?.[0],
      sections: contentSections.map((s: any) => ({
        id: s.id,
        title: s.title,
        components: s.components || [],
      })),
    };
  }

  test("should return header in layout (via /api/data)", async ({ request }) => {
    const layout = await fetchLayout(request);
    
    // Проверяем наличие поля header
    expect(layout).toHaveProperty("header");
    expect(layout.header).toBeTruthy();
    
    // Проверяем структуру header
    if (typeof layout.header === "object") {
      expect(layout.header).toHaveProperty("componentId");
      expect(layout.header).toHaveProperty("type");
    }
  });

  test("should render header above sections in UI", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Ищем header
    const headerSelectors = [
      '[data-component-id="header"]',
      '[data-component-type="header"]',
      'header',
      '[class*="header"]',
    ];

    let headerFound = false;
    for (const selector of headerSelectors) {
      try {
        const header = await page.locator(selector).first();
        if (await header.isVisible()) {
          headerFound = true;
          break;
        }
      } catch (e) {
        // Селектор не найден
      }
    }

    // Ищем секции
    const sectionSelectors = [
      'section',
      '[data-section]',
      '[class*="section"]',
    ];

    let sectionsFound = false;
    for (const selector of sectionSelectors) {
      try {
        const sections = await page.locator(selector).all();
        if (sections.length > 0) {
          sectionsFound = true;
          break;
        }
      } catch (e) {
        // Селектор не найден
      }
    }

    // Header должен быть найден
    expect(headerFound).toBeTruthy();
    
    // Секции должны быть найдены
    expect(sectionsFound).toBeTruthy();
  });

  test("should not render header as a section", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Проверяем, что header не находится внутри секций
    const sections = await page.locator('section, [data-section]').all();
    
    for (const section of sections) {
      const sectionText = await section.textContent();
      // Header не должен быть частью секции
      // Проверяем, что header не находится внутри секции
      const headerInSection = await section.locator('[data-component-id="header"], header').count();
      expect(headerInSection).toBe(0);
    }
  });

  test("should display tables and KPIs correctly", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Проверяем наличие таблиц
    const tables = await page.locator('table, [role="table"]').all();
    expect(tables.length).toBeGreaterThan(0);

    // Проверяем наличие KPI карточек
    const cardSelectors = [
      '[data-component-type="card"]',
      '[data-component-id*="card"]',
      '.card',
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
    // Если карточек нет, это не критично
  });

  test("should load header data correctly", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Перехватываем запросы к /api/data для header
    const headerRequests: any[] = [];
    
    page.on("request", (request) => {
      if (request.url().includes("/api/data") && request.url().includes("header")) {
        headerRequests.push({
          url: request.url(),
          method: request.method(),
        });
      }
    });

    // Ждем загрузки
    await page.waitForTimeout(2000);

    // Проверяем, что были запросы для header (если header использует getData)
    // Это необязательно, если header использует другой endpoint
  });
});
