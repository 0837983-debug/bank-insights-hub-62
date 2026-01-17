/**
 * Script to show what getKPIMetrics() returns
 */

import { getKPIMetrics } from "../services/mart/kpiService.js";

async function showKPIServiceResult() {
  try {
    console.log("=== Результат работы getKPIMetrics() ===\n");

    const metrics = await getKPIMetrics();
    
    console.log("Количество метрик:", metrics.length);
    console.log("\nПолный JSON результат:\n");
    console.log(JSON.stringify(metrics, null, 2));
    
    if (metrics.length > 0) {
      console.log("\n=== Детали первой метрики ===");
      const first = metrics[0];
      console.log("ID:", first.id);
      console.log("Title:", first.title);
      console.log("Value:", first.value);
      console.log("Description:", first.description);
      console.log("Category:", first.category);
      console.log("Icon:", first.icon || "не указана");
      console.log("Change (%):", first.change);
      console.log("ChangeAbsolute:", first.changeAbsolute);
      console.log("YTDChange (%):", first.ytdChange);
      console.log("YTDChangeAbsolute:", first.ytdChangeAbsolute);
    }

    console.log("\n=== Тест завершен ===");
  } catch (error) {
    console.error("❌ Ошибка:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

showKPIServiceResult();
