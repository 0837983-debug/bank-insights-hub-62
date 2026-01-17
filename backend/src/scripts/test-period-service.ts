/**
 * Script to test periodService.getPeriodDates()
 */

import { getPeriodDates } from "../services/mart/base/periodService.js";

async function testPeriodService() {
  try {
    console.log("=== Тестирование periodService.getPeriodDates() ===\n");

    const periods = await getPeriodDates();

    console.log("Результат:");
    console.log(`1. Текущая максимальная дата: ${periods.current ? periods.current.toISOString().split('T')[0] : 'null'}`);
    console.log(`2. Максимальная дата предыдущего месяца: ${periods.previousMonth ? periods.previousMonth.toISOString().split('T')[0] : 'null'}`);
    console.log(`3. Максимальная дата предыдущего года: ${periods.previousYear ? periods.previousYear.toISOString().split('T')[0] : 'null'}`);

    if (periods.current) {
      console.log("\nДетали:");
      console.log(`   Текущая дата: ${periods.current.toISOString()}`);
      
      if (periods.previousMonth) {
        const monthDiff = Math.round((periods.current.getTime() - periods.previousMonth.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   Разница с предыдущим месяцем: ${monthDiff} дней`);
      }
      
      if (periods.previousYear) {
        const yearDiff = Math.round((periods.current.getTime() - periods.previousYear.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   Разница с предыдущим годом: ${yearDiff} дней`);
      }
    } else {
      console.log("\n⚠️  Нет данных в mart.kpi_metrics!");
    }

    console.log("\n=== Тест завершен ===");
  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

testPeriodService();
