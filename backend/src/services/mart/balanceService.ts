import { pool } from "../../config/database.js";
import { getLatestPeriodForTable, getPreviousPeriod, formatDateForSQL } from "./base/periodService.js";
import { calculateChange, calculatePercentage } from "./base/calculationService.js";
import { TableRowData, KPIMetric } from "./types.js";
import { getKPIMetricsByCategory } from "./kpiService.js";
import { getRowName, getRowDescription, isRowGroup, getParentId, getSortOrder } from "./base/rowNameMapper.js";

/**
 * Get balance KPI metrics
 */
export async function getBalanceKPI(periodDate?: Date): Promise<KPIMetric[]> {
  return getKPIMetricsByCategory("balance", periodDate);
}

/**
 * Get assets data from mart.balance
 */
export async function getAssets(periodDate?: Date): Promise<TableRowData[]> {
  const client = await pool.connect();
  try {
    // Determine period date
    let targetPeriod = periodDate;
    if (!targetPeriod) {
      const latest = await getLatestPeriodForTable("balance");
      if (!latest) {
        return [];
      }
      targetPeriod = latest;
    }

    const periodDateStr = formatDateForSQL(targetPeriod);
    const previousPeriod = getPreviousPeriod(targetPeriod);
    const previousPeriodStr = formatDateForSQL(previousPeriod);

    // Query for assets
    const query = `
      SELECT 
        br.row_code,
        br.row_code as name,
        NULL as description,
        SUM(br.value) as value,
        CASE WHEN COUNT(*) > 1 THEN true ELSE false END as is_group,
        false as is_total,
        NULL as parent_id,
        0 as sort_order
      FROM mart.balance br
      WHERE br.balance_class = 'assets'
        AND br.period_date = $1
      GROUP BY br.row_code
      ORDER BY br.row_code
    `;

    const result = await client.query(query, [periodDateStr]);

    if (result.rows.length === 0) {
      return [];
    }

    // Get previous period values for change calculation
    const rowCodes = result.rows.map((row) => row.row_code);
    const previousResult = await client.query(
      `SELECT 
        row_code,
        SUM(value) as value
       FROM mart.balance
       WHERE balance_class = 'assets'
         AND period_date = $1
         AND row_code = ANY($2::varchar[])
       GROUP BY row_code`,
      [previousPeriodStr, rowCodes]
    );

    const previousMap = new Map<string, number>();
    previousResult.rows.forEach((row) => {
      previousMap.set(row.row_code, parseFloat(row.value) || 0);
    });

    // Calculate total for percentage calculation
    const total = result.rows.reduce((sum, row) => {
      return sum + (parseFloat(row.value) || 0);
    }, 0);

    // Transform to TableRowData format
    const rows: TableRowData[] = result.rows.map((row) => {
      const value = parseFloat(row.value) || 0;
      const previousValue = previousMap.get(row.row_code) || 0;
      const change = calculateChange(value, previousValue);
      const percentage = total > 0 ? calculatePercentage(value, total) : 0;
      const rowCode = row.row_code;

      return {
        id: rowCode,
        name: getRowName(rowCode),
        description: getRowDescription(rowCode) || row.description || undefined,
        value: value,
        percentage: percentage,
        change: change,
        isGroup: isRowGroup(rowCode),
        isTotal: false,
        parentId: getParentId(rowCode),
        sortOrder: getSortOrder(rowCode),
      };
    });

    return rows;
  } finally {
    client.release();
  }
}

/**
 * Get liabilities data from mart.balance
 */
export async function getLiabilities(periodDate?: Date): Promise<TableRowData[]> {
  const client = await pool.connect();
  try {
    // Determine period date
    let targetPeriod = periodDate;
    if (!targetPeriod) {
      const latest = await getLatestPeriodForTable("balance");
      if (!latest) {
        return [];
      }
      targetPeriod = latest;
    }

    const periodDateStr = formatDateForSQL(targetPeriod);
    const previousPeriod = getPreviousPeriod(targetPeriod);
    const previousPeriodStr = formatDateForSQL(previousPeriod);

    // Query for liabilities
    const query = `
      SELECT 
        br.row_code,
        br.row_code as name,
        NULL as description,
        SUM(br.value) as value,
        CASE WHEN COUNT(*) > 1 THEN true ELSE false END as is_group,
        false as is_total,
        NULL as parent_id,
        0 as sort_order
      FROM mart.balance br
      WHERE br.balance_class = 'liabilities'
        AND br.period_date = $1
      GROUP BY br.row_code
      ORDER BY br.row_code
    `;

    const result = await client.query(query, [periodDateStr]);

    if (result.rows.length === 0) {
      return [];
    }

    // Get previous period values for change calculation
    const rowCodes = result.rows.map((row) => row.row_code);
    const previousResult = await client.query(
      `SELECT 
        row_code,
        SUM(value) as value
       FROM mart.balance
       WHERE balance_class = 'liabilities'
         AND period_date = $1
         AND row_code = ANY($2::varchar[])
       GROUP BY row_code`,
      [previousPeriodStr, rowCodes]
    );

    const previousMap = new Map<string, number>();
    previousResult.rows.forEach((row) => {
      previousMap.set(row.row_code, parseFloat(row.value) || 0);
    });

    // Calculate total for percentage calculation
    const total = result.rows.reduce((sum, row) => {
      return sum + (parseFloat(row.value) || 0);
    }, 0);

    // Transform to TableRowData format
    const rows: TableRowData[] = result.rows.map((row) => {
      const value = parseFloat(row.value) || 0;
      const previousValue = previousMap.get(row.row_code) || 0;
      const change = calculateChange(value, previousValue);
      const percentage = total > 0 ? calculatePercentage(value, total) : 0;
      const rowCode = row.row_code;

      return {
        id: rowCode,
        name: getRowName(rowCode),
        description: getRowDescription(rowCode) || row.description || undefined,
        value: value,
        percentage: percentage,
        change: change,
        isGroup: isRowGroup(rowCode),
        isTotal: false,
        parentId: getParentId(rowCode),
        sortOrder: getSortOrder(rowCode),
      };
    });

    return rows;
  } finally {
    client.release();
  }
}
