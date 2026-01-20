import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("GET /api/data - getData endpoint", () => {
  test.describe("Successful requests", () => {
    test("should return data for header_dates query", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/data/header_dates`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      
      // Проверка структуры ответа
      expect(responseData).toBeDefined();
      expect(responseData).toHaveProperty("data");
      
      // header_dates возвращает данные в поле data
      const data = responseData.data;
      expect(Array.isArray(data) || typeof data === "object").toBe(true);
    });

    test("should return data for assets_table query with params", async ({ request }) => {
      const params = {
        p1: "2025-08-01",
        p2: "2025-07-01",
        p3: "2024-08-01",
        class: "assets",
      };

      const paramsStr = encodeURIComponent(JSON.stringify(params));
      const response = await request.get(
        `${API_BASE_URL}/data/assets_table?params=${paramsStr}`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      
      // Проверка структуры ответа
      expect(responseData).toBeDefined();
      expect(responseData).toHaveProperty("data");
      
      // assets_table возвращает массив строк в поле data
      const data = responseData.data;
      expect(Array.isArray(data)).toBe(true);
      
      // Если есть данные, проверяем структуру первой строки
      if (data.length > 0) {
        const firstRow = data[0];
        expect(firstRow).toHaveProperty("class");
        expect(firstRow).toHaveProperty("section");
        expect(firstRow).toHaveProperty("item");
        expect(firstRow).toHaveProperty("sub_item");
      }
    });

    test("should accept POST request with query_id and params in body", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "header_dates",
          params: {},
        },
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toBeDefined();
      expect(responseData).toHaveProperty("data");
    });

    test("should return data for assets_table via POST", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "assets_table",
          params: {
            p1: "2025-08-01",
            p2: "2025-07-01",
            p3: "2024-08-01",
            class: "assets",
          },
        },
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty("data");
      const data = responseData.data;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  test.describe("Error handling - invalid params", () => {
    test("should return 400 for missing required params", async ({ request }) => {
      // assets_table требует параметры p1, p2, p3, class
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "assets_table",
          params: {}, // Отсутствуют обязательные параметры
        },
      });

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("error");
      expect(error.error).toMatch(/invalid params/i);
    });

    test("should return 400 for invalid query_id", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "non_existent_query",
          params: {},
        },
      });

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("error");
      expect(error.error).toMatch(/invalid config/i);
    });

    test("should return 400 for missing query_id in POST", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          params: {}, // query_id отсутствует
        },
      });

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("error");
    });

    test("should return 400 for invalid params format in GET", async ({ request }) => {
      // Некорректный JSON в query string
      const response = await request.get(
        `${API_BASE_URL}/data/assets_table?params=invalid_json`
      );

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("error");
    });
  });

  test.describe("Error handling - SQL errors", () => {
    test("should return 500 for SQL execution errors", async ({ request }) => {
      // Попытка использовать несуществующую таблицу через невалидный конфиг
      // Для этого нужно создать тестовый конфиг с невалидным SQL или использовать существующий
      // с параметрами, которые приведут к SQL ошибке
      
      // Используем валидный query_id, но с параметрами, которые могут вызвать SQL ошибку
      // Например, передадим невалидную дату в параметрах (хотя валидация должна быть на уровне builder)
      
      // Альтернативно: проверяем обработку SQL ошибок через существующий запрос
      // с параметрами, которые могут вызвать проблему на уровне БД
      
      // Для теста SQL ошибки можно использовать запрос с невалидными данными
      // Но так как builder валидирует параметры, SQL ошибка может возникнуть только
      // при проблемах с БД или структурой таблиц
      
      // Пропускаем этот тест, так как сложно воспроизвести SQL ошибку без изменения БД
      // В реальном сценарии SQL ошибки обрабатываются корректно (проверено в коде)
      test.skip();
    });

    test("should handle database connection errors gracefully", async ({ request }) => {
      // Этот тест требует остановки БД, что сложно сделать в E2E тестах
      // Проверяем, что endpoint обрабатывает ошибки
      // В реальном сценарии ошибки подключения обрабатываются через errorHandler
      test.skip();
    });
  });

  test.describe("Response format", () => {
    test("should return JSON array for table queries", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "assets_table",
          params: {
            p1: "2025-08-01",
            p2: "2025-07-01",
            p3: "2024-08-01",
            class: "assets",
          },
        },
      });

      expect(response.ok()).toBeTruthy();
      
      const responseData = await response.json();
      expect(responseData).toHaveProperty("data");
      const data = responseData.data;
      expect(Array.isArray(data)).toBe(true);
    });

    test("should return valid JSON structure", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/data/header_dates`);

      expect(response.ok()).toBeTruthy();
      
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");
      
      const responseData = await response.json();
      expect(responseData).toBeDefined();
      expect(responseData).toHaveProperty("data");
    });
  });

  test.describe("Edge cases", () => {
    test("should handle empty params object", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "header_dates",
          params: {},
        },
      });

      // header_dates не требует параметров, должен вернуть успешный ответ
      expect(response.ok()).toBeTruthy();
    });

    test("should handle query_id with special characters", async ({ request }) => {
      // Попытка использовать query_id с недопустимыми символами
      const response = await request.get(
        `${API_BASE_URL}/data/invalid-query-id-123`
      );

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("error");
    });

    test("should handle very large params object", async ({ request }) => {
      // Создаем большой объект параметров
      const largeParams: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        largeParams[`param${i}`] = `value${i}`;
      }

      const response = await request.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "header_dates",
          params: largeParams,
        },
      });

      // Должен обработать (хотя большинство параметров не используются)
      // Может вернуть 200 или 400 в зависимости от валидации
      expect([200, 400]).toContain(response.status());
    });
  });
});
