/**
 * Docker dev stack smoke tests.
 *
 * Preconditions (manual, before running with E2E_DOCKER_MODE=true):
 *   cp .env.docker.example .env   # COMPOSE_PROFILES=full
 *   docker compose -f docker-compose.dev.yml up -d
 *   docker compose -f docker-compose.dev.yml run --rm db-bootstrap
 *
 * Run:
 *   E2E_DOCKER_MODE=true npx playwright test e2e/docker-smoke.spec.ts --reporter=list
 *
 * Skip behaviour:
 *   When E2E_DOCKER_MODE is not "true", all tests in this file are skipped gracefully.
 *   Use this on machines without Docker or when the compose stack is not running.
 */
import { test, expect } from "@playwright/test";

const DOCKER_MODE = process.env.E2E_DOCKER_MODE === "true";

const API_BASE_URL =
  process.env.E2E_DOCKER_API_URL ?? "http://localhost:3001/api";
const FRONTEND_URL =
  process.env.E2E_DOCKER_FRONTEND_URL ?? "http://localhost:8080";

test.describe("Docker dev stack smoke", () => {
  test.skip(
    !DOCKER_MODE,
    "Skipped: set E2E_DOCKER_MODE=true when docker compose dev stack is up and bootstrapped"
  );

  test("GET /api/health returns ok", async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);

    expect(response.status()).toBeLessThan(600);

    const data = await response.json();
    expect(data.services?.backend?.status).toBe("ok");
    expect(data.status).toMatch(/^(ok|degraded)$/);
  });

  test("GET /api/data?query_id=layout returns layout sections", async ({
    request,
  }) => {
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

  test("frontend loads at :8080", async ({ page }) => {
    await page.goto(FRONTEND_URL);

    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/Операционные метрики небанковского банка/);
    await expect(page.locator("body")).toBeVisible();
  });
});
