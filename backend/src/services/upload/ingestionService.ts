/**
 * Сервис для загрузки данных в БД (STG → ODS → MART)
 */

import { pool } from "../../config/database.js";
import { formatDateForSQL, parseDate } from "../../utils/dateUtils.js";
import type { ParsedRow } from "./fileParserService.js";
import { getRowValue } from "./fileParserService.js";

/**
 * Загрузка данных в STG
 * @param uploadId - ID загрузки
 * @param rows - данные для загрузки
 * @param mapping - маппинг полей
 * @returns количество загруженных строк
 */
export async function loadToSTG(
  uploadId: number,
  rows: ParsedRow[],
  mapping: Array<{
    sourceField: string;
    targetField: string;
    fieldType: string;
  }>
): Promise<number> {
  const client = await pool.connect();
  try {
    // Находим индексы полей в маппинге
    const periodDateMap = mapping.find((m) => m.targetField === "period_date");
    const classMap = mapping.find((m) => m.targetField === "class");
    const sectionMap = mapping.find((m) => m.targetField === "section");
    const itemMap = mapping.find((m) => m.targetField === "item");
    const valueMap = mapping.find((m) => m.targetField === "value");

    if (!periodDateMap || !classMap || !valueMap) {
      throw new Error("Отсутствуют обязательные поля в маппинге");
    }

    let insertedCount = 0;

    // Вставляем данные батчами
    for (const row of rows) {
      // Обрабатываем дату периода (может быть строка или число Excel serial date)
      const periodDateValue = getRowValue(row, periodDateMap.sourceField);
      let periodDate: Date | null = null;
      
      if (typeof periodDateValue === "string" || typeof periodDateValue === "number") {
        periodDate = parseDate(periodDateValue);
      }

      if (!periodDate) {
        continue; // Пропускаем строки с невалидной датой
      }

      const classValue = String(getRowValue(row, classMap.sourceField) || "");
      const sectionValue = sectionMap && getRowValue(row, sectionMap.sourceField) 
        ? String(getRowValue(row, sectionMap.sourceField))
        : null;
      const itemValue = itemMap && getRowValue(row, itemMap.sourceField)
        ? String(getRowValue(row, itemMap.sourceField))
        : null;
      const valueValue = getRowValue(row, valueMap.sourceField);
      const value = typeof valueValue === "number"
        ? valueValue
        : parseFloat(String(valueValue || 0));

      await client.query(
        `INSERT INTO stg.balance_upload 
         (upload_id, period_date, class, section, item, sub_item, value)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uploadId, formatDateForSQL(periodDate), classValue, sectionValue, itemValue, null, value]
      );

      insertedCount++;
    }

    return insertedCount;
  } finally {
    client.release();
  }
}

/**
 * Трансформация данных из STG в ODS
 * @param uploadId - ID загрузки
 * @returns количество загруженных строк
 */
export async function transformSTGToODS(uploadId: number): Promise<number> {
  const client = await pool.connect();
  try {
    // Soft delete старых данных за периоды из загрузки
    const periodsResult = await client.query(
      `SELECT DISTINCT period_date, class, section, item
       FROM stg.balance_upload
       WHERE upload_id = $1`,
      [uploadId]
    );

    for (const period of periodsResult.rows) {
      await client.query(
        `UPDATE ods.balance
         SET deleted_at = CURRENT_TIMESTAMP,
             deleted_by = 'system'
         WHERE period_date = $1
           AND class = $2
           AND COALESCE(section, '') = COALESCE($3::varchar, '')
           AND COALESCE(item, '') = COALESCE($4::varchar, '')
           AND deleted_at IS NULL`,
        [period.period_date, period.class, period.section, period.item]
      );
    }

    // Вставляем данные из STG в ODS
    // Сначала обновляем существующие записи (если были помечены удаленными)
    const updateResult = await client.query(
      `UPDATE ods.balance
       SET value = stg.value,
           upload_id = stg.upload_id,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = 'system',
           deleted_at = NULL,
           deleted_by = NULL
       FROM stg.balance_upload stg
       WHERE ods.balance.period_date = stg.period_date
         AND ods.balance.class = stg.class
         AND (ods.balance.section IS NOT DISTINCT FROM stg.section)
         AND (ods.balance.item IS NOT DISTINCT FROM stg.item)
         AND (ods.balance.sub_item IS NOT DISTINCT FROM stg.sub_item)
         AND stg.upload_id = $1`,
      [uploadId]
    );

    // Вставляем новые записи (которые не были обновлены)
    const insertResult = await client.query(
      `INSERT INTO ods.balance 
       (period_date, class, section, item, sub_item, value, upload_id, created_by)
       SELECT stg.period_date, stg.class, stg.section, stg.item, stg.sub_item, stg.value, stg.upload_id, 'system'
       FROM stg.balance_upload stg
       WHERE stg.upload_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM ods.balance ods
           WHERE ods.period_date = stg.period_date
             AND ods.class = stg.class
             AND (ods.section IS NOT DISTINCT FROM stg.section)
             AND (ods.item IS NOT DISTINCT FROM stg.item)
             AND (ods.sub_item IS NOT DISTINCT FROM stg.sub_item)
             AND ods.deleted_at IS NULL
         )
       RETURNING id`,
      [uploadId]
    );

    return (updateResult.rowCount || 0) + (insertResult.rowCount || 0);
  } finally {
    client.release();
  }
}

/**
 * Трансформация данных из ODS в MART
 * @param uploadId - ID загрузки
 * @returns количество загруженных строк
 */
export async function transformODSToMART(uploadId: number): Promise<number> {
  const client = await pool.connect();
  try {
    // Удаляем старые данные за периоды из загрузки
    const periodsResult = await client.query(
      `SELECT DISTINCT period_date, class, section, item
       FROM ods.balance
       WHERE upload_id = $1 AND deleted_at IS NULL`,
      [uploadId]
    );

    for (const period of periodsResult.rows) {
      await client.query(
        `DELETE FROM mart.balance
         WHERE period_date = $1
           AND class = $2
           AND COALESCE(section, '') = COALESCE($3::varchar, '')
           AND COALESCE(item, '') = COALESCE($4::varchar, '')`,
        [period.period_date, period.class, period.section, period.item]
      );
    }

    // Вставляем данные из ODS в MART
    // Формируем row_code из class, section, item, sub_item
    // Сначала обновляем существующие записи
    const updateResult = await client.query(
      `UPDATE mart.balance
       SET value = ods.value,
           updated_at = CURRENT_TIMESTAMP
       FROM ods.balance ods
       WHERE mart.balance.table_component_id = 'balance_assets_table'
         AND mart.balance.period_date = ods.period_date
         AND mart.balance.class = ods.class
         AND (mart.balance.section IS NOT DISTINCT FROM ods.section)
         AND (mart.balance.item IS NOT DISTINCT FROM ods.item)
         AND (mart.balance.sub_item IS NOT DISTINCT FROM ods.sub_item)
         AND mart.balance.client_type IS NULL
         AND mart.balance.client_segment IS NULL
         AND mart.balance.product_code IS NULL
         AND mart.balance.portfolio_code IS NULL
         AND mart.balance.currency_code = 'RUB'
         AND ods.upload_id = $1
         AND ods.deleted_at IS NULL`,
      [uploadId]
    );

    // Вставляем новые записи
    const insertResult = await client.query(
      `INSERT INTO mart.balance 
       (table_component_id, row_code, period_date, value, class, section, item, sub_item, currency_code)
       SELECT 
         'balance_assets_table' as table_component_id,
         COALESCE(ods.class || '-' || ods.section || COALESCE('-' || ods.item, ''), ods.class) as row_code,
         ods.period_date,
         ods.value,
         ods.class,
         ods.section,
         ods.item,
         ods.sub_item,
         'RUB' as currency_code
       FROM ods.balance ods
       WHERE ods.upload_id = $1 AND ods.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM mart.balance mart
           WHERE mart.table_component_id = 'balance_assets_table'
             AND mart.period_date = ods.period_date
             AND mart.class = ods.class
             AND (mart.section IS NOT DISTINCT FROM ods.section)
             AND (mart.item IS NOT DISTINCT FROM ods.item)
             AND (mart.sub_item IS NOT DISTINCT FROM ods.sub_item)
             AND mart.client_type IS NULL
             AND mart.client_segment IS NULL
             AND mart.product_code IS NULL
             AND mart.portfolio_code IS NULL
             AND mart.currency_code = 'RUB'
         )
       RETURNING id`,
      [uploadId]
    );

    return (updateResult.rowCount || 0) + (insertResult.rowCount || 0);
  } finally {
    client.release();
  }
}

/**
 * Обновление статуса загрузки
 * @param uploadId - ID загрузки
 * @param status - новый статус
 * @param rowsProcessed - количество обработанных строк
 * @param rowsSuccessful - количество успешных строк
 * @param rowsFailed - количество строк с ошибками
 */
export async function updateUploadStatus(
  uploadId: number,
  status: "pending" | "processing" | "completed" | "failed" | "rolled_back",
  rowsProcessed?: number,
  rowsSuccessful?: number,
  rowsFailed?: number
): Promise<void> {
  const client = await pool.connect();
  try {
    const updates: string[] = ["status = $2", "updated_at = CURRENT_TIMESTAMP"];
    const values: any[] = [uploadId, status];

    if (rowsProcessed !== undefined) {
      updates.push(`rows_processed = $${values.length + 1}`);
      values.push(rowsProcessed);
    }
    if (rowsSuccessful !== undefined) {
      updates.push(`rows_successful = $${values.length + 1}`);
      values.push(rowsSuccessful);
    }
    if (rowsFailed !== undefined) {
      updates.push(`rows_failed = $${values.length + 1}`);
      values.push(rowsFailed);
    }

    await client.query(
      `UPDATE ing.uploads 
       SET ${updates.join(", ")}
       WHERE id = $1`,
      values
    );
  } finally {
    client.release();
  }
}

/**
 * Загрузка данных Financial Results в STG
 * @param uploadId - ID загрузки
 * @param rows - данные для загрузки
 * @param mapping - маппинг полей
 * @returns количество загруженных строк
 */
export async function loadFinResultsToSTG(
  uploadId: number,
  rows: ParsedRow[],
  mapping: Array<{
    sourceField: string;
    targetField: string;
    fieldType: string;
  }>
): Promise<number> {
  const client = await pool.connect();
  try {
    // Находим маппинги для всех полей
    const classMap = mapping.find((m) => m.targetField === "class");
    const categoryMap = mapping.find((m) => m.targetField === "category");
    const itemMap = mapping.find((m) => m.targetField === "item");
    const subitemMap = mapping.find((m) => m.targetField === "subitem");
    const detailsMap = mapping.find((m) => m.targetField === "details");
    const clientTypeMap = mapping.find((m) => m.targetField === "client_type");
    const currencyCodeMap = mapping.find((m) => m.targetField === "currency_code");
    const dataSourceMap = mapping.find((m) => m.targetField === "data_source");
    const valueMap = mapping.find((m) => m.targetField === "value");
    const periodDateMap = mapping.find((m) => m.targetField === "period_date");

    if (!classMap || !categoryMap || !valueMap || !periodDateMap) {
      throw new Error("Отсутствуют обязательные поля в маппинге (class, category, value, period_date)");
    }

    let insertedCount = 0;

    // Вставляем данные батчами
    for (const row of rows) {
      // Обрабатываем дату периода (может быть строка или число Excel serial date)
      const periodDateValue = getRowValue(row, periodDateMap.sourceField);
      let periodDate: Date | null = null;
      
      if (typeof periodDateValue === "string" || typeof periodDateValue === "number") {
        periodDate = parseDate(periodDateValue);
      }

      if (!periodDate) {
        continue; // Пропускаем строки с невалидной датой
      }

      // Получаем обязательные поля
      const classValue = String(getRowValue(row, classMap.sourceField) || "");
      const categoryValue = String(getRowValue(row, categoryMap.sourceField) || "");
      
      if (!classValue || !categoryValue) {
        continue; // Пропускаем строки без обязательных полей
      }

      // Получаем опциональные поля иерархии
      const itemValue = itemMap && getRowValue(row, itemMap.sourceField)
        ? String(getRowValue(row, itemMap.sourceField))
        : null;
      const subitemValue = subitemMap && getRowValue(row, subitemMap.sourceField)
        ? String(getRowValue(row, subitemMap.sourceField))
        : null;
      const detailsValue = detailsMap && getRowValue(row, detailsMap.sourceField)
        ? String(getRowValue(row, detailsMap.sourceField))
        : null;

      // Получаем аналитические поля
      const clientTypeValue = clientTypeMap && getRowValue(row, clientTypeMap.sourceField)
        ? String(getRowValue(row, clientTypeMap.sourceField))
        : null;
      const currencyCodeValue = currencyCodeMap && getRowValue(row, currencyCodeMap.sourceField)
        ? String(getRowValue(row, currencyCodeMap.sourceField))?.substring(0, 3)
        : null;
      const dataSourceValue = dataSourceMap && getRowValue(row, dataSourceMap.sourceField)
        ? String(getRowValue(row, dataSourceMap.sourceField))
        : null;

      // Получаем значение
      const valueRaw = getRowValue(row, valueMap.sourceField);
      const value = typeof valueRaw === "number"
        ? valueRaw
        : parseFloat(String(valueRaw || 0));

      await client.query(
        `INSERT INTO stg.fin_results_upload 
         (upload_id, class, category, item, subitem, details, client_type, currency_code, data_source, value, period_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          uploadId,
          classValue,
          categoryValue,
          itemValue,
          subitemValue,
          detailsValue,
          clientTypeValue,
          currencyCodeValue,
          dataSourceValue,
          value,
          formatDateForSQL(periodDate)
        ]
      );

      insertedCount++;
    }

    return insertedCount;
  } finally {
    client.release();
  }
}

/**
 * Трансформация данных Financial Results из STG в ODS
 * Реализует soft-delete по бизнес-ключу и периоду
 * @param uploadId - ID загрузки
 * @returns количество обработанных строк
 */
export async function transformFinResultsSTGToODS(uploadId: number): Promise<number> {
  const client = await pool.connect();
  try {
    // 1. Soft-delete старых записей в ODS по бизнес-ключу из STG
    // Помечаем удалёнными все записи, которые совпадают по бизнес-ключу с загружаемыми
    await client.query(
      `UPDATE ods.fin_results ods
       SET deleted_at = NOW(), deleted_by = 'system'
       FROM stg.fin_results_upload stg
       WHERE stg.upload_id = $1
         AND ods.deleted_at IS NULL
         AND ods.period_date = stg.period_date
         AND ods.class = stg.class
         AND ods.category = stg.category
         AND COALESCE(ods.item, '') = COALESCE(stg.item, '')
         AND COALESCE(ods.subitem, '') = COALESCE(stg.subitem, '')
         AND COALESCE(ods.client_type, '') = COALESCE(stg.client_type, '')
         AND COALESCE(ods.currency_code, '') = COALESCE(stg.currency_code, '')
         AND COALESCE(ods.data_source, '') = COALESCE(stg.data_source, '')`,
      [uploadId]
    );

    // 2. INSERT новых записей из STG в ODS
    const insertResult = await client.query(
      `INSERT INTO ods.fin_results (
        class, category, item, subitem, details,
        client_type, currency_code, data_source,
        value, period_date, upload_id, created_by
      )
      SELECT 
        class, category, item, subitem, details,
        client_type, currency_code, data_source,
        value, period_date, upload_id, 'system'
      FROM stg.fin_results_upload
      WHERE upload_id = $1
      RETURNING id`,
      [uploadId]
    );

    return insertResult.rowCount || 0;
  } finally {
    client.release();
  }
}

/**
 * Трансформация данных Financial Results из ODS в MART
 * @param uploadId - ID загрузки
 * @returns количество обработанных строк
 */
export async function transformFinResultsODSToMART(uploadId: number): Promise<number> {
  const client = await pool.connect();
  try {
    // 1. Получить уникальные периоды из ODS для этой загрузки (только активные записи)
    const periodsResult = await client.query(
      `SELECT DISTINCT period_date
       FROM ods.fin_results
       WHERE deleted_at IS NULL AND upload_id = $1`,
      [uploadId]
    );

    const periodDates = periodsResult.rows.map(r => r.period_date);

    if (periodDates.length === 0) {
      return 0;
    }

    // 2. DELETE из MART по периодам
    await client.query(
      `DELETE FROM mart.fin_results WHERE period_date = ANY($1)`,
      [periodDates]
    );

    // 3. INSERT из ODS в MART с агрегацией по бизнес-ключу (SUM для дубликатов)
    const insertResult = await client.query(
      `INSERT INTO mart.fin_results (
        class, category, item, subitem, details,
        client_type, currency_code, data_source,
        value, period_date, row_code, table_component_id
      )
      SELECT 
        class, category, item, subitem, 
        MAX(details) as details,
        client_type, currency_code, data_source,
        SUM(value) as value, 
        period_date,
        CONCAT(class, '|', category, '|', COALESCE(item, ''), '|', COALESCE(subitem, '')),
        'fin_results_table'
      FROM ods.fin_results
      WHERE deleted_at IS NULL AND upload_id = $1
      GROUP BY class, category, item, subitem, client_type, currency_code, data_source, period_date
      ON CONFLICT (
        period_date, class, category,
        COALESCE(item, ''), COALESCE(subitem, ''),
        COALESCE(client_type, ''), COALESCE(currency_code, ''), COALESCE(data_source, '')
      ) DO UPDATE SET
        value = EXCLUDED.value,
        details = EXCLUDED.details,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id`,
      [uploadId]
    );

    return insertResult.rowCount || 0;
  } finally {
    client.release();
  }
}

/**
 * Сохранение ошибок валидации в ing.uploads
 * @param uploadId - ID загрузки
 * @param validationErrors - агрегированные ошибки валидации
 */
export async function saveValidationErrors(
  uploadId: number,
  validationErrors: {
    examples: Array<{ type: string; message: string; field?: string }>;
    totalCount: number;
    byType: Record<string, number>;
  }
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE ing.uploads 
       SET validation_errors = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [uploadId, JSON.stringify(validationErrors)]
    );
  } finally {
    client.release();
  }
}
