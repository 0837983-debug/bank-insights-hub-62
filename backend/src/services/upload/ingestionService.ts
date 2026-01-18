/**
 * Сервис для загрузки данных в БД (STG → ODS → MART)
 */

import { pool } from "../../config/database.js";
import { formatDateForSQL, parseDate } from "../../utils/dateUtils.js";
import type { ParsedRow } from "./fileParserService.js";

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
      const periodDateValue = row[periodDateMap.sourceField];
      const periodDate = typeof periodDateValue === "string"
        ? parseDate(periodDateValue)
        : null;

      if (!periodDate) {
        continue; // Пропускаем строки с невалидной датой
      }

      const classValue = String(row[classMap.sourceField] || "");
      const sectionValue = row[sectionMap.sourceField] 
        ? String(row[sectionMap.sourceField])
        : null;
      const itemValue = row[itemMap?.sourceField]
        ? String(row[itemMap.sourceField])
        : null;
      const value = typeof row[valueMap.sourceField] === "number"
        ? row[valueMap.sourceField]
        : parseFloat(String(row[valueMap.sourceField] || 0));

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
