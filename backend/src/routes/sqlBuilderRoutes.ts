import { Router } from "express";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";
import { loadQueryConfig } from "../services/queryBuilder/queryLoader.js";
import { pool } from "../config/database.js";

const router = Router();

/**
 * GET /api/sql-builder/query-ids
 * Get list of available query IDs
 */
router.get("/query-ids", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT query_id, description 
       FROM config.component_queries 
       WHERE is_active = TRUE 
         AND deleted_at IS NULL 
       ORDER BY query_id`
    );

    return res.json({
      queryIds: result.rows.map((row) => ({
        id: row.query_id,
        description: row.description || null,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching query IDs:", error);
    return res.status(500).json({ error: "Failed to fetch query IDs" });
  } finally {
    client.release();
  }
});

/**
 * POST /api/sql-builder
 * Build SQL query from query_id and paramsJson
 * Body: { query_id: string, params: Record<string, any> }
 * Returns: { sql: string, params: any[] }
 */
router.post("/", async (req, res) => {
  try {
    const { query_id, params } = req.body;

    if (!query_id || typeof query_id !== "string") {
      return res.status(400).json({ error: "query_id is required and must be a string" });
    }

    if (!params || typeof params !== "object") {
      return res.status(400).json({ error: "params is required and must be an object" });
    }

    // Преобразуем params в JSON строку для builder
    const paramsJson = JSON.stringify(params);

    // Загружаем конфиг для возврата
    const queryConfig = await loadQueryConfig(query_id);
    if (!queryConfig) {
      return res.status(400).json({ error: "invalid config" });
    }

    // Build query
    try {
      const sql = await buildQueryFromId(query_id, paramsJson);
      // buildQueryFromId возвращает только SQL строку (уже с подставленными значениями)
      // Возвращаем в формате, совместимом со старым API, плюс конфиг
      return res.json({
        sql,
        params: [], // Параметры уже подставлены в SQL
        config: queryConfig.config, // Возвращаем JSON конфиг
      });
    } catch (error: any) {
      // Возвращаем детальное сообщение об ошибке
      return res.status(400).json({ error: error.message || "invalid config" });
    }
  } catch (error: any) {
    console.error("Error building SQL query:", error);
    return res.status(500).json({ error: "Failed to build SQL query" });
  }
});

export default router;
