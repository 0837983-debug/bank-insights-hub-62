import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config.js";

/**
 * Отдельный конфиг для ДЕСТРУКТИВНЫХ тестов (e2e/destructive/).
 *
 * Эти тесты пишут/перезаписывают данные в базе данных (загрузка CSV,
 * db:reset, db-seed, создание/удаление пользователей). Они изолированы,
 * чтобы обычный прогон (playwright.config.ts) НЕ затрагивал реальные данные.
 *
 * Запуск ТОЛЬКО осознанно, на тестовом стенде:
 *   E2E_DOCKER_MODE=true npx playwright test -c playwright.destructive.config.ts
 */
export default defineConfig({
  ...baseConfig,
  /* Запускаем только деструктивные спеки (внутри e2e/destructive) */
  testDir: "./e2e/destructive",
  testIgnore: undefined,
  /* Деструктивные тесты конкурируют за одну тестовую БД (db:reset, db-seed,
     загрузка CSV). Параллельный запуск приводит к гонке данных, поэтому
     выполняем строго последовательно. */
  workers: 1,
});
