import { Router, Request, Response, NextFunction } from "express";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";
import { loadQueryConfig } from "../services/queryBuilder/queryLoader.js";
import { pool } from "../config/database.js";
import { AppError, AppErrorCode, mapBuilderError } from "../types/errors.js";

const router = Router();

/**
 * GET /api/sql-builder/query-ids
 * Получение списка доступных идентификаторов запросов.
 */
router.get("/query-ids", async (_req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT query_id, title, config_json 
       FROM config.component_queries 
       WHERE is_active = TRUE 
         AND deleted_at IS NULL 
       ORDER BY query_id`
    );

    return res.json({
      queryIds: result.rows.map((row) => ({
        id: row.query_id,
        description: row.title || null,
        config: row.config_json || null,
      })),
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

/**
 * GET /api/sql-builder/config/:query_id
 * Получение config_json для запроса (для предзаполнения параметров).
 */
router.get("/config/:query_id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query_id } = req.params;
    const queryConfig = await loadQueryConfig(query_id);
    if (!queryConfig) {
      throw new AppError(AppErrorCode.NOT_FOUND_DATA);
    }
    return res.json({ config: queryConfig.config });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sql-builder
 * Сборка SQL-запроса по query_id и params.
 * Тело: { query_id: string, params: Record<string, unknown> }
 * Ответ: { sql: string, params: unknown[], config }
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query_id, params } = req.body as {
      query_id?: string;
      params?: Record<string, unknown>;
    };

    if (!query_id || typeof query_id !== "string") {
      throw new AppError(AppErrorCode.QUERY_INVALID_PARAMS);
    }

    if (!params || typeof params !== "object") {
      throw new AppError(AppErrorCode.QUERY_INVALID_PARAMS);
    }

    const paramsJson = JSON.stringify(params);

    const queryConfig = await loadQueryConfig(query_id);
    if (!queryConfig) {
      throw new AppError(AppErrorCode.QUERY_INVALID_CONFIG);
    }

    const sql = await buildQueryFromId(query_id, paramsJson).catch(mapBuilderError);

    return res.json({
      sql,
      params: [],
      config: queryConfig.config,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
