import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config.js";

/**
 * Пакет A — безопасные (read-only) API-тесты.
 *
 * Только читают данные через API (GET) и проверяют валидацию (400/404).
 * Не пишут в БД, поэтому независимы друг от друга и могут выполняться
 * параллельно в рамках пакета. Требуют засеянной тестовой БД
 * (данные должны быть загружены до запуска пакета).
 *
 * Запуск (обычно через оркестратор scripts/test-runner.mjs):
 *   npx playwright test -c playwright.safe-api.config.ts
 */
export default defineConfig({
  ...baseConfig,
  testDir: "./e2e",
  /* Только спеки этого пакета */
  testMatch: [
    "e2e/api-data-new-contract.spec.ts",
    "e2e/api-get-data-fix.spec.ts",
    "e2e/api-get-data.spec.ts",
    "e2e/api.integration.spec.ts",
  ],
  /* Read-only API-тесты не пишут в БД — можно параллелить внутри пакета.
     workers ограничен (3 ядра у сервера), чтобы не перегрузить контур. */
  workers: 2,
  retries: 1,
  reporter: "line",
});
