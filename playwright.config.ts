import { defineConfig, devices } from "@playwright/test";
import { FRONTEND_URL } from "./e2e/config.js";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

const isDockerSmokeRun = process.argv.some((arg) =>
  arg.includes("docker-smoke") || arg.includes("docker-db-seed")
);
const isApiOnlyRun = process.argv.some((arg) =>
  arg.includes("api.integration")
);
const skipWebServer =
  process.env.E2E_DOCKER_MODE === "true" || isDockerSmokeRun;

const backendDevCommand =
  process.platform === "win32"
    ? 'cd backend && cmd /c "set FRONTEND_URL=http://127.0.0.1:3001/api-docs&& npm run dev"'
    : "cd backend && FRONTEND_URL=http://127.0.0.1:3001/api-docs npm run dev";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Деструктивные тесты (пишут/перезаписывают данные в БД) изолированы
     в e2e/destructive/ и исключены из обычного прогона.
     Запуск только явно: npx playwright test e2e/destructive/... */
  testIgnore: "e2e/destructive/**",
  /* Один вход администратора на весь прогон — токен сохраняется в .auth */
  globalSetup: "./e2e/global-setup.ts",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: FRONTEND_URL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests (not for docker-smoke) */
  webServer: skipWebServer
    ? undefined
    : isApiOnlyRun
      ? [
          {
            command: backendDevCommand,
            url: "http://localhost:3001/api/health",
            reuseExistingServer: true,
            timeout: 120 * 1000,
          },
        ]
      : [
          {
            command: "npm run dev",
            url: "http://localhost:8080",
            reuseExistingServer: true,
            timeout: 120 * 1000,
          },
          {
            command: backendDevCommand,
            url: "http://localhost:3001/api/health",
            reuseExistingServer: true,
            timeout: 120 * 1000,
          },
        ],
});

