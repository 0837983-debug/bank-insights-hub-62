/**
 * Script to test new getKPIMetrics() implementation
 */

import { getKPIMetrics } from "../services/mart/kpiService.js";

async function testKPIService() {
  try {
    console.log("=== Тестирование нового getKPIMetrics() ===\n");

    // Test 1: Get all metrics
    console.log("1. Получение всех KPI метрик:");
    const allMetrics = await getKPIMetrics();
    console.log(`   Найдено метрик: ${allMetrics.length}`);
    
    if (allMetrics.length > 0) {
      console.log("\n   Примеры метрик:");
      allMetrics.slice(0, 3).forEach(metric => {
        console.log(`   - ${metric.title}:`);
        console.log(`     Значение: ${metric.value}`);
        console.log(`     Изменение (месяц): ${metric.change}% (абс: ${metric.changeAbsolute || 0})`);
        if (metric.ytdChange !== undefined) {
          console.log(`     Изменение (год): ${metric.ytdChange}% (абс: ${metric.ytdChangeAbsolute || 0})`);
        }
        console.log(`     Категория: ${metric.category}`);
      });
    }

    // Test 2: Get metrics by category
    console.log("\n2. Получение метрик по категории 'finance':");
    const financeMetrics = await getKPIMetrics("finance");
    console.log(`   Найдено метрик: ${financeMetrics.length}`);
    if (financeMetrics.length > 0) {
      financeMetrics.slice(0, 2).forEach(metric => {
        console.log(`   - ${metric.title}: ${metric.value}`);
      });
    }

    // Test 3: Get metrics with specific date
    console.log("\n3. Получение метрик на дату 2025-11-30:");
    const dateMetrics = await getKPIMetrics(undefined, new Date("2025-11-30"));
    console.log(`   Найдено метрик: ${dateMetrics.length}`);
    if (dateMetrics.length > 0) {
      console.log(`   Первая метрика: ${dateMetrics[0].title} = ${dateMetrics[0].value}`);
    }

    console.log("\n=== Тест завершен ===");
  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

testKPIService();
