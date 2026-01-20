/**
 * Загрузка конфигов запросов из БД
 */

import { pool } from "../../config/database.js";
import type { QueryConfig } from "./types.js";

/**
 * Результат загрузки конфига запроса
 */
export interface QueryConfigWithWrap {
  config: QueryConfig;
  wrapJson: boolean;
}

/**
 * Загрузить конфиг запроса из БД по query_id
 * @param queryId - идентификатор запроса
 * @returns конфиг запроса с wrapJson или null, если не найден
 */
export async function loadQueryConfig(queryId: string): Promise<QueryConfigWithWrap | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT config_json, wrap_json 
       FROM config.component_queries 
       WHERE query_id = $1 
         AND is_active = TRUE 
         AND deleted_at IS NULL`,
      [queryId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      config: result.rows[0].config_json as QueryConfig,
      wrapJson: result.rows[0].wrap_json === true,
    };
  } finally {
    client.release();
  }
}
