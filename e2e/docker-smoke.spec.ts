/**
 * Docker dev stack smoke tests.
 *
 * Preconditions (manual, before running with E2E_DOCKER_MODE=true):
 *   cp .env.docker.example .env   # COMPOSE_PROFILES=full
 *   docker compose -f docker-compose.dev.yml up -d
 *   docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
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

function mapPeriodsFromHeaderRows(rows: Array<Record<string, unknown>>) {
  const p1 = rows.find((row) => row.isP1)?.periodDate;
  const p2 = rows.find((row) => row.isP2)?.periodDate;
  const p3 = rows.find((row) => row.isP3)?.periodDate;

  return { p1, p2, p3 };
}

async function getHeaderPeriods(request: import("@playwright/test").APIRequestContext) {
  const response = await request.get(
    `${API_BASE_URL}/data?query_id=header_dates&component_Id=header&parametrs=${encodeURIComponent("{}")}`
  );
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  expect(rows.length).toBeGreaterThan(0);

  const periods = mapPeriodsFromHeaderRows(rows);
  expect(periods.p1).toBeTruthy();
  expect(periods.p2).toBeTruthy();
  expect(periods.p3).toBeTruthy();

  return periods;
}

function assertNoWrapJsonError(data: unknown) {
  const serialized = JSON.stringify(data);
  expect(serialized).not.toMatch(/wrap_json|wrapJson/i);
}

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

  test("GET /api/data?query_id=layout includes header section", async ({
    request,
  }) => {
    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const response = await request.get(
      `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    const headerSection = data.sections?.find(
      (section: { id?: string }) => section.id === "header"
    );
    const headerComponent = data.sections
      ?.flatMap(
        (section: { components?: Array<{ componentId?: string; id?: string }> }) =>
          section.components ?? []
      )
      .find(
        (component: { componentId?: string; id?: string }) =>
          component.componentId === "header" || component.id === "header"
      );

    expect(headerSection ?? headerComponent).toBeDefined();
  });

  test("GET /api/data?query_id=header_dates returns p1, p2, p3 periods", async ({
    request,
  }) => {
    const response = await request.get(
      `${API_BASE_URL}/data?query_id=header_dates&component_Id=header&parametrs=${encodeURIComponent("{}")}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    expect(rows.length).toBeGreaterThan(0);

    const periods = mapPeriodsFromHeaderRows(rows);
    expect(periods.p1).toBeTruthy();
    expect(periods.p2).toBeTruthy();
    expect(periods.p3).toBeTruthy();
    expect(new Set([periods.p1, periods.p2, periods.p3]).size).toBe(3);
  });

  test("GET /api/data?query_id=kpis returns valid KPI data", async ({
    request,
  }) => {
    const periods = await getHeaderPeriods(request);

    const paramsJson = JSON.stringify({
      p1: periods.p1,
      p2: periods.p2,
      p3: periods.p3,
      layout_id: "main_dashboard",
    });
    const response = await request.get(
      `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data?.error).not.toBe("invalid config");

    const kpis = Array.isArray(data) ? data : (data.rows ?? []);
    expect(Array.isArray(kpis)).toBe(true);
    expect(kpis.length).toBeGreaterThan(0);
  });

  test("GET /api/data?query_id=table_balance returns rows without wrap_json error", async ({
    request,
  }) => {
    const periods = await getHeaderPeriods(request);
    const paramsJson = JSON.stringify({
      p1: periods.p1,
      p2: periods.p2,
      p3: periods.p3,
    });

    const response = await request.get(
      `${API_BASE_URL}/data?query_id=table_balance&component_Id=table_balance&parametrs=${encodeURIComponent(paramsJson)}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    assertNoWrapJsonError(data);
    expect(data?.error).toBeUndefined();

    const rows = Array.isArray(data?.rows) ? data.rows : [];
    expect(rows.length).toBeGreaterThan(0);
  });

  test("GET /api/data?query_id=layout includes fin_results_table with columns", async ({
    request,
  }) => {
    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const response = await request.get(
      `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    const finResultsSection = data.sections?.find(
      (section: { id?: string }) =>
        section.id === "section_financial_results" ||
        section.id?.includes("fin_results")
    );
    expect(finResultsSection).toBeDefined();

    const finResultsTable = finResultsSection?.components?.find(
      (component: { componentId?: string; id?: string }) =>
        component.componentId === "fin_results_table" ||
        component.id?.includes("fin_results_table")
    );
    expect(finResultsTable).toBeDefined();
    expect(Array.isArray(finResultsTable?.columns)).toBe(true);
    expect(finResultsTable.columns.length).toBeGreaterThan(0);
  });

  test("GET /api/data?query_id=fin_results_table returns rows", async ({
    request,
  }) => {
    const periods = await getHeaderPeriods(request);
    const paramsJson = JSON.stringify({
      p1: periods.p1,
      p2: periods.p2,
      p3: periods.p3,
    });

    const response = await request.get(
      `${API_BASE_URL}/data?query_id=fin_results_table&component_Id=fin_results_table&parametrs=${encodeURIComponent(paramsJson)}`
    );

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    assertNoWrapJsonError(data);
    expect(data?.error).toBeUndefined();

    const rows = Array.isArray(data?.rows) ? data.rows : [];
    expect(rows.length).toBeGreaterThan(0);
  });

  test("GET /api/data?query_id=kpis returns fin_results card with non-null p1 value", async ({
    request,
  }) => {
    const periods = await getHeaderPeriods(request);

    const layoutParams = JSON.stringify({ layout_id: "main_dashboard" });
    const layoutResponse = await request.get(
      `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(layoutParams)}`
    );
    expect(layoutResponse.ok()).toBeTruthy();

    const layoutData = await layoutResponse.json();
    const finResultsSection = layoutData.sections?.find(
      (section: { id?: string }) =>
        section.id === "section_financial_results" ||
        section.id?.includes("fin_results")
    );
    const finResultsCardIds = new Set(
      (finResultsSection?.components ?? [])
        .filter(
          (component: { type?: string }) => component.type === "card"
        )
        .map(
          (component: { componentId?: string }) => component.componentId
        )
        .filter(Boolean)
    );
    expect(finResultsCardIds.size).toBeGreaterThan(0);

    const kpiParams = JSON.stringify({
      p1: periods.p1,
      p2: periods.p2,
      p3: periods.p3,
      layout_id: "main_dashboard",
    });
    const kpiResponse = await request.get(
      `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(kpiParams)}`
    );
    expect(kpiResponse.ok()).toBeTruthy();

    const kpiData = await kpiResponse.json();
    const kpis = Array.isArray(kpiData) ? kpiData : (kpiData.rows ?? []);
    const finResultsKpis = kpis.filter((kpi: { componentId?: string }) =>
      finResultsCardIds.has(kpi.componentId ?? "")
    );
    expect(finResultsKpis.length).toBeGreaterThan(0);

    const hasNonNullP1Value = finResultsKpis.some(
      (kpi: { value?: unknown }) => kpi.value !== null && kpi.value !== undefined
    );
    expect(hasNonNullP1Value).toBe(true);
  });

  test("frontend loads at :8080", async ({ page }) => {
    await page.goto(FRONTEND_URL);

    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveTitle(/Операционные метрики небанковского банка/);
    await expect(page.locator("body")).toBeVisible();
  });
});
