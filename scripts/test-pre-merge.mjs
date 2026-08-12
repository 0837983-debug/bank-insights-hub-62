/**
 * Защитный контур перед локальным слиянием в dev/main (Husky pre-merge-commit).
 *
 * Выполняется при `git merge` в ветку `dev` или `main`. Перед созданием
 * коммита слияния прогоняются все тесты на изолированном тестовом контуре.
 * Если хотя бы один тест упал — коммит слияния блокируется (exit 1), ветка
 * не получает некачественный код.
 *
 * ВАЖНО: хук pre-merge-commit срабатывает ТОЛЬКО при создании коммита слияния.
 * При fast-forward-слиянии (когда ветка просто передвигается вперёд) коммит
 * слияния не создаётся, и этот хук не вызывается. Поэтому для защищённых
 * веток fast-forward отключается через merge.ff=false (см. setup-merge-protection).
 */
import { execSync } from "node:child_process";
import { runTests } from "./test-runner.mjs";
import { runStaticChecks } from "./run-static-checks.mjs";

/** Ветки, защищённые тестовым контуром при слиянии. */
const PROTECTED_BRANCHES = ["dev", "main"];

/** Возвращает имя текущей ветки (цель слияния). */
function currentBranch() {
  try {
    return execSync("git branch --show-current", { encoding: "utf-8" })
      .trim()
      .split("\n")
      .pop();
  } catch {
    return "";
  }
}

const branch = currentBranch();

if (!PROTECTED_BRANCHES.includes(branch)) {
  console.log(
    `[pre-merge] Слияние не в защищённую ветку (${branch || "?"}) — тесты не запускаю.`
  );
  process.exit(0);
}

console.log(
  `[pre-merge] Слияние в защищённую ветку "${branch}". Запускаю статические проверки и тесты...`
);

try {
  // Сначала быстрые статические проверки (tsc + eslint) — при ошибке
  // сразу блокируем, не тратя время на тяжёлые E2E-тесты.
  runStaticChecks("pre-merge");
  runTests("pre-merge");
  console.log("\n=== [pre-merge] Все проверки прошли. Слияние разрешено. ===");
  process.exit(0);
} catch (error) {
  console.error(
    `\n=== [pre-merge] ПРОВЕРКИ НЕ ПРОШЛИ. Слияние в "${branch}" ОТКЛОНЕНО. ===\n`
  );
  console.error(String(error?.stderr ?? error));
  process.exit(1);
}
