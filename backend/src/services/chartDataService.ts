import { pool } from "../config/database.js";

/**
 * Get chart data by chart ID
 */
export async function getChartData(chartId: string): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT data_json
       FROM dashboard.chart_data
       WHERE chart_id = $1`,
      [chartId]
    );
    return result.rows[0]?.data_json || null;
  } finally {
    client.release();
  }
}

/**
 * Insert or update chart data
 */
export async function upsertChartData(
  chartId: string,
  data: any
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO dashboard.chart_data (chart_id, data_json)
       VALUES ($1, $2)
       ON CONFLICT (chart_id)
       DO UPDATE SET
         data_json = EXCLUDED.data_json,
         updated_at = CURRENT_TIMESTAMP`,
      [chartId, JSON.stringify(data)]
    );
  } finally {
    client.release();
  }
}

