/**
 * Общий прогон тестов на изолированном тестовом контуре.
 *
 * ПАКЕТНОЕ ТЕСТИРОВАНИЕ.
 *
 * Тесты разбиты на пакеты по признаку зависимости от состояния базы данных
 * и типу операций. Внутри пакета тесты независимы и выполняются параллельно,
 * между пакетами — последовательно, чтобы пакеты не конфликтовали между собой:
 *
 *   1. Пакет "safe-api" — read-only API-тесты (только чтение, параллельно).
 *   2. Пакет "safe-ui"  — read-only UI-тесты (только чтение, параллельно).
 *   3. Пакет "destructive" — пишут/перезаписывают БД (db:reset, db-seed,
 *      загрузка CSV, пользователи) — строго последовательно (workers=1),
 *      т.к. конкурируют за одну тестовую БД.
 *
 * Порядок важен: безопасные пакеты требуют засеянной БД, поэтому сначала
 * выполняется seed (наполнение тестовой БД), затем безопасные пакеты,
 * и только потом деструктивные.
 *
 * При падении хотя бы одного пакета — выбрасывается исключение (exit 1),
 * вызывающая сторона (pre-push/pre-merge-commit хук) блокирует операцию.
 */
import { execSync } from "node:child_process";

/** Команда поднятия тестового контура. */
const TEST_COMPOSE_UP = "docker compose -f docker-compose.test.yml up -d";

/** Команда наполнения тестовой БД (seed) на изолированном контуре. */
const TEST_DB_SEED =
  "docker compose -f docker-compose.test.yml --profile seed run --rm db-seed";

/** Определение пакетов и их конфигов. Каждый пакет независим внутри. */
const PACKAGES = [
  {
    name: "safe-api",
    command: "npx playwright test -c playwright.safe-api.config.ts --reporter=line",
    timeout: 1800000,
  },
  {
    name: "safe-ui",
    command: "npx playwright test -c playwright.safe-ui.config.ts --reporter=line",
    timeout: 1800000,
  },
  {
    name: "destructive",
    command:
      "npx playwright test -c playwright.destructive.config.ts --reporter=line",
    timeout: 1800000,
  },
];

/** Имя контейнера тестового backend. */
const TEST_BACKEND_CONTAINER = "bank-insights-backend-test";

/**
 * Перезапускает тестовый backend и дожидается его готовности.
 *
 * Тестовый backend монтирует исходники из volume и запускается через
 * `tsx watch`, который не всегда корректно перехватывает изменения кода
 * при монтировании через docker volume. Из-за этого e2e-тесты могут
 * выполняться на устаревшем коде и падать ложными ошибками. Принудительный
 * перезапуск контейнера гарантирует, что тесты идут на свежем коде.
 */
function restartTestBackend() {
  console.log(`\n=== Перезапускаю тестовый backend (${TEST_BACKEND_CONTAINER}) для актуализации кода ===`);
  execSync(`docker restart ${TEST_BACKEND_CONTAINER}`, {
    stdio: "inherit",
    timeout: 60000,
  });

  // Ожидаем готовности backend (до 60 секунд с шагом 2 секунды).
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (isTestBackendReady()) {
      console.log("=== Тестовый backend готов после перезапуска ===\n");
      return;
    }
    execSync("sleep 2", { stdio: "inherit" });
  }
  throw new Error(
    `Тестовый backend не стал доступен после перезапуска (${TEST_BACKEND_CONTAINER})`
  );
}

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
 * Прогоняет все пакеты тестов на тестовом контуре.
 * @param {string} hookName - имя хука для логов (например "pre-push", "pre-merge").
 * @throws если любой из пакетов завершился с ошибкой.
 */
export function runTests(hookName = "pre-push") {
  const env = { ...process.env, E2E_DOCKER_MODE: "true" };

  console.log(`\n=== [${hookName}] Поднимаю тестовый контур, если он не запущен ===`);
  if (!isTestBackendReady()) {
    execSync(TEST_COMPOSE_UP, { stdio: "inherit", timeout: 300000 });
  }

  console.log(`\n=== [${hookName}] Наполняю тестовую БД (seed) для безопасных пакетов ===`);
  execSync(TEST_DB_SEED, { env, stdio: "inherit", timeout: 1200000 });

  // Перезапускаем тестовый backend, чтобы e2e-тесты шли на свежем коде.
  restartTestBackend();

  for (const pkg of PACKAGES) {
    console.log(
      `\n=== [${hookName}] Пакет "${pkg.name}" — запускаю тесты ===`
    );
    execSync(pkg.command, { env, stdio: "inherit", timeout: pkg.timeout });
    console.log(`\n=== [${hookName}] Пакет "${pkg.name}" — ВСЕ ТЕСТЫ ПРОШЛИ ===`);
  }

  console.log("\n=== [pre-push/pre-merge] Все пакеты прошли успешно. ===");
}

/**
 * Прямой запуск из CLI (например `npm run test:e2e:packages`).
 * При импорте модуля хуками (pre-push/pre-merge) этот блок не выполняется.
 */
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1]);

if (isMain) {
  try {
    runTests("test:e2e:packages");
    process.exit(0);
  } catch (error) {
    console.error("\n=== [test:e2e:packages] ОШИБКА: тесты не прошли. ===");
    console.error(String(error?.stderr ?? error));
    process.exit(1);
  }
}
