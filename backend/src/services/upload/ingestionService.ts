/**
 * Сервис для загрузки данных в БД (STG → ODS → MART)
 */

import { pool } from "../../config/database.js";
import { formatDateForSQL, parseDate } from "../../utils/dateUtils.js";
import type { ParsedRow } from "./fileParserService.js";
import { getRowValue } from "./fileParserService.js";

/**
 * Batch size для unnest INSERT (PostgreSQL лимит ~32767 параметров)
 * При 7 колонках: 32767 / 7 ≈ 4680, используем 1000 для безопасности
 */
const BATCH_SIZE = 1000;

/**
 * Загрузка данных в STG с использованием batch insert через unnest
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
  const startTime = Date.now();
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

    // Подготавливаем массивы для batch insert
    const uploadIds: number[] = [];
    const periodDates: string[] = [];
    const classes: string[] = [];
    const sections: (string | null)[] = [];
    const items: (string | null)[] = [];
    const subItems: (string | null)[] = [];
    const values: number[] = [];

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

      // Добавляем в массивы
      uploadIds.push(uploadId);
      periodDates.push(formatDateForSQL(periodDate));
      classes.push(classValue);
      sections.push(sectionValue);
      items.push(itemValue);
      subItems.push(null);
      values.push(value);
    }

    // Batch insert через unnest
    let insertedCount = 0;
    const totalRows = uploadIds.length;

    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const end = Math.min(i + BATCH_SIZE, totalRows);
      
      await client.query(
        `INSERT INTO stg.balance_upload 
           (upload_id, period_date, class, section, item, sub_item, value)
         SELECT * FROM unnest(
           $1::int[],
           $2::date[],
           $3::text[],
           $4::text[],
           $5::text[],
           $6::text[],
           $7::numeric[]
         )`,
        [
          uploadIds.slice(i, end),
          periodDates.slice(i, end),
          classes.slice(i, end),
          sections.slice(i, end),
          items.slice(i, end),
          subItems.slice(i, end),
          values.slice(i, end)
        ]
      );

      insertedCount += (end - i);
    }

    const duration = Date.now() - startTime;
    console.log(`[loadToSTG] Загружено ${insertedCount} строк за ${duration}мс (${Math.ceil(totalRows / BATCH_SIZE)} батчей)`);

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
 * Обновление Materialized Views для Balance после загрузки данных в ODS
 * MART слой теперь реализован как MV с автоматическим JOIN на dict.field_mappings
 * @returns количество строк в обновлённом MV
 */
export async function refreshBalanceMaterializedViews(): Promise<number> {
  const client = await pool.connect();
  try {
    // Обновляем основной MART MV
    await client.query('REFRESH MATERIALIZED VIEW mart.balance');
    
    // Обновляем KPI MV
    await client.query('REFRESH MATERIALIZED VIEW mart.mv_kpi_balance');
    
    // Возвращаем количество строк в обновлённом MV
    const countResult = await client.query('SELECT COUNT(*) FROM mart.balance');
    return parseInt(countResult.rows[0].count, 10);
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
 * Загрузка данных Financial Results в STG с использованием batch insert через unnest
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
  const startTime = Date.now();
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

    // Подготавливаем массивы для batch insert (11 колонок)
    const uploadIds: number[] = [];
    const classes: string[] = [];
    const categories: string[] = [];
    const items: (string | null)[] = [];
    const subitems: (string | null)[] = [];
    const details: (string | null)[] = [];
    const clientTypes: (string | null)[] = [];
    const currencyCodes: (string | null)[] = [];
    const dataSources: (string | null)[] = [];
    const values: number[] = [];
    const periodDates: string[] = [];

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

      // Добавляем в массивы
      uploadIds.push(uploadId);
      classes.push(classValue);
      categories.push(categoryValue);
      items.push(itemValue);
      subitems.push(subitemValue);
      details.push(detailsValue);
      clientTypes.push(clientTypeValue);
      currencyCodes.push(currencyCodeValue);
      dataSources.push(dataSourceValue);
      values.push(value);
      periodDates.push(formatDateForSQL(periodDate));
    }

    // Batch insert через unnest
    let insertedCount = 0;
    const totalRows = uploadIds.length;

    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const end = Math.min(i + BATCH_SIZE, totalRows);
      
      await client.query(
        `INSERT INTO stg.fin_results_upload 
           (upload_id, class, category, item, subitem, details, client_type, currency_code, data_source, value, period_date)
         SELECT * FROM unnest(
           $1::int[],
           $2::text[],
           $3::text[],
           $4::text[],
           $5::text[],
           $6::text[],
           $7::text[],
           $8::varchar(3)[],
           $9::text[],
           $10::numeric[],
           $11::date[]
         )`,
        [
          uploadIds.slice(i, end),
          classes.slice(i, end),
          categories.slice(i, end),
          items.slice(i, end),
          subitems.slice(i, end),
          details.slice(i, end),
          clientTypes.slice(i, end),
          currencyCodes.slice(i, end),
          dataSources.slice(i, end),
          values.slice(i, end),
          periodDates.slice(i, end)
        ]
      );

      insertedCount += (end - i);
    }

    const duration = Date.now() - startTime;
    console.log(`[loadFinResultsToSTG] Загружено ${insertedCount} строк за ${duration}мс (${Math.ceil(totalRows / BATCH_SIZE)} батчей)`);

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
 * Обновление Materialized Views для Financial Results после загрузки данных в ODS
 * MART слой теперь реализован как MV с автоматическим JOIN на dict.field_mappings
 * @returns количество строк в обновлённом MV
 */
export async function refreshFinResultsMaterializedViews(): Promise<number> {
  const client = await pool.connect();
  try {
    // Обновляем основной MART MV
    await client.query('REFRESH MATERIALIZED VIEW mart.fin_results');
    
    // Обновляем KPI MV
    await client.query('REFRESH MATERIALIZED VIEW mart.mv_kpi_fin_results');
    
    // Возвращаем количество строк в обновлённом MV
    const countResult = await client.query('SELECT COUNT(*) FROM mart.fin_results');
    return parseInt(countResult.rows[0].count, 10);
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
