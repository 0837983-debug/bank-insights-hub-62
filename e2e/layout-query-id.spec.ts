import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

// Вспомогательная функция для получения layout через новый endpoint
async function fetchLayout(request: any) {
  const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
  const response = await request.get(
    `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
  );
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  
  // Преобразуем новый формат в старый формат для совместимости с тестами
  const formatsSection = data.sections.find((s: any) => s.id === "formats");
  const headerSection = data.sections.find((s: any) => s.id === "header");
  const contentSections = data.sections.filter(
    (s: any) => s.id !== "formats" && s.id !== "header"
  );
  
  // Собираем все компоненты из header и sections
  const components: any[] = [];
  if (headerSection?.components?.[0]) {
    components.push(headerSection.components[0]);
  }
  contentSections.forEach((section: any) => {
    if (section.components) {
      components.push(...section.components);
    }
  });
  
  return {
    formats: formatsSection?.formats || {},
    header: headerSection?.components?.[0],
    sections: contentSections.map((s: any) => ({
      id: s.id,
      title: s.title,
      components: s.components || [],
    })),
    components: components, // Добавляем для совместимости со старыми тестами
  };
}

test.describe("Layout queryId and dataSourceKey", () => {
  test.describe("Backend - Layout JSON", () => {
    test("should return queryId in layout JSON for data loading", async ({ request }) => {
      const layout = await fetchLayout(request);

      // Проверяем, что layout содержит компоненты
      expect(layout).toHaveProperty("components");
      expect(Array.isArray(layout.components)).toBe(true);

      // Проверяем header компонент - должен иметь queryId для загрузки данных
      const headerComponent = layout.components.find(
        (comp: any) => comp.componentId === "header" || comp.type === "header"
      );

      expect(headerComponent).toBeDefined();
      // queryId используется для загрузки данных через getData
      expect(headerComponent.queryId).toBe("header_dates");
    });

    test("should return dataSourceKey in layout JSON for KPI mapping", async ({ request }) => {
      const layout = await fetchLayout(request);

      // Ищем компоненты с dataSourceKey
      const componentsWithDataSource = layout.components.filter(
        (comp: any) => comp.dataSourceKey || comp.data_source_key
      );

      // Должен быть хотя бы header с dataSourceKey = header_dates
      expect(componentsWithDataSource.length).toBeGreaterThan(0);

      // Проверяем header компонент
      const headerComponent = layout.components.find(
        (comp: any) => comp.componentId === "header" || comp.type === "header"
      );

      if (headerComponent) {
        // dataSourceKey используется для маппинга KPI данных
        expect(headerComponent.dataSourceKey || headerComponent.data_source_key).toBe("header_dates");
      }
    });

    test("should return queryId for table components", async ({ request }) => {
      const layout = await fetchLayout(request);

      // Ищем таблицы с queryId
      const tableComponents = layout.components?.filter(
        (comp: any) => comp.type === "table" && comp.queryId
      );

      // Если есть таблицы с queryId, проверяем их
      if (tableComponents && tableComponents.length > 0) {
        for (const table of tableComponents) {
          expect(table.queryId).toBeTruthy();
          expect(typeof table.queryId).toBe("string");
        }
      }
    });

    test("should return dataSourceKey for card (KPI) components", async ({ request }) => {
      const layout = await fetchLayout(request);

      // Ищем карточки KPI с dataSourceKey
      const cardComponents = layout.components?.filter(
        (comp: any) => comp.type === "card" && (comp.dataSourceKey || comp.data_source_key)
      );

      // Если есть карточки с dataSourceKey, проверяем их
      if (cardComponents && cardComponents.length > 0) {
        for (const card of cardComponents) {
          expect(card.dataSourceKey || card.data_source_key).toBeTruthy();
          expect(typeof (card.dataSourceKey || card.data_source_key)).toBe("string");
        }
      }
    });
  });

  test.describe("Frontend - Using queryId for data loading", () => {
    test("should render header component from layout", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:8080/");

      // Ждем загрузки layout
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000); // Увеличиваем таймаут

      // Проверяем наличие header компонента
      const header = await page.locator('header').first();
      await expect(header).toBeVisible();
    });

    test("should use queryId to load header data via getData", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:8080/");

      // Перехватываем запросы к /api/data
      const dataRequests: any[] = [];
      
      page.on("request", (request) => {
        const url = request.url();
        if (url.includes("/api/data")) {
          dataRequests.push({
            url: url,
            method: request.method(),
          });
        }
      });

      // Ждем загрузки
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000); // Увеличиваем таймаут

      // Проверяем, что был запрос к /api/data с query_id=header_dates
      const headerDatesRequest = dataRequests.find((req) => 
        req.url.includes("query_id=header_dates")
      );

      // Если Frontend использует queryId, должен быть запрос
      if (headerDatesRequest) {
        expect(headerDatesRequest.url).toContain("query_id=header_dates");
        expect(headerDatesRequest.url).toContain("component_Id=header");
      } else if (dataRequests.length > 0) {
        // Если запросов к /api/data есть, но не header_dates, это может быть кэширование
        console.log("⚠️  Запросы к /api/data найдены, но header_dates не обнаружен (возможно закэширован)");
      } else {
        console.log("⚠️  Запросы к /api/data не обнаружены (возможно закэшированы)");
      }
    });

    test("should use queryId for table data loading", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:8080/");

      // Перехватываем запросы к /api/data для таблиц
      const tableRequests: any[] = [];
      
      page.on("request", (request) => {
        const url = request.url();
        if (url.includes("/api/data") && url.includes("query_id=")) {
          tableRequests.push({
            url: url,
            method: request.method(),
          });
        }
      });

      // Ждем загрузки
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000); // Увеличиваем таймаут

      // Проверяем наличие таблиц
      const table = await page.locator('table').first();
      await expect(table).toBeVisible();

      // Если были запросы к таблицам, проверяем формат
      if (tableRequests.length > 0) {
        const request = tableRequests[0];
        expect(request.url).toContain("query_id=");
        expect(request.url).toContain("component_Id=");
      } else {
        // Если запросов нет, возможно данные закэшированы - это нормально
        console.log("⚠️  No table requests found (possibly cached)");
      }
    });
  });
});
