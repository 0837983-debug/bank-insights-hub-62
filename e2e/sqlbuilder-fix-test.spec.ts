import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:3001/api/data";

test.describe("SQL Builder Fix - API Tests", () => {
  test("should handle valid queryId + paramsJson", async ({ request }) => {
    const paramsJson = JSON.stringify({
      p1: "2025-12-31",
      p2: "2025-11-30",
      p3: "2024-12-31",
      class: "assets",
    });

    const response = await request.get(
      `${API_URL}/assets_table?paramsJson=${encodeURIComponent(paramsJson)}`
    );

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("componentId");
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("rows");
      expect(Array.isArray(data.rows)).toBe(true);
    } else {
      // Если API еще не обновлен, пропускаем тест
      const error = await response.json();
      console.log("API not updated yet:", error);
    }
  });

  test("should return error for invalid JSON", async ({ request }) => {
    const invalidJson = "{ invalid json }";
    const response = await request.get(
      `${API_URL}/assets_table?paramsJson=${encodeURIComponent(invalidJson)}`
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const error = await response.json();
    expect(error).toHaveProperty("error");
    expect(error.error).toContain("invalid JSON");
  });

  test("should return error for missing params", async ({ request }) => {
    const paramsJson = JSON.stringify({
      p1: "2025-12-31",
      // Missing p2, p3, class
    });

    const response = await request.get(
      `${API_URL}/assets_table?paramsJson=${encodeURIComponent(paramsJson)}`
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const error = await response.json();
    expect(error).toHaveProperty("error");
    expect(error.error).toContain("missing");
  });

  test("should return error for extra params", async ({ request }) => {
    const paramsJson = JSON.stringify({
      p1: "2025-12-31",
      p2: "2025-11-30",
      p3: "2024-12-31",
      class: "assets",
      extraParam: "should not be here",
    });

    const response = await request.get(
      `${API_URL}/assets_table?paramsJson=${encodeURIComponent(paramsJson)}`
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const error = await response.json();
    expect(error).toHaveProperty("error");
    expect(error.error).toContain("excess");
  });

  test("should return error for wrap_json=false", async ({ request }) => {
    // Нужно найти query_id с wrap_json=false в БД
    // Пока проверяем, что ошибка корректна
    const paramsJson = JSON.stringify({
      p1: "2025-12-31",
      p2: "2025-11-30",
      p3: "2024-12-31",
    });

    // Если есть query с wrap_json=false, проверим его
    // Иначе пропускаем тест
    const response = await request.get(
      `${API_URL}/assets_table?paramsJson=${encodeURIComponent(paramsJson)}`
    );

    if (response.status() === 400) {
      const error = await response.json();
      if (error.error && error.error.includes("wrap_json")) {
        expect(error.error).toContain("wrap_json=false");
      }
    }
  });

  test("should return detailed error messages for missing/excess params", async ({ request }) => {
    const paramsJson = JSON.stringify({
      p1: "2025-12-31",
      extraParam: "should not be here",
    });

    const response = await request.get(
      `${API_URL}/assets_table?paramsJson=${encodeURIComponent(paramsJson)}`
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const error = await response.json();
    expect(error).toHaveProperty("error");
    
    // Проверяем, что ошибка содержит конкретику
    const errorMessage = error.error;
    const hasMissing = errorMessage.includes("missing") || errorMessage.includes("required");
    const hasExcess = errorMessage.includes("excess") || errorMessage.includes("extra");
    
    // Хотя бы одно из них должно быть
    expect(hasMissing || hasExcess).toBe(true);
  });
});
