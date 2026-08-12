/**
 * Защитный контур перед вливанием в dev/main (Husky pre-push).
 *
 * Выполняется локально при `git push`. Если пуш идёт в ветку `dev` или `main`,
 * сначала прогоняются все тесты на ИЗОЛИРОВАННОМ тестовом контуре
 * (docker-compose.test.yml). Если хотя бы один тест упал — пуш блокируется
 * (exit 1), слияние не выполняется.
 *
 * Данные о пуше приходят на stdin в виде строк:
 *   "<local-ref> <local-sha> <remote-ref> <remote-sha>"
 * remote-ref вида "refs/heads/dev" / "refs/heads/main" включает защиту.
 */
import { runTests } from "./test-runner.mjs";
import { runStaticChecks } from "./run-static-checks.mjs";

/** Ветки, защищённые тестовым контуром перед пушем. */
const PROTECTED_BRANCHES = ["dev", "main"];

/**
 * Определяет, является ли remote-ref защищённой веткой.
 * @param {string} remoteRef - например "refs/heads/dev" или "refs/heads/feature/auth"
 */
function isProtected(remoteRef) {
  return PROTECTED_BRANCHES.some((b) => remoteRef === `refs/heads/${b}`);
}

/** Получает remote-ref из stdin pre-push (3-я позиция каждой строки). */
async function getRemoteRefsFromStdin() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input
    .split("\n")
    .map((line) => line.split(/\s+/)[2]) // remote-ref — 3-я позиция
    .filter(Boolean);
}

const remoteRefs = await getRemoteRefsFromStdin();
const protectedRefs = remoteRefs.filter(isProtected);

if (protectedRefs.length === 0) {
  console.log(
    "[pre-push] Пуш не в защищённую ветку (dev/main) — тесты не запускаю."
  );
  process.exit(0);
}

console.log(
  `[pre-push] Пуш в защищённую ветку: ${protectedRefs.join(", ")}. Запускаю статические проверки и тесты...`
);

try {
  // Сначала быстрые статические проверки (tsc + eslint) — при ошибке
  // сразу блокируем, не тратя время на тяжёлые E2E-тесты.
  runStaticChecks("pre-push");
  runTests("pre-push");
  console.log("\n=== [pre-push] Все проверки прошли. Пуш разрешён. ===");
  process.exit(0);
} catch (error) {
  console.error(
    `\n=== [pre-push] ПРОВЕРКИ НЕ ПРОШЛИ. Пуш в ${protectedRefs.join(", ")} ОТКЛОНЁН. ===\n`
  );
  console.error(String(error?.stderr ?? error));
  process.exit(1);
}
