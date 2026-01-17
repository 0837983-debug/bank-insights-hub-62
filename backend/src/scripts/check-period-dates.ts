/**
 * Script to check available dates in mart.kpi_metrics
 */

import { pool } from "../config/database.js";

async function checkDates() {
  const client = await pool.connect();
  try {
    console.log("=== Доступные даты в mart.kpi_metrics ===\n");
    
    const result = await client.query(
      `SELECT DISTINCT period_date 
       FROM mart.kpi_metrics 
       ORDER BY period_date DESC 
       LIMIT 20`
    );
    
    console.log(`Найдено уникальных дат: ${result.rows.length}\n`);
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.period_date.toISOString().split('T')[0]}`);
    });
    
    // Check dates by month
    const byMonth = await client.query(
      `SELECT 
         DATE_TRUNC('month', period_date) as month,
         MAX(period_date) as max_date,
         COUNT(DISTINCT period_date) as dates_count
       FROM mart.kpi_metrics 
       GROUP BY DATE_TRUNC('month', period_date)
       ORDER BY month DESC
       LIMIT 12`
    );
    
    console.log("\n=== Даты по месяцам ===");
    byMonth.rows.forEach(row => {
      console.log(`${row.month.toISOString().split('T')[0]}: макс. ${row.max_date.toISOString().split('T')[0]} (${row.dates_count} уникальных дат)`);
    });
    
  } catch (error) {
    console.error("Ошибка:", error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

checkDates();
