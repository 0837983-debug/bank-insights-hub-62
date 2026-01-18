/**
 * Сервис для сохранения загруженных файлов
 */

import { writeFile } from "fs/promises";
import {
  generateTimestampFilename,
  getProcessedFilePath,
  ensureDirectoryExists,
} from "../../utils/fileUtils.js";
import { join } from "path";

/**
 * Сохранение файла локально в директории processed
 * @param fileBuffer - содержимое файла (Buffer)
 * @param originalFilename - оригинальное имя файла
 * @param targetTable - целевая таблица (balance, и т.д.)
 * @param baseDir - базовая директория (по умолчанию "row/processed")
 * @returns полный путь к сохраненному файлу и новое имя файла
 */
export async function saveUploadedFile(
  fileBuffer: Buffer,
  originalFilename: string,
  targetTable: string,
  baseDir: string = "row/processed"
): Promise<{ filePath: string; filename: string }> {
  try {
    // Генерируем имя файла с timestamp
    const filename = generateTimestampFilename(originalFilename);

    // Формируем путь к файлу
    const filePath = getProcessedFilePath(targetTable, filename, baseDir);

    // Создаем директории при необходимости (внутри getProcessedFilePath)
    const dirPath = join(baseDir, targetTable);
    ensureDirectoryExists(dirPath);

    // Сохраняем файл
    await writeFile(filePath, fileBuffer);

    return {
      filePath,
      filename,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Ошибка сохранения файла: ${error.message}`);
    }
    throw new Error("Неизвестная ошибка при сохранении файла");
  }
}
