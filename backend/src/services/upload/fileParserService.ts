/**
 * Сервис для парсинга файлов (CSV, XLSX)
 */

import { parse as csvParse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { getFileType } from "../../utils/fileUtils.js";
import { excelSerialToDate, formatDateForSQL } from "../../utils/dateUtils.js";

export interface ParsedRow {
  [key: string]: string | number | null;
}

/**
 * Получение значения из объекта row с учётом регистра (case-insensitive)
 * @param row - объект строки данных
 * @param fieldName - имя поля (из mapping, может быть в любом регистре)
 * @returns значение поля или undefined, если поле не найдено
 */
export function getRowValue(row: ParsedRow, fieldName: string): string | number | null | undefined {
  // Сначала пробуем точное совпадение (для обратной совместимости)
  if (fieldName in row) {
    return row[fieldName];
  }
  
  // Ищем поле без учёта регистра
  const key = Object.keys(row).find(k => k.toLowerCase() === fieldName.toLowerCase());
  return key ? row[key] : undefined;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  sheetName?: string;
  availableSheets?: string[];
}

/**
 * Парсинг CSV файла с поддержкой разделителя `;`
 * @param fileBuffer - содержимое файла (Buffer)
 * @returns результат парсинга с заголовками и строками
 */
export async function parseCSV(fileBuffer: Buffer): Promise<ParseResult> {
  try {
    const content = fileBuffer.toString("utf-8");
    
    // Автоопределение разделителя (пробуем `;`, затем `,`)
    const delimiter = content.includes(";") ? ";" : ",";

    const records = csvParse(content, {
      columns: true, // Использовать первую строку как заголовки
      skip_empty_lines: true,
      trim: true,
      delimiter: delimiter,
      bom: true, // Поддержка BOM для UTF-8
    });

    if (records.length === 0) {
      throw new Error("CSV файл пуст или не содержит данных");
    }

    const headers = Object.keys(records[0]);
    
    // Преобразуем строки в объекты с правильными типами
    const rows: ParsedRow[] = records.map((record: any) => {
      const row: ParsedRow = {};
      for (const key of headers) {
        const value = record[key];
        // Сохраняем строки как есть, без преобразования в числа
        // Преобразование типов происходит на этапе валидации и загрузки в STG
        if (value && typeof value === "string" && value.trim() !== "") {
          row[key] = value.trim();
        } else {
          row[key] = value && typeof value === "string" ? value.trim() : null;
        }
      }
      return row;
    });

    return {
      headers,
      rows,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Ошибка парсинга CSV: ${error.message}`);
    }
    throw new Error("Неизвестная ошибка при парсинге CSV");
  }
}

/**
 * Парсинг XLSX файла с выбором листа
 * @param fileBuffer - содержимое файла (Buffer)
 * @param sheetName - имя листа (если не указано, используется первый лист)
 * @returns результат парсинга с заголовками и строками
 */
export async function parseXLSX(
  fileBuffer: Buffer,
  sheetName?: string
): Promise<ParseResult> {
  try {
    const workbook = new ExcelJS.Workbook();
    // ExcelJS ожидает Buffer, но TypeScript видит другой тип из-за версий библиотек
    // @ts-expect-error - проблема совместимости типов между версиями библиотек
    await workbook.xlsx.load(fileBuffer);

    // Получаем список доступных листов
    const availableSheets = workbook.worksheets.map((ws) => ws.name);

    if (availableSheets.length === 0) {
      throw new Error("XLSX файл не содержит листов");
    }

    // Выбираем лист для парсинга
    let worksheet = sheetName
      ? workbook.getWorksheet(sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      throw new Error(
        `Лист "${sheetName}" не найден. Доступные листы: ${availableSheets.join(", ")}`
      );
    }

    // Получаем заголовки из первой строки
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      const value = cell.value?.toString()?.trim();
      if (value) {
        headers.push(value);
      }
    });

    if (headers.length === 0) {
      throw new Error("XLSX файл не содержит заголовков в первой строке");
    }

    // Парсим строки данных (начиная со второй строки)
    const rows: ParsedRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Пропускаем строку заголовков

      const rowData: ParsedRow = {};
      let hasData = false;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const headerIndex = colNumber - 1;
        if (headerIndex < headers.length) {
          const header = headers[headerIndex];
          const value = cell.value;

          // Преобразуем значение в строку или число
          if (value === null || value === undefined) {
            rowData[header] = null;
          } else if (value instanceof Date) {
            // ExcelJS иногда сам конвертирует даты в Date объект
            rowData[header] = formatDateForSQL(value);
            hasData = true;
          } else if (typeof value === "number") {
            // Числа сохраняем как есть
            // Excel serial dates будут конвертированы на этапе загрузки в STG
            // на основании типа поля из маппинга (date vs numeric)
            rowData[header] = value;
            hasData = true;
          } else if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed !== "") {
              // Сохраняем строки как есть, без преобразования в числа
              // Это важно для полей типа "1) ЧПД" которые начинаются с цифры
              rowData[header] = trimmed;
              hasData = true;
            } else {
              rowData[header] = null;
            }
          } else {
            rowData[header] = value?.toString()?.trim() || null;
            if (rowData[header]) hasData = true;
          }
        }
      });

      // Добавляем строку только если в ней есть данные
      if (hasData) {
        rows.push(rowData);
      }
    });

    return {
      headers,
      rows,
      sheetName: worksheet.name,
      availableSheets,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Ошибка парсинга XLSX: ${error.message}`);
    }
    throw new Error("Неизвестная ошибка при парсинге XLSX");
  }
}

/**
 * Парсинг файла (CSV или XLSX) в зависимости от расширения
 * @param fileBuffer - содержимое файла (Buffer)
 * @param filename - имя файла для определения типа
 * @param sheetName - имя листа для XLSX (опционально)
 * @returns результат парсинга
 */
export async function parseFile(
  fileBuffer: Buffer,
  filename: string,
  sheetName?: string
): Promise<ParseResult> {
  const fileType = getFileType(filename);

  if (!fileType) {
    throw new Error(
      `Неподдерживаемый формат файла. Поддерживаются: CSV, XLSX`
    );
  }

  if (fileType === "csv") {
    return parseCSV(fileBuffer);
  } else {
    return parseXLSX(fileBuffer, sheetName);
  }
}

/**
 * Валидация структуры файла (проверка заголовков)
 * @param headers - заголовки из файла
 * @param requiredHeaders - обязательные заголовки
 * @returns true если все обязательные заголовки присутствуют
 */
export function validateFileStructure(
  headers: string[],
  requiredHeaders: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // Приводим заголовки файла к нижнему регистру для сравнения
  const headersLower = headers.map((h) => h.toLowerCase());
  
  for (const required of requiredHeaders) {
    // Сравниваем без учёта регистра
    if (!headersLower.includes(required.toLowerCase())) {
      missing.push(required);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
