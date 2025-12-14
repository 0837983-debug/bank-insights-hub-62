import { Router } from "express";
import { getTableData } from "../services/tableDataService.js";

const router = Router();

/**
 * GET /api/table-data/:tableId
 * Get table data by table ID
 */
router.get("/:tableId", async (req, res) => {
  try {
    const { tableId } = req.params;
    
    if (!tableId) {
      return res.status(400).json({ error: "tableId parameter is required" });
    }
    
    const data = await getTableData(tableId);
    res.json(data);
  } catch (error) {
    console.error("Error fetching table data:", error);
    res.status(500).json({ error: "Failed to fetch table data" });
  }
});

export default router;

