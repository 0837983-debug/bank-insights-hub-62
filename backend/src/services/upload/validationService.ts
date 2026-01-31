/**
 * Сервис для валидации данных при загрузке файлов
 */

import { pool } from "../../config/database.js";
import {
  isValidDateFormat,
  parseDate,
  formatDateForSQL,
  isValidDateRange,
} from "../../utils/dateUtils.js";
import type { ParsedRow } from "./fileParserService.js";
import { getRowValue } from "./fileParserService.js";

export interface ValidationError {
  rowNumber?: number;
  fieldName: string;
  errorType: string;
  errorMessage: string;
  fieldValue?: string | number | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  errorCount: number;
}

/**
 * Получение маппинга полей для целевой таблицы
 * @param targetTable - целевая таблица (balance, и т.д.)
 * @returns маппинг полей
 */
export async function getFieldMapping(targetTable: string): Promise<
  Array<{
    sourceField: string;
    targetField: string;
    fieldType: string;
    isRequired: boolean;
    validationRules?: any;
  }>
> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT source_field, target_field, field_type, is_required, validation_rules
       FROM dict.upload_mappings
       WHERE target_table = $1
       ORDER BY id`,
      [targetTable]
    );

    return result.rows.map((row: any) => ({
      sourceField: row.source_field,
      targetField: row.target_field,
      fieldType: row.field_type,
      isRequired: row.is_required,
      validationRules: row.validation_rules,
    }));
  } finally {
    client.release();
  }
}

/**
 * Валидация типов данных
 * @param value - значение для валидации
 * @param fieldType - ожидаемый тип (date, varchar, numeric)
 * @param fieldName - имя поля
 * @returns ошибка валидации или null
 */
function validateFieldType(
  value: string | number | null,
  fieldType: string,
  fieldName: string
): ValidationError | null {
  if (value === null || value === undefined || value === "") {
    return null; // Пустые значения обрабатываются отдельно (is_required)
  }

  switch (fieldType) {
    case "date": {
      if (typeof value === "string") {
        const date = parseDate(value);
        if (!date || !isValidDateFormat(formatDateForSQL(date))) {
          return {
            fieldName,
            errorType: "invalid_date_format",
            errorMessage: `Неверный формат даты. Ожидается YYYY-MM-DD`,
            fieldValue: value,
          };
        }
        if (!isValidDateRange(date)) {
          return {
            fieldName,
            errorType: "invalid_date_range",
            errorMessage: `Дата вне допустимого диапазона (не более 10 лет назад и не в будущем)`,
            fieldValue: value,
          };
        }
      } else {
        return {
          fieldName,
          errorType: "type_mismatch",
          errorMessage: `Ожидается строка с датой, получено: ${typeof value}`,
          fieldValue: value,
        };
      }
      break;
    }
    case "numeric": {
      const numValue = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(numValue)) {
        return {
          fieldName,
          errorType: "invalid_number",
          errorMessage: `Ожидается число, получено: ${value}`,
          fieldValue: value,
        };
      }
      break;
    }
    case "varchar": {
      // Числа и строки допустимы в текстовых полях (числа будут преобразованы в строки)
      // Отклоняем только объекты и массивы
      if (typeof value === "object" && value !== null) {
        return {
          fieldName,
          errorType: "type_mismatch",
          errorMessage: `Ожидается строка или число, получено: ${Array.isArray(value) ? 'array' : 'object'}`,
          fieldValue: value,
        };
      }
      break;
    }
  }

  return null;
}

/**
 * Валидация диапазонов значений (из validation_rules)
 * @param value - значение для валидации
 * @param validationRules - правила валидации (JSONB)
 * @param fieldName - имя поля
 * @returns ошибка валидации или null
 */
function validateFieldRange(
  value: string | number | null,
  validationRules: any,
  fieldName: string
): ValidationError | null {
  if (!validationRules || value === null || value === undefined) {
    return null;
  }

  // Валидация min для числовых значений
  if (typeof value === "number" && validationRules.min !== undefined) {
    if (value < validationRules.min) {
      return {
        fieldName,
        errorType: "value_too_small",
        errorMessage: `Значение меньше минимального (min: ${validationRules.min})`,
        fieldValue: value,
      };
    }
  }

  // Валидация max для числовых значений
  if (typeof value === "number" && validationRules.max !== undefined) {
    if (value > validationRules.max) {
      return {
        fieldName,
        errorType: "value_too_large",
        errorMessage: `Значение больше максимального (max: ${validationRules.max})`,
        fieldValue: value,
      };
    }
  }

  return null;
}

/**
 * Валидация строки данных
 * @param row - строка данных
 * @param rowNumber - номер строки в файле
 * @param mapping - маппинг полей
 * @returns массив ошибок валидации
 */
function validateRow(
  row: ParsedRow,
  rowNumber: number,
  mapping: Awaited<ReturnType<typeof getFieldMapping>>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const map of mapping) {
    const value = getRowValue(row, map.sourceField);

    // Проверка обязательных полей
    if (map.isRequired && (value === null || value === undefined || value === "")) {
      errors.push({
        rowNumber,
        fieldName: map.sourceField,
        errorType: "required_missing",
        errorMessage: `Обязательное поле "${map.sourceField}" не заполнено`,
        fieldValue: value,
      });
      continue; // Не проверяем тип, если поле отсутствует
    }

    // Пропускаем валидацию типа, если поле не обязательное и пустое
    if (!map.isRequired && (value === null || value === undefined || value === "")) {
      continue;
    }

    // Валидация типа данных (value может быть undefined, но мы уже проверили выше)
    if (value !== undefined) {
      const typeError = validateFieldType(value, map.fieldType, map.sourceField);
      if (typeError) {
        errors.push({ ...typeError, rowNumber });
        continue; // Не проверяем диапазон, если тип неверный
      }

      // Валидация диапазонов
      if (map.validationRules) {
        const rangeError = validateFieldRange(value, map.validationRules, map.sourceField);
        if (rangeError) {
          errors.push({ ...rangeError, rowNumber });
        }
      }
    }
  }

  return errors;
}

/**
 * Валидация всех строк данных
 * @param rows - массив строк данных
 * @param targetTable - целевая таблица
 * @returns результат валидации
 */
export async function validateData(
  rows: ParsedRow[],
  targetTable: string
): Promise<ValidationResult> {
  const mapping = await getFieldMapping(targetTable);

  if (mapping.length === 0) {
    throw new Error(`Маппинг для таблицы "${targetTable}" не найден в dict.upload_mappings`);
  }

  const errors: ValidationError[] = [];

  // Валидация каждой строки
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 потому что первая строка - заголовки, нумерация с 1
    const rowErrors = validateRow(row, rowNumber, mapping);
    errors.push(...rowErrors);
  }

  // Проверка уникальности (по period_date + class + section + item)
  if (targetTable === "balance") {
    const uniquenessErrors = checkUniqueness(rows, mapping);
    errors.push(...uniquenessErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
    errorCount: errors.length,
  };
}

/**
 * Проверка уникальности записей в файле
 * @param rows - массив строк данных
 * @param mapping - маппинг полей
 * @returns массив ошибок уникальности
 */
function checkUniqueness(
  rows: ParsedRow[],
  mapping: Awaited<ReturnType<typeof getFieldMapping>>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();

  // Находим индексы полей для проверки уникальности
  const periodDateMap = mapping.find((m) => m.targetField === "period_date");
  const classMap = mapping.find((m) => m.targetField === "class");
  const sectionMap = mapping.find((m) => m.targetField === "section");
  const itemMap = mapping.find((m) => m.targetField === "item");

  if (!periodDateMap || !classMap) {
    return errors; // Не можем проверить уникальность без обязательных полей
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const periodDate = getRowValue(row, periodDateMap.sourceField);
    const classValue = getRowValue(row, classMap.sourceField);
    const section = sectionMap ? getRowValue(row, sectionMap.sourceField) : null;
    const item = itemMap ? getRowValue(row, itemMap.sourceField) : null;

    // Формируем ключ уникальности
    const keyParts = [periodDate, classValue, section, item].filter((v) => v !== null && v !== undefined);
    const key = keyParts.join("|");

    if (seen.has(key)) {
      errors.push({
        rowNumber: i + 2,
        fieldName: periodDateMap.sourceField,
        errorType: "duplicate_record",
        errorMessage: `Дубликат записи (period_date: ${periodDate}, class: ${classValue}, section: ${section}, item: ${item})`,
        fieldValue: key,
      });
    } else {
      seen.add(key);
    }
  }

  return errors;
}

/**
 * Проверка дубликатов периодов в ODS
 * @param periodDates - массив дат периодов из загружаемого файла
 * @param targetTable - целевая таблица
 * @returns массив дат, которые уже существуют в ODS
 */
export async function checkDuplicatePeriodsInODS(
  periodDates: Date[],
  targetTable: string
): Promise<Date[]> {
  const client = await pool.connect();
  try {
    if (targetTable !== "balance") {
      return []; // Пока поддерживаем только balance
    }

    const uniqueDates = Array.from(new Set(periodDates.map((d) => formatDateForSQL(d))));
    
    const result = await client.query(
      `SELECT DISTINCT period_date
       FROM ods.balance
       WHERE period_date = ANY($1::date[])
         AND deleted_at IS NULL`,
      [uniqueDates]
    );

    return result.rows.map((row: any) => new Date(row.period_date));
  } finally {
    client.release();
  }
}

/**
 * Агрегация ошибок валидации (до 3 примеров + детали по строкам)
 * @param errors - массив ошибок
 * @returns агрегированный объект с ошибками, включая номера строк и примеры значений
 */
export function aggregateValidationErrors(errors: ValidationError[]): {
  examples: Array<{
    type: string;
    message: string;
    field?: string;
    rowNumbers: number[];     // Первые 5 строк с этой ошибкой
    sampleValue?: string;     // Пример значения
    totalAffected: number;    // Всего ошибок этого типа
  }>;
  totalCount: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  const rowsByType: Record<string, number[]> = {};
  const sampleByType: Record<string, { message: string; field?: string; value?: string }> = {};
  
  for (const error of errors) {
    const key = error.errorType;
    byType[key] = (byType[key] || 0) + 1;
    
    if (!rowsByType[key]) {
      rowsByType[key] = [];
      // Корректное преобразование значения в строку
      let valueStr: string | undefined;
      if (error.fieldValue != null) {
        if (typeof error.fieldValue === 'object') {
          valueStr = JSON.stringify(error.fieldValue);
        } else {
          valueStr = String(error.fieldValue);
        }
      }
      sampleByType[key] = {
        message: error.errorMessage,
        field: error.fieldName,
        value: valueStr
      };
    }
    
    // Собираем первые 5 строк
    if (rowsByType[key].length < 5 && error.rowNumber != null) {
      rowsByType[key].push(error.rowNumber);
    }
  }

  // Берем первые 3 типа ошибок для examples
  const examples = Object.entries(byType).slice(0, 3).map(([type, count]) => ({
    type,
    message: sampleByType[type].message,
    field: sampleByType[type].field,
    rowNumbers: rowsByType[type] || [],
    sampleValue: sampleByType[type].value,
    totalAffected: count
  }));

  return { examples, totalCount: errors.length, byType };
}
