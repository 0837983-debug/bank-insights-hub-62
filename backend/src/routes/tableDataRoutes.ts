import { Router } from "express";
import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { getTableData } from "../services/tableDataService.js";
import { getIncomeDataByGrouping, incomeGroupingOptions } from "../services/incomeGroupingService.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    
    // Special handling for income_structure table with grouping
    if (tableId === "income_structure" && groupBy !== undefined) {
      // Try to load grouped file first
      const groupedFileName = `table-data-${tableId}_${groupBy}.json`;
      const groupedFilePath = join(__dirname, "../mockups", groupedFileName);
      
      try {
        const groupedData = await readFile(groupedFilePath, "utf-8");
        return res.json(JSON.parse(groupedData));
      } catch (err: any) {
        // If grouped file not found, fall back to base file
        if (err.code === "ENOENT") {
          const baseFileName = `table-data-${tableId}.json`;
          const baseFilePath = join(__dirname, "../mockups", baseFileName);
          const baseData = await readFile(baseFilePath, "utf-8");
          const parsed = JSON.parse(baseData);
          parsed.groupBy = [groupBy];
          return res.json(parsed);
        }
        throw err;
      }
    }
    
    // Try to load from mockup file first (for backward compatibility)
    const mockupFileName = `table-data-${tableId}.json`;
    const mockupFilePath = join(__dirname, "../mockups", mockupFileName);
    
    try {
      const mockupData = await readFile(mockupFilePath, "utf-8");
      return res.json(JSON.parse(mockupData));
    } catch (err: any) {
      // If mockup file not found, try database
      if (err.code === "ENOENT") {
        try {
          const data = await getTableData(tableId);
          // If no data found in database, return 404
          if (data.length === 0) {
            return res.status(404).json({ error: `Table data not found for tableId: ${tableId}` });
          }
          return res.json({
            tableId,
            rows: data,
          });
        } catch (dbError) {
          console.error("Error fetching from database:", dbError);
          throw new Error(`Table data not found for tableId: ${tableId}`);
        }
      }
      throw err;
    }
  } catch (error: any) {
    console.error("Error fetching table data:", error);
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: `Table data not found for tableId: ${req.params.tableId}` });
    }
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
    
    // Return grouping options for income table (legacy support)
    if (tableId === "income") {
      return res.json(incomeGroupingOptions);
    }
    
    // Return grouping options for income_structure table
    // Use the same grouping options as income table
    if (tableId === "income_structure") {
      return res.json(incomeGroupingOptions);
    }
    
    // For other tables, return empty array
    // Frontend will use groupableFields from layout if available
    res.json([]);
  } catch (error) {
    console.error("Error fetching grouping options:", error);
    res.status(500).json({ error: "Failed to fetch grouping options" });
  }
});

export default router;

