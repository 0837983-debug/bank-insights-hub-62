/**
 * Script to test getKPIMetrics() and show JSON output
 */

import { getKPIMetrics } from "../services/mart/kpiService.js";

async function testKPIService() {
  try {
    console.log("=== Тестирование getKPIMetrics() ===\n");

    const metrics = await getKPIMetrics();
    
    console.log("JSON результат:\n");
    console.log(JSON.stringify(metrics, null, 2));
    
    console.log(`\nВсего метрик: ${metrics.length}`);
    
  } catch (error) {
    console.error("❌ Ошибка:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

testKPIService();
