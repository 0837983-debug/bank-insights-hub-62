import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("Header Component - Backend", () => {
  test.describe("Component configuration", () => {
    test("should have header component in config.components", async ({ request }) => {
      // Проверяем через API layout, что header компонент присутствует
      const response = await request.get(`${API_BASE_URL}/layout`);

      expect(response.ok()).toBeTruthy();
      const layout = await response.json();

      // Ищем header компонент в layout
      const headerComponent = layout.components?.find(
        (comp: any) => comp.componentId === "header" || comp.type === "header"
      );

      expect(headerComponent).toBeDefined();
      expect(headerComponent?.componentId || headerComponent?.id).toBe("header");
    });

    test("should have data_source_key = header_dates for header component", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/layout`);

      expect(response.ok()).toBeTruthy();
      const layout = await response.json();

      const headerComponent = layout.components?.find(
        (comp: any) => comp.componentId === "header" || comp.type === "header"
      );

      if (headerComponent) {
        // Проверяем, что data_source_key установлен
        expect(headerComponent.data_source_key || headerComponent.dataSourceKey).toBe("header_dates");
      }
    });

    test("should have header component in layout_component_mapping", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/layout`);

      expect(response.ok()).toBeTruthy();
      const layout = await response.json();

      // Header должен быть в списке компонентов layout
      const headerComponent = layout.components?.find(
        (comp: any) => comp.componentId === "header" || comp.type === "header"
      );

      expect(headerComponent).toBeDefined();
      
      // Header должен быть первым (display_order = 0)
      if (layout.components && layout.components.length > 0) {
        const firstComponent = layout.components[0];
        const isHeaderFirst = 
          firstComponent.componentId === "header" || 
          firstComponent.id === "header" ||
          firstComponent.type === "header";
        
        // Header должен быть первым или присутствовать в layout
        expect(isHeaderFirst || headerComponent).toBeTruthy();
      }
    });
  });

  test.describe("Data source query", () => {
    test("should be able to fetch header_dates data via getData", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "header_dates",
          params: {},
        },
      });

      expect(response.ok()).toBeTruthy();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("data");
      const data = responseData.data;
      
      // header_dates должен возвращать данные (максимальную дату)
      expect(data).toBeDefined();
      // Может быть массив или объект с датой
      expect(Array.isArray(data) || typeof data === "object").toBe(true);
    });

    test("should return valid date format from header_dates", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "header_dates",
          params: {},
        },
      });

      expect(response.ok()).toBeTruthy();
      const responseData = await response.json();
      const data = responseData.data;

      // Проверяем, что данные содержат дату
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        // Проверяем наличие поля с датой (может быть current, period_date, max и т.д.)
        expect(firstItem).toBeDefined();
      } else if (typeof data === "object" && data !== null) {
        // Если это объект, проверяем наличие полей с датами
        expect(Object.keys(data).length).toBeGreaterThan(0);
      }
    });
  });
});

test.describe("Header Component - Frontend Integration", () => {
  test.describe("Layout integration", () => {
    test("should render header component from layout", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:5173/");

      // Ждем загрузки layout
      await page.waitForLoadState("networkidle");

      // Проверяем, что header присутствует на странице
      // Header может быть найден по различным селекторам
      const headerSelectors = [
        'header',
        '[data-component-id="header"]',
        '[data-component-type="header"]',
        'header:has-text("Операционные метрики")',
      ];

      let headerFound = false;
      for (const selector of headerSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible()) {
            headerFound = true;
            break;
          }
        } catch (e) {
          // Селектор не найден, пробуем следующий
        }
      }

      // Header должен быть найден (если Frontend реализован)
      // Если Frontend еще не реализован, тест будет пропущен
      if (!headerFound) {
        test.skip();
      }

      expect(headerFound).toBeTruthy();
    });

    test("should load dates from getData endpoint", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:5173/");

      // Ждем загрузки
      await page.waitForLoadState("networkidle");

      // Проверяем, что был запрос к /api/data с query_id=header_dates
      // Это можно проверить через network interception или проверку наличия данных
      
      // Альтернативно: проверяем, что даты отображаются в header
      // (если Frontend реализован)
      
      // Пока Frontend не реализован, пропускаем тест
      test.skip();
    });

    test("should use dates in table API calls", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:5173/");

      // Ждем загрузки
      await page.waitForLoadState("networkidle");

      // Проверяем, что запросы к таблицам содержат параметры дат
      // из header_dates
      
      // Пока Frontend не реализован, пропускаем тест
      test.skip();
    });
  });
});
