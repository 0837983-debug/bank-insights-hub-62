/**
 * Routes for unified data endpoint
 * GET /api/data - единая точка получения данных через SQL Builder
 * 
 * Query params:
 * - query_id (обязательно)
 * - component_Id (обязательно)
 * - parametrs (опционально, JSON-строка)
 */

import { Router, Request, Response } from "express";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";
import { pool } from "../config/database.js";
import { getSortOrder } from "../services/mart/base/rowNameMapper.js";
import { getHeaderDates } from "../services/mart/base/periodService.js";
import { calculateChange } from "../services/mart/base/calculationService.js";
import { formatDateForSQL } from "../services/mart/base/periodService.js";

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
 * Трансформация данных KPI: расчет изменений и форматирование
 */
function transformKPIData(rows: any[], periodDate: string): any[] {
  return rows.map(row => {
    const currentValue = parseFloat(row.value) || 0;
    const previousValue = parseFloat(row.prev_period) || 0;
    const ytdValue = row.prev_year !== null && row.prev_year !== undefined 
      ? parseFloat(row.prev_year) || 0 
      : undefined;
    
    // Расчет изменений в долях (не в процентах)
    const ppChange = calculateChange(currentValue, previousValue) / 100;
    const ytdChange = ytdValue !== undefined 
      ? calculateChange(currentValue, ytdValue) / 100 
      : undefined;
    
    // Расчет изменений в абсолютных значениях
    const ppChangeAbsolute = currentValue - previousValue;
    const ytdChangeAbsolute = ytdValue !== undefined 
      ? currentValue - ytdValue 
      : undefined;
    
    return {
      id: row.component_id,
      periodDate: periodDate,
      value: currentValue,
      previousValue: previousValue,
      ytdValue: ytdValue,
      ppChange: ppChange,
      ppChangeAbsolute: ppChangeAbsolute,
      ytdChange: ytdChange,
      ytdChangeAbsolute: ytdChangeAbsolute,
    };
  });
}

/**
 * GET /api/data
 * Получение данных по query_id, component_Id и parametrs из query string
 *
 * Query params:
 * - query_id (обязательно)
 * - component_Id (обязательно)
 * - parametrs (опционально, JSON-строка)
 *
 * Example:
 * GET /api/data?query_id=assets_table&component_Id=assets_table&parametrs={"p1":"2025-08-01"}
 */
router.get("/", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { query_id, component_Id, parametrs } = req.query;

    // Валидация обязательных параметров
    if (!query_id || typeof query_id !== "string") {
      return res.status(400).json({ error: "query_id is required and must be a string" });
    }

    if (!component_Id || typeof component_Id !== "string") {
      return res.status(400).json({ error: "component_Id is required and must be a string" });
    }

    // Валидация parametrs (опционально, но если есть - должен быть валидным JSON)
    let paramsJson = "{}";
    if (parametrs !== undefined) {
      if (typeof parametrs !== "string") {
        return res.status(400).json({ error: "parametrs must be a JSON string" });
      }
      try {
        JSON.parse(parametrs);
        paramsJson = parametrs;
      } catch (error) {
        return res.status(400).json({ error: "invalid JSON in parametrs" });
      }
    }

    // Логирование запроса
    console.log(`[getData] GET Request: query_id=${query_id}, component_Id=${component_Id}, paramsJson=${paramsJson}`);

    // Специальная обработка для header_dates - используем periodService
    if (query_id === "header_dates") {
      const dates = getHeaderDates();
      return res.json({
        componentId: component_Id,
        type: "table",
        rows: [{
          periodDate: dates.periodDate,
          ppDate: dates.ppDate,
          pyDate: dates.pyDate,
        }],
      });
    }

    // Специальная обработка для kpis - трансформируем данные в формат старого endpoint'а
    if (query_id === "kpis") {
      // Построение SQL через builder
      let sql: string;
      try {
        sql = await buildQueryFromId(query_id, paramsJson);
        console.log(`[getData] Generated SQL for kpis: ${sql.substring(0, 200)}...`);
      } catch (error: any) {
        console.error(`[getData] Builder error:`, error);
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
          
          // Парсим параметры для получения periodDate
          const params = JSON.parse(paramsJson);
          const periodDate = params.p1 || formatDateForSQL(new Date());
          
          // Трансформируем данные KPI
          const transformedData = transformKPIData(data, periodDate);
          
          // Возвращаем в формате массива KPIMetric[] (как старый /api/kpis)
          return res.json(transformedData);
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
    }

    // Специальная обработка для layout - извлекаем sections из результата
    if (query_id === "layout") {
      // Построение SQL через builder
      let sql: string;
      try {
        sql = await buildQueryFromId(query_id, paramsJson);
        console.log(`[getData] Generated SQL for layout: ${sql.substring(0, 200)}...`);
      } catch (error: any) {
        console.error(`[getData] Builder error:`, error);
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
          
          // Для layout view теперь возвращает отдельные строки для каждого section_id
          // jsonb_agg собирает их в массив объектов с полем section
          if (Array.isArray(data) && data.length > 0) {
            // Извлекаем section из каждого элемента массива
            const sections = data
              .map((row: any) => row.section)
              .filter((section: any) => section !== null && section !== undefined);
            
            return res.json({
              sections: sections,
            });
          }
        }

        // Если структура неожиданная, возвращаем ошибку
        return res.status(500).json({ 
          error: "Unexpected result format",
          details: "Expected sections array in result"
        });
      } catch (error: any) {
        console.error(`[getData] SQL execution error:`, error);
        return res.status(500).json({ 
          error: "SQL execution error",
          details: error.message 
        });
      }
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
          componentId: component_Id,
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
