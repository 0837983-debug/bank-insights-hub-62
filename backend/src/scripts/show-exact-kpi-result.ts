/**
 * Show exact return value from getKPIMetrics()
 */

import { getKPIMetrics } from "../services/mart/kpiService.js";

async function showExactResult() {
  try {
    const result = await getKPIMetrics();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    process.exit(0);
  }
}

showExactResult();
