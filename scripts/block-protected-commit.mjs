/**
 * Блокирует прямые фиксации (git commit) в защищённых ветках dev/main.
 *
 * Вызывается из pre-commit хука. Если текущая ветка является защищённой
 * (dev или main), скрипт выводит предупреждение и завершается с кодом 1,
 * что блокирует создание коммита. Работать с защищёнными ветками можно
 * только через слияние из feature-ветки (git merge), а не прямыми фиксациями.
 */
import { execSync } from "node:child_process";

/** Ветки, в которых запрещены прямые фиксации. */
const PROTECTED_BRANCHES = ["dev", "main"];

/** Возвращает имя текущей ветки. */
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

if (PROTECTED_BRANCHES.includes(branch)) {
  console.error(
    `\n[защита] Прямая фиксация (git commit) в ветке "${branch}" ЗАПРЕЩЕНА.`
  );
  console.error(
    `[защита] Работайте в feature-ветке и вливайте изменения через git merge (тесты проверятся автоматически).`
  );
  console.error(
    `[защита] Чтобы обойти защиту для осознанного действия, задайте переменную окружения ALLOW_PROTECTED_COMMIT=1.`
  );
  if (process.env.ALLOW_PROTECTED_COMMIT !== "1") {
    process.exit(1);
  }
}
