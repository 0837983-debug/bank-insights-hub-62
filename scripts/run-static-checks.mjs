/**
 * Быстрые статические проверки перед тяжёлыми E2E-тестами.
 *
 * Выполняет проверку типов TypeScript (tsc) и линтер (eslint) с запретом
 * на любые ОШИБКИ. Предупреждения (warnings) не блокируют — их можно чинить
 * постепенно, не останавливая слияние.
 *
 * Эти проверки выполняются ЗАРАНЕЕ и ПАРАЛЛЕЛЬНО с тяжёлыми E2E-тестами,
 * т.к. tsc/eslint работают на порядки быстрее поднятия тестового контура
 * и сразу отсекают типичные ошибки без прогона тестов.
 *
 * При наличии хотя бы одной ошибки типов или линтера — exit 1,
 * вызывающая сторона (pre-merge/pre-push хук) блокирует операцию.
 */
import { execSync } from "node:child_process";

/** Результат одной команды. */
function run(name, cmd) {
  console.log(`\n=== [static] Запускаю "${name}": ${cmd} ===`);
  try {
    execSync(cmd, { stdio: "inherit", timeout: 300000 });
    console.log(`=== [static] "${name}" — ОК ===`);
    return true;
  } catch (error) {
    console.error(`=== [static] "${name}" — НАЙДЕНЫ ПРОБЛЕМЫ ===`);
    console.error(String(error?.stderr ?? error?.message ?? error));
    return false;
  }
}

/**
 * Прогоняет статические проверки.
 * @param {string} hookName - имя хука для логов (например "pre-merge").
 * @throws если хотя бы одна проверка завершилась с ошибкой.
 */
export function runStaticChecks(hookName = "pre-merge") {
  const results = [
    run("TypeScript (tsc --noEmit)", "npx tsc --noEmit"),
    run("ESLint (ошибки запрещены)", "npx eslint . --ext .ts,.tsx --quiet"),
  ];

  const failed = results.filter((ok) => !ok).length;
  if (failed > 0) {
    throw new Error(
      `[${hookName}] Статические проверки: ${failed} из ${results.length} не прошли.`
    );
  }
  console.log(`\n=== [${hookName}] Статические проверки — все прошли. ===`);
}

/**
 * Прямой запуск из CLI.
 * При импорте модуля хуками этот блок не выполняется.
 */
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1]);

if (isMain) {
  try {
    runStaticChecks("static");
    process.exit(0);
  } catch (error) {
    console.error("\n=== [static] ОШИБКА: статические проверки не прошли. ===");
    console.error(String(error?.stderr ?? error));
    process.exit(1);
  }
}
