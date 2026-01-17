import { Router } from "express";
import {
  getKPIMetrics,
  getKPIMetricsByCategory,
} from "../services/mart/kpiService.js";

const router = Router();

/**
 * GET /api/kpis
 * Get all KPI metrics
 * Query params:
 *   - category: Filter by category (e.g., 'finance', 'balance')
 *   - periodDate: Optional period date (YYYY-MM-DD format)
 */
router.get("/", async (req, res) => {
  try {
    const { category, periodDate } = req.query;

    let targetPeriod: Date | undefined;
    if (periodDate && typeof periodDate === "string") {
      targetPeriod = new Date(periodDate);
      if (isNaN(targetPeriod.getTime())) {
        return res.status(400).json({ error: "Invalid periodDate format. Use YYYY-MM-DD" });
      }
    }

    // Get metrics from MART only (mocks are archived)
    const metrics = category
      ? await getKPIMetricsByCategory(category as string, targetPeriod)
      : await getKPIMetrics(undefined, targetPeriod);
    
    console.log(`Fetched ${metrics.length} metrics from MART${category ? ` for category ${category}` : ""}`);
    
    if (metrics.length === 0) {
      console.warn("No KPI metrics found in MART. Ensure data is loaded via migration 011_insert_test_data_mart.sql");
    }

    res.json(metrics);
  } catch (error) {
    console.error("Error fetching KPI metrics from MART:", error);
    res.status(500).json({ error: "Failed to fetch KPI metrics" });
  }
});

export default router;

