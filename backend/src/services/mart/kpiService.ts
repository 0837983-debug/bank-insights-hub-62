import { pool } from "../../config/database.js";
import { getPeriodDates, formatDateForSQL } from "./base/periodService.js";
import { calculateChange } from "./base/calculationService.js";
import { getComponentsByType } from "./base/componentService.js";
import { KPIMetric } from "./types.js";

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
    // 1. Получаем список всех активных карточек из конфига
    const allCards = await getComponentsByType("card");
    
    // Фильтруем по категории, если указана
    let filteredCards = allCards;
    if (category) {
      filteredCards = allCards.filter(card => card.category === category);
    }
    
    if (filteredCards.length === 0) {
        return [];
      }
    
    const componentIds = filteredCards.map(card => card.id);
    
    // Создаем Map для быстрого доступа к метаданным компонентов
    const componentsMap = new Map(
      filteredCards.map(card => [
        card.id,
        {
          title: card.title || card.id,
          description: card.description || "",
          icon: card.icon,
          category: card.category || "",
        }
      ])
    );
    
    // 2. Получаем три даты периодов
    let periodDates;
    if (periodDate) {
      // Если передана конкретная дата, используем её и вычисляем остальные
      const previousMonth = new Date(periodDate);
      previousMonth.setDate(1); // First day of current month
      previousMonth.setMonth(previousMonth.getMonth() - 1); // Move to previous month
      
      // Получаем максимальную дату предыдущего года из БД
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
    
      // Получаем максимальную дату предыдущего месяца из БД
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

    // 3. Один запрос с UNION ALL - без JOIN с config.components
    const query = `
      SELECT 
        km.component_id,
        MAX(km.value) as value,
        MAX(km.prev_period) as prev_period,
        MAX(km.prev_year) as prev_year
      FROM (
        -- Current period data
        SELECT 
          component_id,
          value,
          NULL::DECIMAL as prev_period,
          NULL::DECIMAL as prev_year
        FROM mart.kpi_metrics
        WHERE period_date = $1
          AND component_id = ANY($4::varchar[])
        
        UNION ALL
        
        -- Previous month data
        SELECT 
          component_id,
          NULL::DECIMAL as value,
          value as prev_period,
          NULL::DECIMAL as prev_year
        FROM mart.kpi_metrics
        WHERE period_date = $2
          AND component_id = ANY($4::varchar[])
        
        UNION ALL
        
        -- Previous year data
        SELECT 
          component_id,
          NULL::DECIMAL as value,
          NULL::DECIMAL as prev_period,
          value as prev_year
        FROM mart.kpi_metrics
        WHERE period_date = $3
          AND component_id = ANY($4::varchar[])
      ) km
      GROUP BY km.component_id
      ORDER BY km.component_id
    `;

    const result = await client.query(query, [
      periodDateStr, 
      previousPeriodStr, 
      previousYearStr, 
      componentIds
    ]);

    if (result.rows.length === 0) {
      return [];
    }

    // 4. Формируем результат с данными из БД
    const periodDateFormatted = formatDateForSQL(periodDates.current);
    const metrics: KPIMetric[] = result.rows
      .filter(row => componentsMap.has(row.component_id)) // Фильтруем только нужные компоненты
      .map((row) => {
      const currentValue = parseFloat(row.value) || 0;
        const previousValue = parseFloat(row.prev_period) || 0;
        const ytdValue = parseFloat(row.prev_year) || 0;
        
        // Расчет изменений в долях (не в процентах)
        const ppChange = calculateChange(currentValue, previousValue) / 100;
        const ytdChange = row.prev_year !== null ? calculateChange(currentValue, ytdValue) / 100 : undefined;
        
        // Расчет изменений в абсолютных значениях
        const ppChangeAbsolute = currentValue - previousValue;
        const ytdChangeAbsolute = row.prev_year !== null ? currentValue - ytdValue : undefined;

      return {
          id: row.component_id,
          periodDate: periodDateFormatted,
        value: currentValue,
          previousValue: previousValue,
          ytdValue: row.prev_year !== null ? ytdValue : undefined,
          ppChange: ppChange,
          ppChangeAbsolute: ppChangeAbsolute,
        ytdChange: ytdChange,
          ytdChangeAbsolute: ytdChangeAbsolute,
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

