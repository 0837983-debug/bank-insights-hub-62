import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config.js";

/**
 * Пакет B — безопасные (read-only) UI-тесты.
 *
 * Проверяют фронтенд: отображение KPI-карточек, таблиц, заголовка, навигацию,
 * авторизацию. Только читают данные, не пишут в БД. Независимы между собой,
 * выполняются параллельно в рамках пакета. Требуют засеянной тестовой БД.
 *
 * Запуск (обычно через оркестратор scripts/test-runner.mjs):
 *   npx playwright test -c playwright.safe-ui.config.ts
 */
export default defineConfig({
  ...baseConfig,
  testDir: "./e2e",
  /* Только спеки этого пакета */
  testMatch: [
    "e2e/kpi-cards-display.spec.ts",
    "e2e/header-component.spec.ts",
    "e2e/layout-query-id.spec.ts",
    "e2e/button-components.spec.ts",
    "e2e/frontend-table-display.spec.ts",
    "e2e/auth.spec.ts",
    "e2e/basic.spec.ts",
    "e2e/app-shell-nav.spec.ts",
    "e2e/security.spec.ts",
  ],
  /* Read-only UI-тесты независимы — можно параллелить. workers ограничен
     (3 ядра), чтобы не перегрузить тестовый контур (backend + frontend). */
  workers: 2,
  retries: 1,
  reporter: "line",
});
