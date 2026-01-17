import { Router } from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { getAssets, getLiabilities } from "../services/mart/balanceService.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * GET /api/table-data/:tableId
 * Get table data by table ID
 * Query params:
 *   - groupBy: Optional grouping (e.g., 'cfo', 'client_segment', 'fot')
 *   - periodDate: Optional period date (YYYY-MM-DD format)
 *   - dateFrom: Optional start date (for future use)
 *   - dateTo: Optional end date (for future use)
 */
router.get("/:tableId", async (req, res) => {
  try {
    const { tableId } = req.params;
    const { groupBy, periodDate, dateFrom, dateTo } = req.query;
    
    if (!tableId) {
      return res.status(400).json({ error: "tableId parameter is required" });
    }

    // Parse periodDate if provided
    let targetPeriod: Date | undefined;
    if (periodDate && typeof periodDate === "string") {
      targetPeriod = new Date(periodDate);
      if (isNaN(targetPeriod.getTime())) {
        return res.status(400).json({ error: "Invalid periodDate format. Use YYYY-MM-DD" });
      }
    }

    // Handle new MART table IDs
    switch (tableId) {
      case "balance_assets":
        try {
          const assetsData = await getAssets(targetPeriod);
          return res.json({
            tableId,
            rows: assetsData,
          });
        } catch (error) {
          console.error("Error fetching balance assets:", error);
          return res.status(500).json({ error: "Failed to fetch assets data" });
        }

      case "balance_liabilities":
        try {
          const liabilitiesData = await getLiabilities(targetPeriod);
          return res.json({
            tableId,
            rows: liabilitiesData,
          });
        } catch (error) {
          console.error("Error fetching balance liabilities:", error);
          return res.status(500).json({ error: "Failed to fetch liabilities data" });
        }
    }

    // Map legacy table IDs to new MART table IDs
    const tableIdMapping: Record<string, string> = {
      "assets": "balance_assets",
      "liabilities": "balance_liabilities",
    };

    const mappedTableId = tableIdMapping[tableId];
    if (mappedTableId) {
      console.log(`Mapping legacy tableId "${tableId}" to "${mappedTableId}"`);
      
      // Use the mapped table ID logic
      switch (mappedTableId) {
        case "balance_assets":
          try {
            const assetsData = await getAssets(targetPeriod);
            return res.json({
              tableId: mappedTableId,
              rows: assetsData,
            });
          } catch (error) {
            console.error("Error fetching balance assets:", error);
            return res.status(500).json({ error: "Failed to fetch assets data" });
          }
        case "balance_liabilities":
          try {
            const liabilitiesData = await getLiabilities(targetPeriod);
            return res.json({
              tableId: mappedTableId,
              rows: liabilitiesData,
            });
          } catch (error) {
            console.error("Error fetching balance liabilities:", error);
            return res.status(500).json({ error: "Failed to fetch liabilities data" });
          }
      }
    }

    // Table not found - return 404
    return res.status(404).json({ 
      error: `Table data not found for tableId: ${tableId}. Use MART table IDs: balance_assets, balance_liabilities` 
    });
  } catch (error: any) {
    console.error("Error fetching table data:", error);
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: `Table data not found for tableId: ${req.params.tableId}` });
    }
    res.status(500).json({ error: "Failed to fetch table data" });
  }
});

export default router;

