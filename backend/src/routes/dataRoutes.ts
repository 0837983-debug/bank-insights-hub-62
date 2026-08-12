/**
 * Routes for unified data endpoint
 * GET /api/data - единая точка получения данных через SQL Builder
 *
 * Query params:
 * - query_id (обязательно)
 * - component_Id (обязательно)
 * - parametrs (опционально, JSON-строка)
 */

import { Router, Request, Response, NextFunction } from "express";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";
import { pool } from "../config/database.js";
import { AppError, AppErrorCode, mapBuilderError } from "../types/errors.js";

const router = Router();

/** Выполняет buildQueryFromId и преобразует ошибки в AppError (через карту ошибок). */
async function safeBuildQuery(queryId: string, paramsJson: string): Promise<string> {
  try {
    return await buildQueryFromId(queryId, paramsJson);
  } catch (error) {
    throw mapBuilderError(error);
  }
}

/**
 * GET /api/data
 * Получение данных по query_id, component_Id и parametrs из query string
 *
 * Query params:
 * - query_id (обязательно)
 * - component_Id (обязательно)
 * - parametrs (опционально, JSON-строка)
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { query_id, component_Id, parametrs } = req.query;

    // Валидация обязательных параметров
    if (!query_id || typeof query_id !== "string") {
      throw new AppError(AppErrorCode.QUERY_INVALID_PARAMS);
    }

    if (!component_Id || typeof component_Id !== "string") {
      throw new AppError(AppErrorCode.QUERY_INVALID_PARAMS);
    }

    // Валидация parametrs (опционально, но если есть - должен быть валидным JSON)
    let paramsJson = "{}";
    if (parametrs !== undefined) {
      if (typeof parametrs !== "string") {
        throw new AppError(AppErrorCode.QUERY_INVALID_PARAMS);
      }
      try {
        JSON.parse(parametrs);
        paramsJson = parametrs;
      } catch (error) {
        throw new AppError(AppErrorCode.QUERY_INVALID_PARAMS, undefined, error);
      }
    }

    // Логирование запроса
    console.log(`[getData] GET Request: query_id=${query_id}, component_Id=${component_Id}, paramsJson=${paramsJson}`);

    // KPIs возвращаются напрямую как массив (без обёртки componentId/type/rows)
    if (query_id === "kpis") {
      const sql = await safeBuildQuery(query_id, paramsJson);
      const result = await client.query(sql);

      if (result.rows.length === 1) {
        const data = result.rows[0].json_agg ?? [];
        return res.json(data);
      }

      throw new AppError(AppErrorCode.INTERNAL);
    }

    // Специальная обработка для layout - извлекаем sections из результата
    if (query_id === "layout") {
      const sql = await safeBuildQuery(query_id, paramsJson);
      const result = await client.query(sql);

      if (result.rows.length === 1) {
        const data = result.rows[0].json_agg ?? [];

        if (Array.isArray(data)) {
          const sections = data
            .map((row: unknown) => (row as { section?: unknown }).section)
            .filter((section: unknown) => section !== null && section !== undefined);

          return res.json({ sections });
        }
      }

      throw new AppError(AppErrorCode.INTERNAL);
    }

    // Построение SQL через builder (общая ветка)
    const sql = await safeBuildQuery(query_id, paramsJson);
    const result = await client.query(sql);

    if (result.rows.length === 1) {
      const data = result.rows[0].json_agg ?? [];
      return res.json({
        componentId: component_Id,
        type: "table",
        rows: data,
      });
    }

    throw new AppError(AppErrorCode.INTERNAL);
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

export default router;
