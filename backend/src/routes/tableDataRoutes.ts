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

    // Маппинг tableId/componentId -> внутренний идентификатор таблицы
    // Поддерживаем как tableId (balance_assets), так и componentId (assets_table)
    const tableMapping: Record<string, { componentId: string; tableType: "assets" | "liabilities" }> = {
      // По tableId
      "balance_assets": { componentId: "assets_table", tableType: "assets" },
      "balance_liabilities": { componentId: "liabilities_table", tableType: "liabilities" },
      // По legacy tableId
      "assets": { componentId: "assets_table", tableType: "assets" },
      "liabilities": { componentId: "liabilities_table", tableType: "liabilities" },
      // По componentId (для фронтенда)
      "assets_table": { componentId: "assets_table", tableType: "assets" },
      "liabilities_table": { componentId: "liabilities_table", tableType: "liabilities" },
    };

    const mapping = tableMapping[tableId];
    
    if (!mapping) {
      return res.status(404).json({ 
        error: `Table data not found for tableId: ${tableId}. Supported IDs: balance_assets, balance_liabilities, assets_table, liabilities_table, assets, liabilities` 
      });
    }

    // Получаем данные в зависимости от типа таблицы
    try {
      const tableData = mapping.tableType === "assets" 
        ? await getAssets(targetPeriod)
        : await getLiabilities(targetPeriod);

      return res.json({
        componentId: mapping.componentId,
        type: "table",
        rows: tableData,
      });
    } catch (error) {
      console.error(`Error fetching ${mapping.tableType}:`, error);
      return res.status(500).json({ 
        error: `Failed to fetch ${mapping.tableType} data` 
      });
    }
  } catch (error: any) {
    console.error("Error fetching table data:", error);
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: `Table data not found for tableId: ${req.params.tableId}` });
    }
    res.status(500).json({ error: "Failed to fetch table data" });
  }
});

export default router;

