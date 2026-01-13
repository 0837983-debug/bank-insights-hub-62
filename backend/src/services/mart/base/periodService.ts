import { pool } from "../../../config/database.js";

/**
 * Get current period (today's date)
 */
export function getCurrentPeriod(): Date {
  return new Date();
}

/**
 * Get previous period (one month back)
 */
export function getPreviousPeriod(date: Date): Date {
  const previous = new Date(date);
  previous.setMonth(previous.getMonth() - 1);
  return previous;
}

/**
 * Get latest available period for a MART table
 */
export async function getLatestPeriodForTable(tableName: string): Promise<Date | null> {
  const client = await pool.connect();
  try {
    let query = "";
    let params: string[] = [];

    switch (tableName) {
      case "kpi_metrics":
        query = `SELECT MAX(period_date) as latest_date FROM mart.kpi_metrics`;
        break;
      case "financial_results":
        query = `SELECT MAX(period_date) as latest_date FROM mart.financial_results`;
        break;
      case "balance":
        query = `SELECT MAX(period_date) as latest_date FROM mart.balance`;
        break;
      default:
        return null;
    }

    const result = await client.query(query, params);
    
    if (result.rows.length === 0 || !result.rows[0].latest_date) {
      return null;
    }

    return new Date(result.rows[0].latest_date);
  } finally {
    client.release();
  }
}

/**
 * Format date to YYYY-MM-DD string for SQL queries
 */
export function formatDateForSQL(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
