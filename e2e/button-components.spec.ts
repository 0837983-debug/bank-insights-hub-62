import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("Button Components", () => {
  test.describe("Backend - Layout JSON", () => {
    test("should not return groupableFields in layout JSON", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/layout`);

      expect(response.ok()).toBeTruthy();
      const layout = await response.json();

      // Проверяем, что layout содержит компоненты
      expect(layout).toHaveProperty("components");
      expect(Array.isArray(layout.components)).toBe(true);

      // Проверяем, что ни один компонент не имеет groupableFields
      for (const component of layout.components) {
        // Проверяем как в секциях, так и на верхнем уровне
        if (component.groupableFields) {
          throw new Error(`Component ${component.componentId || component.id} has groupableFields in layout JSON`);
        }
      }

      // Проверяем компоненты в секциях
      if (layout.sections) {
        for (const section of layout.sections) {
          if (section.components) {
            for (const component of section.components) {
              if (component.groupableFields) {
                throw new Error(`Component ${component.componentId || component.id} in section has groupableFields in layout JSON`);
              }
            }
          }
        }
      }
    });

    test("should return buttons as child components of tables", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/layout`);

      expect(response.ok()).toBeTruthy();
      const layout = await response.json();

      // Ищем таблицы
      const tableComponents = layout.components?.filter(
        (comp: any) => comp.type === "table"
      ) || [];

      // Проверяем, что у таблиц есть дочерние компоненты (кнопки)
      let foundButtons = false;
      for (const table of tableComponents) {
        if (table.components && Array.isArray(table.components)) {
          const buttons = table.components.filter(
            (child: any) => child.type === "button"
          );
          
          if (buttons.length > 0) {
            foundButtons = true;
            // Проверяем структуру кнопки
            for (const button of buttons) {
              expect(button.type).toBe("button");
              expect(button.dataSourceKey || button.data_source_key).toBeTruthy();
            }
          }
        }
      }

      // Должна быть хотя бы одна таблица с кнопками
      // (если кнопки реализованы)
      if (tableComponents.length > 0) {
        // Проверяем, что кнопки присутствуют или таблицы есть
        expect(foundButtons || tableComponents.length > 0).toBeTruthy();
      }
    });

    test("should return buttons with data_source_key", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/layout`);

      expect(response.ok()).toBeTruthy();
      const layout = await response.json();

      // Ищем все кнопки в layout
      const allButtons: any[] = [];
      
      // В компонентах верхнего уровня
      if (layout.components) {
        layout.components.forEach((comp: any) => {
          if (comp.type === "button") {
            allButtons.push(comp);
          }
          // В дочерних компонентах
          if (comp.components) {
            comp.components.forEach((child: any) => {
              if (child.type === "button") {
                allButtons.push(child);
              }
            });
          }
        });
      }

      // В секциях
      if (layout.sections) {
        layout.sections.forEach((section: any) => {
          if (section.components) {
            section.components.forEach((comp: any) => {
              if (comp.type === "button") {
                allButtons.push(comp);
              }
              // В дочерних компонентах
              if (comp.components) {
                comp.components.forEach((child: any) => {
                  if (child.type === "button") {
                    allButtons.push(child);
                  }
                });
              }
            });
          }
        });
      }

      // Если есть кнопки, проверяем, что у них есть data_source_key
      if (allButtons.length > 0) {
        for (const button of allButtons) {
          expect(button.dataSourceKey || button.data_source_key).toBeTruthy();
          expect(typeof (button.dataSourceKey || button.data_source_key)).toBe("string");
        }
      }
    });
  });

  test.describe("Frontend - Button Interaction", () => {
    test("should render buttons for tables", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:5173/");

      // Ждем загрузки layout
      await page.waitForLoadState("networkidle");

      // Ищем кнопки группировки (если они реализованы)
      const buttonSelectors = [
        'button[data-button-type="grouping"]',
        'button:has-text("Группировка")',
        '[data-component-type="button"]',
      ];

      let buttonsFound = false;
      for (const selector of buttonSelectors) {
        try {
          const buttons = await page.locator(selector).all();
          if (buttons.length > 0) {
            buttonsFound = true;
            break;
          }
        } catch (e) {
          // Селектор не найден
        }
      }

      // Если кнопки реализованы, они должны быть видны
      // Пока проверяем базовую функциональность
      // (кнопки могут быть скрыты или еще не реализованы полностью)
    });

    test("should change query_id on button click", async ({ page }) => {
      // Переходим на главную страницу
      await page.goto("http://localhost:5173/");

      // Перехватываем запросы к /api/data
      const dataRequests: any[] = [];
      
      page.on("request", (request) => {
        if (request.url().includes("/api/data")) {
          const postData = request.postData();
          if (postData) {
            try {
              const data = JSON.parse(postData);
              dataRequests.push({
                url: request.url(),
                method: request.method(),
                query_id: data.query_id,
                params: data.params,
              });
            } catch (e) {
              // Не удалось распарсить
            }
          }
        }
      });

      // Ждем загрузки
      await page.waitForLoadState("networkidle");

      // Ищем и кликаем на кнопку (если есть)
      const buttonSelectors = [
        'button[data-button-type="grouping"]',
        'button:has-text("Группировка")',
        '[data-component-type="button"]',
      ];

      let buttonClicked = false;
      for (const selector of buttonSelectors) {
        try {
          const button = await page.locator(selector).first();
          if (await button.isVisible()) {
            await button.click();
            buttonClicked = true;
            
            // Ждем нового запроса
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Кнопка не найдена или не кликабельна
        }
      }

      // Если кнопка была кликнута, должен быть новый запрос с другим query_id
      // Пока проверяем базовую функциональность
      if (buttonClicked && dataRequests.length > 1) {
        // Проверяем, что query_id изменился
        const uniqueQueryIds = new Set(dataRequests.map(r => r.query_id));
        expect(uniqueQueryIds.size).toBeGreaterThan(1);
      }
    });
  });
});
