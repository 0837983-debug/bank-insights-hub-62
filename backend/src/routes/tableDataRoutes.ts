import { Router } from "express";
import { getTableData } from "../services/tableDataService.js";
import { getIncomeDataByGrouping, incomeGroupingOptions } from "../services/incomeGroupingService.js";

const router = Router();

/**
 * GET /api/table-data/:tableId
 * Get table data by table ID
 * Optional query param: groupBy - for grouping the data
 */
router.get("/:tableId", async (req, res) => {
  try {
    const { tableId } = req.params;
    const { groupBy } = req.query;
    
    if (!tableId) {
      return res.status(400).json({ error: "tableId parameter is required" });
    }
    
    // Special handling for income table with grouping
    if (tableId === "income" && groupBy !== undefined) {
      const data = getIncomeDataByGrouping(groupBy as string | null);
      return res.json(data);
    }
    
    const data = await getTableData(tableId);
    res.json(data);
  } catch (error) {
    console.error("Error fetching table data:", error);
    res.status(500).json({ error: "Failed to fetch table data" });
  }
});

/**
 * GET /api/table-data/:tableId/grouping-options
 * Get available grouping options for a table
 */
router.get("/:tableId/grouping-options", async (req, res) => {
  try {
    const { tableId } = req.params;
    
    if (tableId === "income") {
      return res.json(incomeGroupingOptions);
    }
    
    res.json([]);
  } catch (error) {
    console.error("Error fetching grouping options:", error);
    res.status(500).json({ error: "Failed to fetch grouping options" });
  }
});

export default router;

