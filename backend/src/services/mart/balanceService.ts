import { pool } from "../../config/database.js";
import { getPeriodDates, formatDateForSQL } from "./base/periodService.js";
import { calculateChange, calculatePercentage } from "./base/calculationService.js";
import { TableRowData, KPIMetric } from "./types.js";
import { getKPIMetricsByCategory } from "./kpiService.js";
import { getRowDescription, getSortOrder } from "./base/rowNameMapper.js";

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
    // 1. Получаем три даты периодов
    // Используем mart.balance для определения периодов, а не mart.kpi_metrics
    let periodDates;
    if (periodDate) {
      // Если передана конкретная дата, используем её и вычисляем остальные
      const previousMonthStart = new Date(periodDate);
      previousMonthStart.setDate(1);
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      previousMonthStart.setHours(0, 0, 0, 0);
      
      const previousMonthEnd = new Date(periodDate);
      previousMonthEnd.setDate(0);
      previousMonthEnd.setHours(23, 59, 59, 999);
      
      const prevMonthResult = await client.query(
        `SELECT MAX(period_date) as max_date 
         FROM mart.balance 
         WHERE period_date >= $1 AND period_date <= $2 AND class = 'assets'`,
        [formatDateForSQL(previousMonthStart), formatDateForSQL(previousMonthEnd)]
      );
      
      const previousYearStart = new Date(periodDate);
      previousYearStart.setFullYear(previousYearStart.getFullYear() - 1);
      previousYearStart.setMonth(0, 1);
      previousYearStart.setHours(0, 0, 0, 0);
      
      const previousYearEnd = new Date(periodDate);
      previousYearEnd.setFullYear(previousYearEnd.getFullYear() - 1);
      previousYearEnd.setMonth(11, 31);
      previousYearEnd.setHours(23, 59, 59, 999);
      
      const prevYearResult = await client.query(
        `SELECT MAX(period_date) as max_date 
         FROM mart.balance 
         WHERE period_date >= $1 AND period_date <= $2 AND class = 'assets'`,
        [formatDateForSQL(previousYearStart), formatDateForSQL(previousYearEnd)]
      );
      
      periodDates = {
        current: periodDate,
        previousMonth: prevMonthResult.rows[0]?.max_date ? new Date(prevMonthResult.rows[0].max_date) : null,
        previousYear: prevYearResult.rows[0]?.max_date ? new Date(prevYearResult.rows[0].max_date) : null,
      };
    } else {
      // Используем mart.balance для определения текущего периода
      const maxDateResult = await client.query(
        `SELECT MAX(period_date) as latest_date FROM mart.balance WHERE class = 'assets'`
      );
      
      if (maxDateResult.rows.length === 0 || !maxDateResult.rows[0].latest_date) {
        return [];
      }
      
      const currentDate = new Date(maxDateResult.rows[0].latest_date);
      
      // Получаем previousMonth из mart.balance
      const previousMonthStart = new Date(currentDate);
      previousMonthStart.setDate(1);
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      previousMonthStart.setHours(0, 0, 0, 0);
      
      const previousMonthEnd = new Date(currentDate);
      previousMonthEnd.setDate(0);
      previousMonthEnd.setHours(23, 59, 59, 999);
      
      const prevMonthResult = await client.query(
        `SELECT MAX(period_date) as max_date 
         FROM mart.balance 
         WHERE period_date >= $1 AND period_date <= $2 AND class = 'assets'`,
        [formatDateForSQL(previousMonthStart), formatDateForSQL(previousMonthEnd)]
      );
      
      // Получаем previousYear из mart.balance
      const previousYearStart = new Date(currentDate);
      previousYearStart.setFullYear(previousYearStart.getFullYear() - 1);
      previousYearStart.setMonth(0, 1);
      previousYearStart.setHours(0, 0, 0, 0);
      
      const previousYearEnd = new Date(currentDate);
      previousYearEnd.setFullYear(previousYearEnd.getFullYear() - 1);
      previousYearEnd.setMonth(11, 31);
      previousYearEnd.setHours(23, 59, 59, 999);
      
      const prevYearResult = await client.query(
        `SELECT MAX(period_date) as max_date 
         FROM mart.balance 
         WHERE period_date >= $1 AND period_date <= $2 AND class = 'assets'`,
        [formatDateForSQL(previousYearStart), formatDateForSQL(previousYearEnd)]
      );
      
      periodDates = {
        current: currentDate,
        previousMonth: prevMonthResult.rows[0]?.max_date ? new Date(prevMonthResult.rows[0].max_date) : null,
        previousYear: prevYearResult.rows[0]?.max_date ? new Date(prevYearResult.rows[0].max_date) : null,
      };
    }
    
    // Если нет текущей даты, возвращаем пустой массив
    // previousMonth и previousYear могут быть null - это нормально
    if (!periodDates.current) {
      return [];
    }

    const periodDateStr = formatDateForSQL(periodDates.current);
    const previousPeriodStr = periodDates.previousMonth ? formatDateForSQL(periodDates.previousMonth) : null;
    const previousYearStr = periodDates.previousYear ? formatDateForSQL(periodDates.previousYear) : null;

    // 2. Получаем данные за три периода через UNION ALL
    // Используем DISTINCT ON для дедупликации по class, section, item, sub_item
    // Формируем запрос динамически, в зависимости от наличия previousMonth и previousYear
    const queryParts: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Текущий период (всегда есть)
    queryParts.push(`
      SELECT DISTINCT ON (class, section, item, sub_item)
        value,
        NULL::DECIMAL as prev_period,
        NULL::DECIMAL as prev_year,
        class,
        section,
        item,
        sub_item
      FROM mart.balance
      WHERE period_date = $${paramIndex}
        AND class = 'assets'
    `);
    queryParams.push(periodDateStr);
    paramIndex++;

    // Предыдущий месяц (может быть null)
    if (previousPeriodStr) {
      queryParts.push(`
        SELECT DISTINCT ON (class, section, item, sub_item)
          NULL::DECIMAL as value,
          value as prev_period,
          NULL::DECIMAL as prev_year,
          class,
          section,
          item,
          sub_item
        FROM mart.balance
        WHERE period_date = $${paramIndex}
          AND class = 'assets'
      `);
      queryParams.push(previousPeriodStr);
      paramIndex++;
    }

    // Предыдущий год (может быть null)
    if (previousYearStr) {
      queryParts.push(`
        SELECT DISTINCT ON (class, section, item, sub_item)
          NULL::DECIMAL as value,
          NULL::DECIMAL as prev_period,
          value as prev_year,
          class,
          section,
          item,
          sub_item
        FROM mart.balance
        WHERE period_date = $${paramIndex}
          AND class = 'assets'
      `);
      queryParams.push(previousYearStr);
    }

    const query = `
      SELECT 
        SUM(km.value) as value,
        SUM(km.prev_period) as prev_period,
        SUM(km.prev_year) as prev_year,
        km.class,
        km.section,
        km.item,
        km.sub_item
      FROM (
        ${queryParts.join(' UNION ALL ')}
      ) km
      GROUP BY km.class, km.section, km.item, km.sub_item
      ORDER BY km.class, km.section, km.item, km.sub_item
    `;

    const result = await client.query(query, queryParams);

    if (result.rows.length === 0) {
      return [];
    }

    // 4. Вычисляем total для процентного расчета
    const total = result.rows.reduce((sum, row) => {
      return sum + (parseFloat(row.value) || 0);
    }, 0);

    // 5. Трансформируем в TableRowData с новыми полями
    const rows: TableRowData[] = result.rows.map((row) => {
      const currentValue = parseFloat(row.value) || 0;
      const previousValue = parseFloat(row.prev_period) || 0;
      const ytdValue = parseFloat(row.prev_year) || 0;
      
      // Формируем id из комбинации полей
      const idParts = [row.class, row.section, row.item, row.sub_item].filter(Boolean);
      const rowId = idParts.join('-') || 'unknown';

      // Вычисляем изменения в долях (без домножения на 100)
      const ppChange = calculateChange(currentValue, previousValue) / 100;
      const ppChangeAbsolute = currentValue - previousValue;
      const ytdChange = row.prev_year !== null ? calculateChange(currentValue, ytdValue) / 100 : undefined;
      const ytdChangeAbsolute = row.prev_year !== null ? currentValue - ytdValue : undefined;
      const percentage = total > 0 ? currentValue / total : 0; // В долях (0-1), не в процентах

      const periodDateFormatted = periodDates.current ? formatDateForSQL(periodDates.current) : undefined;
      
      return {
        // Поля из mart.balance (основные)
        class: row.class || undefined,
        section: row.section || undefined,
        item: row.item || undefined,
        sub_item: row.sub_item || undefined,
        value: currentValue,
        // Расчетные поля
        percentage: percentage,
        previousValue: previousValue,
        ytdValue: row.prev_year !== null ? ytdValue : undefined,
        ppChange: ppChange,
        ppChangeAbsolute: ppChangeAbsolute,
        ytdChange: ytdChange,
        ytdChangeAbsolute: ytdChangeAbsolute,
        // Служебные поля
        id: rowId,
        period_date: periodDateFormatted,
        description: getRowDescription(rowId) || undefined,
        sortOrder: getSortOrder(rowId),
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
    // 1. Получаем три даты периодов
    let periodDates;
    if (periodDate) {
      // Если передана конкретная дата, используем её и вычисляем остальные
      const previousMonth = new Date(periodDate);
      previousMonth.setDate(1);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      
      const previousYearStart = new Date(periodDate);
      previousYearStart.setFullYear(previousYearStart.getFullYear() - 1);
      previousYearStart.setMonth(0, 1);
      previousYearStart.setHours(0, 0, 0, 0);
      
      const previousYearEnd = new Date(periodDate);
      previousYearEnd.setFullYear(previousYearEnd.getFullYear() - 1);
      previousYearEnd.setMonth(11, 31);
      previousYearEnd.setHours(23, 59, 59, 999);
      
      const prevYearResult = await client.query(
        `SELECT MAX(period_date) as max_date 
         FROM mart.kpi_metrics 
         WHERE period_date >= $1 AND period_date <= $2`,
        [formatDateForSQL(previousYearStart), formatDateForSQL(previousYearEnd)]
      );
      
      const previousMonthStart = new Date(periodDate);
      previousMonthStart.setDate(1);
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      previousMonthStart.setHours(0, 0, 0, 0);
      
      const previousMonthEnd = new Date(periodDate);
      previousMonthEnd.setDate(0);
      previousMonthEnd.setHours(23, 59, 59, 999);
      
      const prevMonthResult = await client.query(
        `SELECT MAX(period_date) as max_date 
         FROM mart.kpi_metrics 
         WHERE period_date >= $1 AND period_date <= $2`,
        [formatDateForSQL(previousMonthStart), formatDateForSQL(previousMonthEnd)]
      );
      
      periodDates = {
        current: periodDate,
        previousMonth: prevMonthResult.rows[0]?.max_date ? new Date(prevMonthResult.rows[0].max_date) : null,
        previousYear: prevYearResult.rows[0]?.max_date ? new Date(prevYearResult.rows[0].max_date) : null,
      };
    } else {
      periodDates = await getPeriodDates();
    }
    
    if (!periodDates.current || !periodDates.previousMonth || !periodDates.previousYear) {
      return [];
    }

    const periodDateStr = formatDateForSQL(periodDates.current);
    const previousPeriodStr = formatDateForSQL(periodDates.previousMonth);
    const previousYearStr = formatDateForSQL(periodDates.previousYear);

    // 2. Получаем данные за три периода через UNION ALL
    // Используем DISTINCT ON для дедупликации по class, section, item, sub_item
    const query = `
      SELECT 
        SUM(km.value) as value,
        SUM(km.prev_period) as prev_period,
        SUM(km.prev_year) as prev_year,
        km.class,
        km.section,
        km.item,
        km.sub_item
      FROM (
        SELECT DISTINCT ON (class, section, item, sub_item)
          value,
          NULL::DECIMAL as prev_period,
          NULL::DECIMAL as prev_year,
          class,
          section,
          item,
          sub_item
        FROM mart.balance
        WHERE period_date = $1
          AND class = 'liabilities'
        
        UNION ALL
        
        SELECT DISTINCT ON (class, section, item, sub_item)
          NULL::DECIMAL as value,
          value as prev_period,
          NULL::DECIMAL as prev_year,
          class,
          section,
          item,
          sub_item
        FROM mart.balance
        WHERE period_date = $2
          AND class = 'liabilities'
        
        UNION ALL
        
        SELECT DISTINCT ON (class, section, item, sub_item)
          NULL::DECIMAL as value,
          NULL::DECIMAL as prev_period,
          value as prev_year,
          class,
          section,
          item,
          sub_item
        FROM mart.balance
        WHERE period_date = $3
          AND class = 'liabilities'
      ) km
      GROUP BY km.class, km.section, km.item, km.sub_item
      ORDER BY km.class, km.section, km.item, km.sub_item
    `;

    const result = await client.query(query, [
      periodDateStr,
      previousPeriodStr,
      previousYearStr
    ]);

    if (result.rows.length === 0) {
      return [];
    }

    // 4. Вычисляем total для процентного расчета
    const total = result.rows.reduce((sum, row) => {
      return sum + (parseFloat(row.value) || 0);
    }, 0);

    // 5. Трансформируем в TableRowData с новыми полями
    const rows: TableRowData[] = result.rows.map((row) => {
      const currentValue = parseFloat(row.value) || 0;
      const previousValue = parseFloat(row.prev_period) || 0;
      const ytdValue = parseFloat(row.prev_year) || 0;
      
      // Формируем id из комбинации полей
      const idParts = [row.class, row.section, row.item, row.sub_item].filter(Boolean);
      const rowId = idParts.join('-') || 'unknown';

      // Вычисляем изменения в долях (без домножения на 100)
      const ppChange = calculateChange(currentValue, previousValue) / 100;
      const ppChangeAbsolute = currentValue - previousValue;
      const ytdChange = row.prev_year !== null ? calculateChange(currentValue, ytdValue) / 100 : undefined;
      const ytdChangeAbsolute = row.prev_year !== null ? currentValue - ytdValue : undefined;
      const percentage = total > 0 ? currentValue / total : 0; // В долях (0-1), не в процентах

      const periodDateFormatted = periodDates.current ? formatDateForSQL(periodDates.current) : undefined;
      
      return {
        // Поля из mart.balance (основные)
        class: row.class || undefined,
        section: row.section || undefined,
        item: row.item || undefined,
        sub_item: row.sub_item || undefined,
        value: currentValue,
        // Расчетные поля
        percentage: percentage,
        previousValue: previousValue,
        ytdValue: row.prev_year !== null ? ytdValue : undefined,
        ppChange: ppChange,
        ppChangeAbsolute: ppChangeAbsolute,
        ytdChange: ytdChange,
        ytdChangeAbsolute: ytdChangeAbsolute,
        // Служебные поля
        id: rowId,
        period_date: periodDateFormatted,
        description: getRowDescription(rowId) || undefined,
        sortOrder: getSortOrder(rowId),
      };
    });

    return rows;
  } finally {
    client.release();
  }
}
