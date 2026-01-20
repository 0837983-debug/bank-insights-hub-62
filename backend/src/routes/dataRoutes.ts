/**
 * Routes for unified data endpoint
 * GET /api/data - единая точка получения данных через SQL Builder
 */

import { Router, Request, Response } from "express";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";
import { loadQueryConfig } from "../services/queryBuilder/queryLoader.js";
import { pool } from "../config/database.js";
import { getRowDescription, getSortOrder } from "../services/mart/base/rowNameMapper.js";
import { getHeaderDates } from "../services/mart/base/periodService.js";

const router = Router();

/**
 * Трансформация данных таблицы: добавление id и sortOrder, если их нет
 */
function transformTableData(rows: any[]): any[] {
  return rows.map(row => {
    // Если id уже есть, используем его, иначе формируем
    if (!row.id) {
      const idParts = [
        row.class,
        row.section,
        row.item,
        row.sub_item
      ].filter(Boolean);
      row.id = idParts.join('-') || 'unknown';
    }
    
    // Если sortOrder нет, добавляем его
    if (row.sortOrder === undefined || row.sortOrder === null) {
      row.sortOrder = getSortOrder(row.id);
    }
    
    // Преобразуем строки в числа для value, previousValue, ytdValue
    if (typeof row.value === 'string') {
      row.value = parseFloat(row.value) || 0;
    }
    if (typeof row.previousValue === 'string') {
      row.previousValue = parseFloat(row.previousValue) || 0;
    }
    if (typeof row.ytdValue === 'string') {
      row.ytdValue = parseFloat(row.ytdValue) || 0;
    }
    
    return row;
  });
}

/**
 * GET /api/data/:query_id
 * Получение данных по query_id с параметрами из query string
 * 
 * Query params:
 * - component_id: идентификатор компонента (обязательно для табличных запросов)
 * - остальные параметры передаются как query params (p1, p2, p3, class и т.д.)
 * 
 * Example:
 * GET /api/data/assets_table?component_id=assets_table&p1=2025-08-01&p2=2025-07-01&p3=2024-08-01&class=assets
 */
router.get("/:query_id", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { query_id } = req.params;
    const { component_id, ...queryParams } = req.query;

    // Парсинг всех query params в объект params
    const params: Record<string, string | number | boolean | Date> = {};
    for (const [key, value] of Object.entries(queryParams)) {
      if (typeof value === 'string') {
        // Пробуем определить тип значения
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Дата в формате YYYY-MM-DD
          params[key] = new Date(value);
        } else if (value === 'true' || value === 'false') {
          params[key] = value === 'true';
        } else if (!isNaN(Number(value)) && value.trim() !== '') {
          params[key] = Number(value);
        } else {
          params[key] = value;
        }
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        params[key] = value;
      }
    }

    // Преобразование params в JSON строку для builder
    const paramsJson = JSON.stringify(params);

    // Логирование запроса
    console.log(`[getData] GET Request: query_id=${query_id}, component_id=${component_id}, paramsJson=${paramsJson}`);

    // Специальная обработка для header_dates - используем periodService
    if (query_id === "header_dates") {
      const dates = getHeaderDates();
      return res.json({
        componentId: component_id as string || "header",
        type: "table",
        rows: [{
          periodDate: dates.periodDate,
          ppDate: dates.ppDate,
          pyDate: dates.pyDate,
        }],
      });
    }

    // Построение SQL через builder (загрузка конфига и проверка wrapJson внутри builder)
    let sql: string;
    try {
      sql = await buildQueryFromId(query_id, paramsJson);
      console.log(`[getData] Generated SQL: ${sql.substring(0, 200)}...`);
    } catch (error: any) {
      console.error(`[getData] Builder error:`, error);
      // Обработка различных типов ошибок
      if (error.message.includes("invalid JSON")) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === "invalid config") {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes("wrap_json=false")) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes("invalid params")) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: "Failed to build query", details: error.message });
    }

    // Выполнение SQL
    try {
      const result = await client.query(sql);
      
      // При wrapJson=true результат должен быть массивом с одним элементом и jsonb_agg
      if (result.rows.length === 1 && result.rows[0].jsonb_agg) {
        const data = result.rows[0].jsonb_agg;
        
        // Трансформируем данные для таблиц
        const transformedData = transformTableData(data);
        
        // Возвращаем в формате { componentId, type, rows }
        return res.json({
          componentId: component_id as string || query_id,
          type: "table",
          rows: transformedData,
        });
      }

      // Если структура неожиданная, возвращаем ошибку
      return res.status(500).json({ 
        error: "Unexpected result format",
        details: "Expected jsonb_agg result with wrapJson=true"
      });
    } catch (error: any) {
      console.error(`[getData] SQL execution error:`, error);
      return res.status(500).json({ 
        error: "SQL execution error",
        details: error.message 
      });
    }
  } catch (error: any) {
    console.error(`[getData] Unexpected error:`, error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
