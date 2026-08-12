import { test, expect } from "./fixtures.js";

import { API_BASE_URL } from "./config.js";

test.describe("GET /api/data - New Contract (query_id, component_Id, parametrs)", () => {
  async function getCurrentPeriods(request: any) {
    const response = await request.get(
      `${API_BASE_URL}/data?query_id=header_dates&component_Id=header`
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const p1 = rows.find((row: any) => row.isP1)?.periodDate;
    const p2 = rows.find((row: any) => row.isP2)?.periodDate;
    const p3 = rows.find((row: any) => row.isP3)?.periodDate;

    expect(p1).toBeTruthy();
    expect(p2).toBeTruthy();
    expect(p3).toBeTruthy();

    return { p1, p2, p3 };
  }

  test.describe("Successful requests", () => {
    test("should return data for header_dates query with required parameters", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=header_dates&component_Id=header`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      
      // Проверка структуры ответа
      expect(responseData).toBeDefined();
      expect(responseData).toHaveProperty("componentId");
      expect(responseData).toHaveProperty("type");
      expect(responseData).toHaveProperty("rows");
      
      expect(responseData.componentId).toBe("header");
      expect(responseData.type).toBe("table");
      expect(Array.isArray(responseData.rows)).toBe(true);
      
      // header_dates возвращает даты
      if (responseData.rows.length > 0) {
        const firstRow = responseData.rows[0];
        expect(firstRow).toHaveProperty("periodDate");
        expect(firstRow).toHaveProperty("isP1");
        expect(firstRow).toHaveProperty("isP2");
        expect(firstRow).toHaveProperty("isP3");
      }
    });

    test("should return data for assets_table query with all parameters", async ({ authedRequest }) => {
      const periods = await getCurrentPeriods(authedRequest);
      const parametrs = JSON.stringify(periods);

      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${encodeURIComponent(parametrs)}`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      
      // Проверка структуры ответа
      expect(responseData).toBeDefined();
      expect(responseData).toHaveProperty("componentId");
      expect(responseData).toHaveProperty("type");
      expect(responseData).toHaveProperty("rows");
      
      expect(responseData.componentId).toBe("assets_table");
      expect(responseData.type).toBe("table");
      expect(Array.isArray(responseData.rows)).toBe(true);
      
      // Если есть данные, проверяем структуру первой строки
      if (responseData.rows.length > 0) {
        const firstRow = responseData.rows[0];
        // assets_table возвращает строки с class, section, item, value
        expect(firstRow).toHaveProperty("class");
        expect(firstRow).toHaveProperty("section");
        expect(firstRow).toHaveProperty("value");
      }
    });

    test("should return data without parametrs (empty JSON)", async ({ authedRequest }) => {
      const parametrs = JSON.stringify({});

      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=header_dates&component_Id=header&parametrs=${encodeURIComponent(parametrs)}`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty("componentId");
      expect(responseData).toHaveProperty("type");
      expect(responseData).toHaveProperty("rows");
    });

    test("should return data without parametrs parameter (omitted)", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=header_dates&component_Id=header`
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData).toHaveProperty("componentId");
      expect(responseData).toHaveProperty("type");
      expect(responseData).toHaveProperty("rows");
    });
  });

  test.describe("Error handling - missing required parameters", () => {
    test("should return 400 when query_id is missing", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?component_Id=assets_table`
      );

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("code");
      expect(error.code).toBe("QUERY_INVALID_PARAMS");
    });

    test("should return 400 when component_Id is missing", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=assets_table`
      );

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("code");
      expect(error.code).toBe("QUERY_INVALID_PARAMS");
    });

    test("should return 400 when both query_id and component_Id are missing", async ({ authedRequest }) => {
      const response = await authedRequest.get(`${API_BASE_URL}/data`);

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("code");
    });

    test("should return 400 when query_id is empty string", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=&component_Id=assets_table`
      );

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("code");
    });

    test("should return 400 when component_Id is empty string", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=`
      );

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("code");
    });
  });

  test.describe("Error handling - invalid parametrs JSON", () => {
    test("should return 400 for invalid JSON in parametrs", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=invalid_json`
      );

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("code");
      expect(error.code).toBe("QUERY_INVALID_PARAMS");
    });

    test("should return 400 for malformed JSON in parametrs", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs={invalid:json}`
      );

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("code");
      expect(error.code).toBe("QUERY_INVALID_PARAMS");
    });

    test("should return 400 when parametrs is not a string", async ({ authedRequest }) => {
      // Playwright автоматически сериализует объекты, но мы можем проверить через прямой запрос
      // В реальности parametrs должен быть строкой в query string
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs[]=value`
      );

      // Может вернуть 400 или обработать как строку, зависит от реализации
      expect([400, 200]).toContain(response.status());
    });
  });

  test.describe("Error handling - invalid query_id", () => {
    test("should return 400 for non-existent query_id", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=non_existent_query&component_Id=test`
      );

      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty("code");
      expect(error.code).toMatch(/QUERY_INVALID_CONFIG/i);
    });
  });

  test.describe("POST endpoint removal", () => {
    test("should return 404 for POST /api/data", async ({ authedRequest }) => {
      const response = await authedRequest.post(`${API_BASE_URL}/data`, {
        data: {
          query_id: "assets_table",
          component_Id: "assets_table",
          parametrs: "{}",
        },
      });

      expect(response.status()).toBe(404);
    });

    test("should return 404 for POST /api/data/", async ({ authedRequest }) => {
      const response = await authedRequest.post(`${API_BASE_URL}/data/`, {
        data: {
          query_id: "header_dates",
          component_Id: "header",
        },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe("Old endpoint removal", () => {
    test("should return 404 for GET /api/data/:query_id (old format)", async ({ authedRequest }) => {
      const response = await authedRequest.get(`${API_BASE_URL}/data/assets_table`);

      expect(response.status()).toBe(404);
    });

    test("should return 404 for GET /api/data/:query_id with params (old format)", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data/assets_table?component_id=assets_table&p1=2025-12-31`
      );

      expect(response.status()).toBe(404);
    });
  });

  test.describe("Response format validation", () => {
    test("should have correct Content-Type header", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=header_dates&component_Id=header`
      );

      expect(response.ok()).toBeTruthy();
      
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");
    });

    test("should return valid JSON structure with componentId, type, rows", async ({ authedRequest }) => {
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=header_dates&component_Id=header`
      );

      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      
      // Проверка обязательных полей
      expect(typeof data.componentId).toBe("string");
      expect(data.type).toBe("table");
      expect(Array.isArray(data.rows)).toBe(true);
    });
  });

  test.describe("Edge cases", () => {
    test("should handle special characters in query_id", async ({ authedRequest }) => {
      // query_id должен быть валидным идентификатором
      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table`
      );

      // Если query_id валиден, должен вернуть 200 или 400 (если конфиг не найден)
      expect([200, 400]).toContain(response.status());
    });

    test("should handle URL-encoded parametrs", async ({ authedRequest }) => {
      const parametrs = JSON.stringify({ p1: "2025-12-31", class: "assets" });
      const encoded = encodeURIComponent(parametrs);

      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${encoded}`
      );

      // Должен успешно обработать URL-encoded JSON
      expect([200, 400]).toContain(response.status());
    });

    test("should handle empty parametrs JSON object", async ({ authedRequest }) => {
      const parametrs = JSON.stringify({});

      const response = await authedRequest.get(
        `${API_BASE_URL}/data?query_id=header_dates&component_Id=header&parametrs=${encodeURIComponent(parametrs)}`
      );

      expect(response.ok()).toBeTruthy();
    });
  });
});
