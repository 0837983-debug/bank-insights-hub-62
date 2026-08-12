/**
 * Общий прогон тестов на изолированном тестовом контуре.
 *
 * Переиспользуется защитными хуками pre-push и pre-merge-commit.
 * При падении хотя бы одного теста выбрасывает исключение (caller решает,
 * блокировать операцию или нет).
 */
import { execSync } from "node:child_process";

/** Команда поднятия тестового контура. */
const TEST_COMPOSE_UP = "docker compose -f docker-compose.test.yml up -d";

/** Проверяет, доступен ли тестовый backend (3002). */
export function isTestBackendReady() {
  try {
    const out = execSync("curl -s http://127.0.0.1:3002/api/health", {
      encoding: "utf-8",
      timeout: 5000,
    });
    return out.includes('"status":"ok"') || out.includes('"status":"degraded"');
  } catch {
    return false;
  }
}

/**
 * Прогоняет безопасные + деструктивные E2E-тесты на тестовом контуре.
 * @param {string} hookName - имя хука для логов (например "pre-push", "pre-merge").
 * @throws если любой из прогонов завершился с ошибкой.
 */
export function runTests(hookName = "pre-push") {
  const env = { ...process.env, E2E_DOCKER_MODE: "true" };

  console.log(`\n=== [${hookName}] Поднимаю тестовый контур, если он не запущен ===`);
  if (!isTestBackendReady()) {
    execSync(TEST_COMPOSE_UP, { stdio: "inherit", timeout: 300000 });
  }

  console.log(`\n=== [${hookName}] Прогон безопасных E2E-тестов ===`);
  execSync("npx playwright test --reporter=line", {
    env,
    stdio: "inherit",
    timeout: 900000,
  });

  console.log(`\n=== [${hookName}] Прогон деструктивных E2E-тестов ===`);
  execSync(
    "npx playwright test -c playwright.destructive.config.ts --reporter=line",
    {
      env,
      stdio: "inherit",
      timeout: 1200000,
    }
  );
}
