#!/usr/bin/env npx tsx
/**
 * CLI утилита для чтения CSV/XLSX файлов
 * Использует существующий fileParserService
 * 
 * Использование:
 *   npx tsx backend/src/scripts/read-file.ts <путь_к_файлу> [limit] [--sheet=имя_листа]
 * 
 * Примеры:
 *   npx tsx backend/src/scripts/read-file.ts /path/to/file.xlsx
 *   npx tsx backend/src/scripts/read-file.ts /path/to/file.xlsx 10
 *   npx tsx backend/src/scripts/read-file.ts /path/to/file.xlsx 20 --sheet=Sheet1
 *   npx tsx backend/src/scripts/read-file.ts /path/to/file.csv 50
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { parseXLSX, parseCSV } from "../services/upload/fileParserService.js";
import { getFileType } from "../utils/fileUtils.js";

async function main() {
  const args = process.argv.slice(2);
  
  // Парсинг аргументов
  const filePath = args.find(a => !a.startsWith("--") && isNaN(parseInt(a))) || args[0];
  const limitArg = args.find(a => !a.startsWith("--") && !isNaN(parseInt(a)));
  const limit = limitArg ? parseInt(limitArg) : 20;
  const sheetArg = args.find(a => a.startsWith("--sheet="));
  const sheetName = sheetArg ? sheetArg.replace("--sheet=", "") : undefined;

  if (!filePath) {
    console.error("Использование: npx tsx backend/src/scripts/read-file.ts <путь_к_файлу> [limit] [--sheet=имя_листа]");
    console.error("");
    console.error("Примеры:");
    console.error("  npx tsx backend/src/scripts/read-file.ts /path/to/file.xlsx");
    console.error("  npx tsx backend/src/scripts/read-file.ts /path/to/file.xlsx 10");
    console.error("  npx tsx backend/src/scripts/read-file.ts /path/to/file.xlsx 20 --sheet=Sheet1");
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`Ошибка: Файл не найден: ${filePath}`);
    process.exit(1);
  }

  try {
    const buffer = await readFile(filePath);
    const fileType = getFileType(filePath);

    if (!fileType || !["csv", "xlsx"].includes(fileType)) {
      console.error(`Ошибка: Неподдерживаемый тип файла. Поддерживаются: csv, xlsx`);
      process.exit(1);
    }

    console.error(`Читаю файл: ${filePath} (${fileType})`);
    
    let result;
    if (fileType === "xlsx") {
      result = await parseXLSX(buffer, sheetName);
      console.error(`Лист: ${result.sheetName}`);
      if (result.availableSheets && result.availableSheets.length > 1) {
        console.error(`Доступные листы: ${result.availableSheets.join(", ")}`);
      }
    } else {
      result = await parseCSV(buffer);
    }

    console.error(`Всего строк: ${result.rows.length}`);
    console.error(`Показываю первые ${Math.min(limit, result.rows.length)} строк`);
    console.error("---");

    // Выводим результат в stdout (JSON)
    const output = {
      file: filePath,
      type: fileType,
      sheetName: result.sheetName,
      availableSheets: result.availableSheets,
      headers: result.headers,
      rowCount: result.rows.length,
      previewLimit: limit,
      preview: result.rows.slice(0, limit)
    };

    console.log(JSON.stringify(output, null, 2));

  } catch (error) {
    console.error(`Ошибка при чтении файла: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main();
