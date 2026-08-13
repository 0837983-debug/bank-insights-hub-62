/**
 * Автоматически приводит к единому стилю и исправляет правила
 * для файлов, добавленных в индекс (staged) перед фиксацией.
 *
 * Запускается из pre-commit хука до фиксации. Скрипт получает список
 * staged-файлов, применяет к ним форматирование Prettier и автоисправление
 * ESLint (--fix), после чего повторно добавляет изменённые файлы в индекс.
 * Завершается с кодом 1 при ошибке инструмента, чтобы блокировать фиксацию.
 */
import { execSync } from "node:child_process";

/** Расширения, которые обрабатывает автоисправление. */
const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".md"];

/** Возвращает список staged-файлов, поддержанных автоисправлением. */
function stagedFiles() {
  const raw = execSync(
    "git diff --cached --name-only --diff-filter=ACM",
    { encoding: "utf-8" }
  );
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((name) => SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext)));
}

/** Применяет Prettier и ESLint --fix к списку файлов. */
function autoFix(files) {
  if (files.length === 0) {
    return;
  }

  const prettierCmd = `npx prettier --write ${files.join(" ")}`;
  const eslintCmd = `npx eslint --ext .ts,.tsx --fix ${files.join(" ")}`;

  console.log(`[автоформат] Привожу к единому стилю ${files.length} файл(ов):`);
  console.log(`  ${files.join("\n  ")}`);

  try {
    execSync(prettierCmd, { stdio: "inherit", encoding: "utf-8" });
  } catch (error) {
    console.error("[автоформат] Ошибка форматирования Prettier.");
    process.exit(1);
  }

  try {
    execSync(eslintCmd, { stdio: "inherit", encoding: "utf-8" });
  } catch (error) {
    console.error("[автоформат] Ошибка автокоррекции ESLint.");
    process.exit(1);
  }

  // Повторно добавляем изменённые файлы в индекс, чтобы фиксация включила правки.
  execSync(`git add ${files.join(" ")}`, { encoding: "utf-8" });
  console.log("[автоформат] Готово: файлы приведены к единому стилю и снова в индексе.");
}

const files = stagedFiles();
autoFix(files);
