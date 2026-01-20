import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("Удаление /api/layout endpoint", () => {
  test("should return 404 for /api/layout", async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/layout`);
    
    // Должен вернуть 404 или error "Route not found"
    expect([404, 400]).toContain(response.status());
    
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toMatch(/Route not found|Not found|404/i);
  });

  test("should use /api/data?query_id=layout instead", async ({ request }) => {
    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const response = await request.get(
      `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty("sections");
    expect(Array.isArray(data.sections)).toBe(true);
    expect(data.sections.length).toBeGreaterThan(0);
  });

  test("should have formats section in new endpoint", async ({ request }) => {
    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const response = await request.get(
      `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
    );

    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    const formatsSection = data.sections.find((s: any) => s.id === "formats");
    
    expect(formatsSection).toBeDefined();
    expect(formatsSection).toHaveProperty("formats");
  });

  test("should have header section in new endpoint", async ({ request }) => {
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
  });
});
