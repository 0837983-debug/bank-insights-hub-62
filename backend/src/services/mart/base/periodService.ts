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

/**
 * Interface for period dates
 */
export interface PeriodDates {
  current: Date | null;        // Максимальная дата, за которую есть данные
  previousMonth: Date | null;  // Максимальная дата предыдущего месяца
  previousYear: Date | null;   // Максимальная дата предыдущего года
}

/**
 * Get three period dates for KPI metrics:
 * 1. Maximum date with data in mart.kpi_metrics
 * 2. Maximum date of previous month with data (relative to date #1)
 * 3. Maximum date of previous year with data (relative to date #1)
 */
export async function getPeriodDates(): Promise<PeriodDates> {
  const client = await pool.connect();
  try {
    // 1. Get maximum date from mart.kpi_metrics
    const maxDateResult = await client.query(
      `SELECT MAX(period_date) as latest_date FROM mart.kpi_metrics`
    );

    if (maxDateResult.rows.length === 0 || !maxDateResult.rows[0].latest_date) {
      return {
        current: null,
        previousMonth: null,
        previousYear: null,
      };
    }

    const currentDate = new Date(maxDateResult.rows[0].latest_date);

    // 2. Get maximum date of previous month
    // Calculate start and end of previous month relative to current date
    const previousMonthStart = new Date(currentDate);
    previousMonthStart.setDate(1); // First day of current month
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1); // Move to previous month
    previousMonthStart.setHours(0, 0, 0, 0);

    const previousMonthEnd = new Date(currentDate);
    previousMonthEnd.setDate(0); // Last day of previous month (setDate(0) gives last day of prev month)
    previousMonthEnd.setHours(23, 59, 59, 999);

    const previousMonthResult = await client.query(
      `SELECT MAX(period_date) as max_date 
       FROM mart.kpi_metrics 
       WHERE period_date >= $1 AND period_date <= $2`,
      [formatDateForSQL(previousMonthStart), formatDateForSQL(previousMonthEnd)]
    );

    const previousMonth = previousMonthResult.rows[0]?.max_date 
      ? new Date(previousMonthResult.rows[0].max_date) 
      : null;

    // 3. Get maximum date of previous year
    // Calculate start and end of previous year relative to current date
    const previousYearStart = new Date(currentDate);
    previousYearStart.setFullYear(previousYearStart.getFullYear() - 1);
    previousYearStart.setMonth(0, 1); // January 1
    previousYearStart.setHours(0, 0, 0, 0);

    const previousYearEnd = new Date(currentDate);
    previousYearEnd.setFullYear(previousYearEnd.getFullYear() - 1);
    previousYearEnd.setMonth(11, 31); // December 31
    previousYearEnd.setHours(23, 59, 59, 999);

    const previousYearResult = await client.query(
      `SELECT MAX(period_date) as max_date 
       FROM mart.kpi_metrics 
       WHERE period_date >= $1 AND period_date <= $2`,
      [formatDateForSQL(previousYearStart), formatDateForSQL(previousYearEnd)]
    );

    const previousYear = previousYearResult.rows[0]?.max_date 
      ? new Date(previousYearResult.rows[0].max_date) 
      : null;

    return {
      current: currentDate,
      previousMonth: previousMonth,
      previousYear: previousYear,
    };
  } finally {
    client.release();
  }
}
