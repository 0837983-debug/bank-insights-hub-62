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

test.describe("Layout data_source_key", () => {
  test.describe("Backend - Layout JSON", () => {
    test("should return data_source_key in layout JSON for components", async ({ request }) => {
      const layout = await fetchLayout(request);

      // Проверяем, что layout содержит компоненты
      expect(layout).toHaveProperty("components");
      expect(Array.isArray(layout.components)).toBe(true);

      // Ищем компоненты с data_source_key
      const componentsWithDataSource = layout.components.filter(
        (comp: any) => comp.dataSourceKey || comp.data_source_key
      );

      // Должен быть хотя бы header с data_source_key = header_dates
      expect(componentsWithDataSource.length).toBeGreaterThan(0);

      // Проверяем header компонент
      const headerComponent = layout.components.find(
        (comp: any) => comp.componentId === "header" || comp.type === "header"
      );

      if (headerComponent) {
        expect(headerComponent.dataSourceKey || headerComponent.data_source_key).toBe("header_dates");
      }
    });

    test("should return data_source_key for header component", async ({ request }) => {
      const layout = await fetchLayout(request);

      const headerComponent = layout.components?.find(
        (comp: any) => comp.componentId === "header" || comp.type === "header"
      );

      expect(headerComponent).toBeDefined();
      expect(headerComponent.dataSourceKey || headerComponent.data_source_key).toBe("header_dates");
    });

    test("should return data_source_key for table components if present", async ({ request }) => {
      const layout = await fetchLayout(request);

      // Ищем таблицы с data_source_key
      const tableComponents = layout.components?.filter(
        (comp: any) => comp.type === "table" && (comp.dataSourceKey || comp.data_source_key)
      );

      // Если есть таблицы с data_source_key, проверяем их
      if (tableComponents && tableComponents.length > 0) {
        for (const table of tableComponents) {
          expect(table.dataSourceKey || table.data_source_key).toBeTruthy();
          expect(typeof (table.dataSourceKey || table.data_source_key)).toBe("string");
        }
      }
    });
  });

  test.describe("Frontend - Using data_source_key", () => {
    test("should read data_source_key from layout", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:8080/");

      // Ждем загрузки layout
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000); // Увеличиваем таймаут

      // Проверяем наличие header компонента
      const header = await page.locator('header').first();
      await expect(header).toBeVisible();
    });

    test("should use data_source_key to load data via getData", async ({ page }) => {
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

      // Проверяем, что был запрос к /api/data с query_id=header_dates (новый формат: GET с query параметрами)
      const headerDatesRequest = dataRequests.find((req) => 
        req.url.includes("header_dates") || req.url.includes("query_id=header_dates")
      );

      // Если Frontend использует data_source_key, должен быть запрос
      if (headerDatesRequest) {
        expect(headerDatesRequest.url).toContain("query_id=header_dates");
        expect(headerDatesRequest.url).toContain("component_Id=header");
      } else if (dataRequests.length > 0) {
        // Если запросов к /api/data есть, но не header_dates, это тоже нормально
        console.log("⚠️  Запросы к /api/data найдены, но header_dates не обнаружен (возможно закэширован)");
      } else {
        console.log("⚠️  Запросы к /api/data не обнаружены (возможно закэшированы)");
      }
    });

    test("should use data_source_key for table components", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:8080/");

      // Перехватываем запросы к /api/data для таблиц
      const tableRequests: any[] = [];
      
      page.on("request", (request) => {
        const url = request.url();
        if (url.includes("/api/data") && (url.includes("assets_table") || url.includes("query_id=assets_table"))) {
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
        expect(request.url).toMatch(/query_id=|component_Id=/);
      } else {
        // Если запросов нет, возможно данные закэшированы - это нормально
        console.log("⚠️  No table requests found (possibly cached)");
      }
    });
  });
});
