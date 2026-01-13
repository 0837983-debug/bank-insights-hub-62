import { pool } from "../../../config/database.js";
import { getLatestPeriodForTable, getPreviousPeriod, formatDateForSQL } from "../base/periodService.js";
import { calculateChange, calculatePercentage } from "../base/calculationService.js";
import { TableRowData, KPIMetric } from "../types.js";
import { getKPIMetricsByCategory } from "../kpi/kpiService.js";
import { getRowName, isRowGroup, getParentId, getSortOrder } from "../base/rowNameMapper.js";

/**
 * Get financial results KPI metrics
 */
export async function getFinancialResultsKPI(periodDate?: Date): Promise<KPIMetric[]> {
  return getKPIMetricsByCategory("finance", periodDate);
}

interface TableRowFromDB {
  row_code: string;
  name: string;
  description: string | null;
  value: number;
  is_group: boolean;
  is_total: boolean;
  parent_id: string | null;
  sort_order: number;
}

/**
 * Get income data from mart.financial_results with optional grouping
 */
export async function getIncome(
  groupBy?: string,
  periodDate?: Date
): Promise<TableRowData[]> {
  const client = await pool.connect();
  try {
    // Determine period date
    let targetPeriod = periodDate;
    if (!targetPeriod) {
      const latest = await getLatestPeriodForTable("financial_results");
      if (!latest) {
        return [];
      }
      targetPeriod = latest;
    }

    const periodDateStr = formatDateForSQL(targetPeriod);
    const previousPeriod = getPreviousPeriod(targetPeriod);
    const previousPeriodStr = formatDateForSQL(previousPeriod);

    // Build query with grouping if needed
    let query = "";
    let params: any[] = [];

    if (groupBy) {
      // Map groupBy parameter to actual column name
      const groupByColumnMap: Record<string, string> = {
        cfo: "cfo_code",
        cfo_code: "cfo_code",
        client_segment: "client_segment",
        segment: "client_segment",
        product_code: "product_code",
        product: "product_code",
      };

      const groupByColumn = groupByColumnMap[groupBy] || groupBy;

      query = `
        SELECT 
          fr.row_code,
          fr.row_code as name,
          NULL as description,
          SUM(fr.value) as value,
          CASE WHEN COUNT(*) > 1 THEN true ELSE false END as is_group,
          false as is_total,
          NULL as parent_id,
          0 as sort_order,
          ${groupByColumn} as group_value
        FROM mart.financial_results fr
        WHERE fr.report_class = 'income'
          AND fr.period_date = $1
          AND fr.${groupByColumn} IS NOT NULL
        GROUP BY fr.row_code, ${groupByColumn}
        ORDER BY fr.row_code, ${groupByColumn}
      `;
      params = [periodDateStr];
    } else {
      query = `
        SELECT 
          fr.row_code,
          fr.row_code as name,
          NULL as description,
          SUM(fr.value) as value,
          CASE WHEN COUNT(*) > 1 THEN true ELSE false END as is_group,
          false as is_total,
          NULL as parent_id,
          0 as sort_order
        FROM mart.financial_results fr
        WHERE fr.report_class = 'income'
          AND fr.period_date = $1
        GROUP BY fr.row_code
        ORDER BY fr.row_code
      `;
      params = [periodDateStr];
    }

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return [];
    }

    // Get previous period values for change calculation
    const rowCodes = result.rows.map((row) => row.row_code);
    let previousQuery = "";
    
    if (groupBy) {
      const groupByColumnMap: Record<string, string> = {
        cfo: "cfo_code",
        cfo_code: "cfo_code",
        client_segment: "client_segment",
        segment: "client_segment",
        product_code: "product_code",
        product: "product_code",
      };
      const groupByColumn = groupByColumnMap[groupBy] || groupBy;
      
      previousQuery = `
        SELECT 
          fr.row_code,
          ${groupByColumn} as group_value,
          SUM(fr.value) as value
        FROM mart.financial_results fr
        WHERE fr.report_class = 'income'
          AND fr.period_date = $1
          AND fr.row_code = ANY($2::varchar[])
        GROUP BY fr.row_code, ${groupByColumn}
      `;
    } else {
      previousQuery = `
        SELECT 
          fr.row_code,
          SUM(fr.value) as value
        FROM mart.financial_results fr
        WHERE fr.report_class = 'income'
          AND fr.period_date = $1
          AND fr.row_code = ANY($2::varchar[])
        GROUP BY fr.row_code
      `;
    }

    const previousResult = await client.query(previousQuery, [
      previousPeriodStr,
      rowCodes,
    ]);

    // Build map of previous values
    const previousMap = new Map<string, number>();
    previousResult.rows.forEach((row) => {
      const key = groupBy ? `${row.row_code}_${row.group_value}` : row.row_code;
      previousMap.set(key, parseFloat(row.value) || 0);
    });

    // Calculate total for percentage calculation
    const total = result.rows.reduce((sum, row) => {
      return sum + (parseFloat(row.value) || 0);
    }, 0);

    // Transform to TableRowData format
    const rows: TableRowData[] = result.rows.map((row) => {
      const value = parseFloat(row.value) || 0;
      const key = groupBy ? `${row.row_code}_${row.group_value}` : row.row_code;
      const previousValue = previousMap.get(key) || 0;
      const change = calculateChange(value, previousValue);
      const percentage = total > 0 ? calculatePercentage(value, total) : 0;
      const rowCode = row.row_code;

      return {
        id: rowCode,
        name: getRowName(rowCode),
        description: row.description || undefined,
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
 * Get expenses data from mart.financial_results with optional grouping
 */
export async function getExpenses(
  groupBy?: string,
  periodDate?: Date
): Promise<TableRowData[]> {
  const client = await pool.connect();
  try {
    // Determine period date
    let targetPeriod = periodDate;
    if (!targetPeriod) {
      const latest = await getLatestPeriodForTable("financial_results");
      if (!latest) {
        return [];
      }
      targetPeriod = latest;
    }

    const periodDateStr = formatDateForSQL(targetPeriod);
    const previousPeriod = getPreviousPeriod(targetPeriod);
    const previousPeriodStr = formatDateForSQL(previousPeriod);

    // Handle FOT grouping
    let query = "";
    let params: any[] = [];

    if (groupBy === "fot") {
      // Group by line_item for FOT expenses
      query = `
        SELECT 
          fr.line_item as row_code,
          COALESCE(fr.line_item, 'Other') as name,
          NULL as description,
          SUM(fr.value) as value,
          false as is_group,
          false as is_total,
          NULL as parent_id,
          0 as sort_order
        FROM mart.financial_results fr
        WHERE fr.report_class = 'expense'
          AND fr.period_date = $1
          AND fr.line_item LIKE 'fot%'
        GROUP BY fr.line_item
        ORDER BY fr.line_item
      `;
      params = [periodDateStr];
    } else if (groupBy) {
      const groupByColumnMap: Record<string, string> = {
        cfo: "cfo_code",
        cfo_code: "cfo_code",
        client_segment: "client_segment",
        segment: "client_segment",
        product_code: "product_code",
        product: "product_code",
      };

      const groupByColumn = groupByColumnMap[groupBy] || groupBy;

      query = `
        SELECT 
          fr.row_code,
          fr.row_code as name,
          NULL as description,
          SUM(fr.value) as value,
          CASE WHEN COUNT(*) > 1 THEN true ELSE false END as is_group,
          false as is_total,
          NULL as parent_id,
          0 as sort_order
        FROM mart.financial_results fr
        WHERE fr.report_class = 'expense'
          AND fr.period_date = $1
          AND fr.${groupByColumn} IS NOT NULL
        GROUP BY fr.row_code, ${groupByColumn}
        ORDER BY fr.row_code, ${groupByColumn}
      `;
      params = [periodDateStr];
    } else {
      query = `
        SELECT 
          fr.row_code,
          fr.row_code as name,
          NULL as description,
          SUM(fr.value) as value,
          CASE WHEN COUNT(*) > 1 THEN true ELSE false END as is_group,
          false as is_total,
          NULL as parent_id,
          0 as sort_order
        FROM mart.financial_results fr
        WHERE fr.report_class = 'expense'
          AND fr.period_date = $1
        GROUP BY fr.row_code
        ORDER BY fr.row_code
      `;
      params = [periodDateStr];
    }

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return [];
    }

    // Get previous period values
    const rowCodes = result.rows.map((row) => row.row_code);
    const previousQuery = `
      SELECT 
        ${groupBy === "fot" ? "fr.line_item as row_code" : "fr.row_code"},
        SUM(fr.value) as value
      FROM mart.financial_results fr
      WHERE fr.report_class = 'expense'
        AND fr.period_date = $1
        ${groupBy === "fot" ? "AND fr.line_item LIKE 'fot%'" : ""}
        AND fr.row_code = ANY($2::varchar[])
      GROUP BY ${groupBy === "fot" ? "fr.line_item" : "fr.row_code"}
    `;

    const previousResult = await client.query(previousQuery, [
      previousPeriodStr,
      rowCodes,
    ]);

    const previousMap = new Map<string, number>();
    previousResult.rows.forEach((row) => {
      previousMap.set(row.row_code, parseFloat(row.value) || 0);
    });

    // Calculate total for percentage
    const total = result.rows.reduce((sum, row) => {
      return sum + (parseFloat(row.value) || 0);
    }, 0);

    // Transform to TableRowData format
    const rows: TableRowData[] = result.rows.map((row) => {
      const value = parseFloat(row.value) || 0;
      const previousValue = previousMap.get(row.row_code) || 0;
      const change = calculateChange(value, previousValue);
      const percentage = total > 0 ? calculatePercentage(value, total) : 0;
      // For FOT grouping, use line_item; otherwise use row_code
      const rowCode = (groupBy === "fot" ? row.line_item : row.row_code) || "unknown";

      return {
        id: rowCode,
        name: getRowName(rowCode),
        description: row.description || undefined,
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
