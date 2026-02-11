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

const router = Router();

// transformKPIData удалена — данные возвращаются напрямую из SQL Builder
// Фронтенд получает поля как они определены в конфиге kpis

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

    // KPIs возвращаются напрямую как массив (без обёртки componentId/type/rows)
    // Формат определяется конфигом kpis в config.component_queries
    if (query_id === "kpis") {
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

      try {
        const result = await client.query(sql);
        
        if (result.rows.length === 1) {
          const data = result.rows[0].json_agg ?? [];
          // Возвращаем данные напрямую — формат определяется конфигом
          return res.json(data);
        }

        return res.status(500).json({ 
          error: "Unexpected result format",
          details: "Expected single row with json_agg result"
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
        
        // При wrapJson=true результат должен быть массивом с одним элементом
        if (result.rows.length === 1) {
          // json_agg возвращает null когда нет совпадающих данных
          const data = result.rows[0].json_agg ?? [];
          
          // Для layout view теперь возвращает отдельные строки для каждого section_id
          // json_agg собирает их в массив объектов с полем section
          if (Array.isArray(data)) {
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
      
      // При wrapJson=true результат должен быть массивом с одним элементом
      if (result.rows.length === 1) {
        // json_agg возвращает null когда нет совпадающих данных
        const data = result.rows[0].json_agg ?? [];
        
        // Возвращаем данные напрямую (трансформация происходит на фронтенде)
        return res.json({
          componentId: component_Id,
          type: "table",
          rows: data,
        });
      }

      // Если структура неожиданная, возвращаем ошибку
      return res.status(500).json({ 
        error: "Unexpected result format",
        details: "Expected single row with json_agg result"
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
