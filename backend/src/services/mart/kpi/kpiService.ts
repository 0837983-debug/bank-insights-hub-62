import { pool } from "../../../config/database.js";
import { getLatestPeriodForTable, getPreviousPeriod, formatDateForSQL } from "../base/periodService.js";
import { calculateChange } from "../base/calculationService.js";
import { KPIMetric } from "../types.js";

/**
 * Get all KPI metrics from mart.kpi_metrics
 * @param category - Optional filter by category (from config.components.category)
 * @param periodDate - Optional period date, defaults to latest available period
 */
export async function getKPIMetrics(
  category?: string,
  periodDate?: Date
): Promise<KPIMetric[]> {
  const client = await pool.connect();
  try {
    // Determine period date
    let targetPeriod = periodDate;
    if (!targetPeriod) {
      const latest = await getLatestPeriodForTable("kpi_metrics");
      if (!latest) {
        return [];
      }
      targetPeriod = latest;
    }

    const periodDateStr = formatDateForSQL(targetPeriod);
    const previousPeriod = getPreviousPeriod(targetPeriod);
    const previousPeriodStr = formatDateForSQL(previousPeriod);
    
    // Get start of year for YTD calculation
    const startOfYear = new Date(targetPeriod.getFullYear(), 0, 1);
    const startOfYearStr = formatDateForSQL(startOfYear);

    // Build query
    let query = `
      SELECT 
        km.component_id,
        km.period_date,
        km.value,
        c.title,
        c.description,
        c.icon,
        c.category,
        COALESCE(c.data_source_key, km.component_id) as data_source_key
      FROM mart.kpi_metrics km
      JOIN config.components c ON km.component_id = c.id
      WHERE km.period_date = $1
        AND c.component_type = 'card'
        AND c.is_active = TRUE
        AND c.deleted_at IS NULL
    `;

    const params: any[] = [periodDateStr];

    if (category) {
      query += ` AND c.category = $2`;
      params.push(category);
    }

    query += ` ORDER BY c.title`;

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return [];
    }

    // Get previous period values for change calculation
    const componentIds = result.rows.map((row) => row.component_id);
    const previousResult = await client.query(
      `SELECT component_id, value
       FROM mart.kpi_metrics
       WHERE period_date = $1
         AND component_id = ANY($2::varchar[])`,
      [previousPeriodStr, componentIds]
    );

    const previousMap = new Map(
      previousResult.rows.map((row) => [
        row.component_id,
        parseFloat(row.value) || 0,
      ])
    );

    // Get YTD values (first available date in the year) for YTD change calculation
    // If exact start of year date doesn't exist, get the earliest date in that year
    const ytdResult = await client.query(
      `SELECT DISTINCT ON (component_id) 
         component_id, 
         value,
         period_date
       FROM mart.kpi_metrics
       WHERE period_date >= $1
         AND period_date < $2
         AND component_id = ANY($3::varchar[])
       ORDER BY component_id, period_date ASC`,
      [startOfYearStr, formatDateForSQL(new Date(targetPeriod.getFullYear() + 1, 0, 1)), componentIds]
    );

    const ytdMap = new Map(
      ytdResult.rows.map((row) => [
        row.component_id,
        parseFloat(row.value) || 0,
      ])
    );

    // Transform to KPIMetric format
    const metrics: KPIMetric[] = result.rows.map((row) => {
      const currentValue = parseFloat(row.value) || 0;
      const previousValue = previousMap.get(row.component_id) || 0;
      const ytdValue = ytdMap.get(row.component_id) || 0;
      const change = calculateChange(currentValue, previousValue);
      // Calculate YTD change if we have YTD value (even if it's zero)
      const ytdChange = ytdMap.has(row.component_id) ? calculateChange(currentValue, ytdValue) : undefined;

      return {
        id: row.data_source_key || row.component_id,
        title: row.title || row.component_id,
        value: currentValue,
        description: row.description || "",
        change: change,
        ytdChange: ytdChange,
        category: row.category || "",
        icon: row.icon || undefined,
      };
    });

    return metrics;
  } finally {
    client.release();
  }
}

/**
 * Get KPI metrics by category
 */
export async function getKPIMetricsByCategory(
  category: string,
  periodDate?: Date
): Promise<KPIMetric[]> {
  return getKPIMetrics(category, periodDate);
}

/**
 * Get single KPI metric by component ID
 */
export async function getKPIMetricById(
  componentId: string,
  periodDate?: Date
): Promise<KPIMetric | null> {
  const client = await pool.connect();
  try {
    // Determine period date
    let targetPeriod = periodDate;
    if (!targetPeriod) {
      const latest = await getLatestPeriodForTable("kpi_metrics");
      if (!latest) {
        return null;
      }
      targetPeriod = latest;
    }

    const periodDateStr = formatDateForSQL(targetPeriod);
    const previousPeriod = getPreviousPeriod(targetPeriod);
    const previousPeriodStr = formatDateForSQL(previousPeriod);
    
    // Get start of year for YTD calculation
    const startOfYear = new Date(targetPeriod.getFullYear(), 0, 1);
    const startOfYearStr = formatDateForSQL(startOfYear);

    // Get current period value
    const result = await client.query(
      `SELECT 
        km.component_id,
        km.value,
        c.title,
        c.description,
        c.icon,
        c.category,
        COALESCE(c.data_source_key, km.component_id) as data_source_key
       FROM mart.kpi_metrics km
       JOIN config.components c ON km.component_id = c.id
       WHERE km.component_id = $1
         AND km.period_date = $2
         AND c.component_type = 'card'
         AND c.is_active = TRUE
         AND c.deleted_at IS NULL`,
      [componentId, periodDateStr]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get previous period value
    const previousResult = await client.query(
      `SELECT value
       FROM mart.kpi_metrics
       WHERE component_id = $1
         AND period_date = $2`,
      [componentId, previousPeriodStr]
    );

    // Get YTD value (first available date in the year)
    const ytdResult = await client.query(
      `SELECT value
       FROM mart.kpi_metrics
       WHERE component_id = $1
         AND period_date >= $2
         AND period_date < $3
       ORDER BY period_date ASC
       LIMIT 1`,
      [componentId, startOfYearStr, formatDateForSQL(new Date(targetPeriod.getFullYear() + 1, 0, 1))]
    );

    const currentValue = parseFloat(row.value) || 0;
    const previousValue =
      previousResult.rows.length > 0
        ? parseFloat(previousResult.rows[0].value) || 0
        : 0;
    const ytdValue =
      ytdResult.rows.length > 0
        ? parseFloat(ytdResult.rows[0].value) || 0
        : 0;
    const change = calculateChange(currentValue, previousValue);
    // Calculate YTD change only if we have YTD value and it's not zero (or if it's a valid zero)
    const ytdChange = ytdResult.rows.length > 0 ? calculateChange(currentValue, ytdValue) : undefined;

    return {
      id: row.data_source_key || row.component_id,
      title: row.title || row.component_id,
      value: currentValue,
      description: row.description || "",
      change: change,
      ytdChange: ytdChange,
      category: row.category || "",
      icon: row.icon || undefined,
    };
  } finally {
    client.release();
  }
}
