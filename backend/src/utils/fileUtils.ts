/**
 * Утилиты для работы с файлами
 */

import { existsSync, mkdirSync } from "fs";
import { join, dirname, extname, basename } from "path";

/**
 * Генерация имени файла с timestamp
 * @param originalFilename - оригинальное имя файла
 * @returns имя файла с timestamp в формате: filename_YYYYMMDDHHmmss.ext
 */
export function generateTimestampFilename(originalFilename: string): string {
  const ext = extname(originalFilename);
  const baseName = basename(originalFilename, ext);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
    .replace("T", "_");
  return `${baseName}_${timestamp}${ext}`;
}

/**
 * Проверка расширения файла
 * @param filename - имя файла
 * @param allowedExtensions - массив разрешенных расширений (без точки)
 * @returns true если расширение разрешено
 */
export function checkFileExtension(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const ext = extname(filename).toLowerCase().replace(".", "");
  return allowedExtensions.includes(ext);
}

/**
 * Создание директории, если она не существует
 * @param dirPath - путь к директории
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Получение типа файла из расширения
 * @param filename - имя файла
 * @returns тип файла: csv, xlsx, или undefined
 */
export function getFileType(filename: string): "csv" | "xlsx" | undefined {
  const ext = extname(filename).toLowerCase().replace(".", "");
  if (ext === "csv") return "csv";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  return undefined;
}

/**
 * Формирование пути к файлу в директории processed
 * @param targetTable - целевая таблица (balance, и т.д.)
 * @param filename - имя файла
 * @param baseDir - базовая директория (по умолчанию "row/processed")
 * @returns полный путь к файлу
 */
export function getProcessedFilePath(
  targetTable: string,
  filename: string,
  baseDir: string = "row/processed"
): string {
  const dirPath = join(baseDir, targetTable);
  ensureDirectoryExists(dirPath);
  return join(dirPath, filename);
}
