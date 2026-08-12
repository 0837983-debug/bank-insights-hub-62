/**
 * Docker db-seed smoke test.
 *
 * Preconditions (manual, before running with E2E_DOCKER_MODE=true):
 *   cp .env.docker.example .env   # COMPOSE_PROFILES=full
 *   docker compose -f docker-compose.dev.yml up -d
 *   docker compose -f docker-compose.dev.yml --profile bootstrap run --rm db-bootstrap
 *
 * Run:
 *   E2E_DOCKER_MODE=true npx playwright test e2e/docker-db-seed.spec.ts --reporter=list
 *
 * Verifies canonical seed path (no manual -v):
 *   docker compose -f docker-compose.dev.yml --profile seed run --rm db-seed
 *
 * Skip behaviour:
 *   When E2E_DOCKER_MODE is not "true", all tests in this file are skipped gracefully.
 */
import { execSync } from "node:child_process";
import { test, expect } from "@playwright/test";

const DOCKER_MODE = process.env.E2E_DOCKER_MODE === "true";

const API_BASE_URL =
  process.env.E2E_DOCKER_API_URL ?? "http://localhost:3001/api";
const COMPOSE_FILE =
  process.env.E2E_DOCKER_COMPOSE_FILE ?? "docker-compose.dev.yml";
const DB_NAME = process.env.DB_NAME ?? "bankdb_local";
const DB_USER = process.env.DB_USER ?? "bank_local_user";
const DB_SEED_TIMEOUT_MS = 10 * 60 * 1000;

function runDockerDbSeed(): string {
  return execSync(
    `docker compose -f ${COMPOSE_FILE} --profile seed run --rm db-seed`,
    {
      cwd: process.cwd(),
      stdio: "pipe",
      encoding: "utf-8",
      timeout: DB_SEED_TIMEOUT_MS,
    }
  );
}

function getMartFinResultsCount(): number {
  const output = execSync(
    `docker compose -f ${COMPOSE_FILE} exec -T postgres psql -U ${DB_USER} -d ${DB_NAME} -t -A -c "SELECT COUNT(*) FROM mart.fin_results;"`,
    {
      cwd: process.cwd(),
      stdio: "pipe",
      encoding: "utf-8",
      timeout: 30_000,
    }
  );

  const count = Number.parseInt(output.trim(), 10);
  expect(Number.isNaN(count)).toBe(false);
  return count;
}

test.describe("Docker db-seed", () => {
  test.skip(
    !DOCKER_MODE,
    "Skipped: set E2E_DOCKER_MODE=true when docker compose dev stack is up and bootstrapped"
  );

  test("db-seed via compose exits 0 and mart.fin_results is not empty", async ({
    request,
  }) => {
    const healthResponse = await request.get(`${API_BASE_URL}/health`);
    expect(healthResponse.status()).toBeLessThan(600);
    const healthData = await healthResponse.json();
    expect(healthData.services?.backend?.status).toBe("ok");

    const seedOutput = runDockerDbSeed();
    expect(seedOutput).toMatch(/Seed completed successfully/i);

    const finResultsCount = getMartFinResultsCount();
    expect(finResultsCount).toBeGreaterThan(0);
  });
});
