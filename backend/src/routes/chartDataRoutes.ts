import { Router } from "express";
import { getChartData } from "../services/chartDataService.js";

const router = Router();

/**
 * GET /api/chart-data/:chartId
 * Get chart data by chart ID
 */
router.get("/:chartId", async (req, res) => {
  try {
    const { chartId } = req.params;
    
    if (!chartId) {
      return res.status(400).json({ error: "chartId parameter is required" });
    }
    
    const data = await getChartData(chartId);
    
    if (!data) {
      return res.status(404).json({ error: "Chart data not found" });
    }
    
    res.json(data);
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: "Failed to fetch chart data" });
  }
});

export default router;

