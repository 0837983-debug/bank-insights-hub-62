import { Router } from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { getTableData } from "../services/tableDataService.js";
import { getIncome, getExpenses } from "../services/mart/financialResults/financialResultsService.js";
import { getAssets, getLiabilities } from "../services/mart/balance/balanceService.js";

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
      case "financial_results_income":
        try {
          const incomeData = await getIncome(
            groupBy as string | undefined,
            targetPeriod
          );
          return res.json({
            tableId,
            rows: incomeData,
            ...(groupBy && { groupBy: [groupBy] }),
          });
        } catch (error) {
          console.error("Error fetching financial results income:", error);
          return res.status(500).json({ error: "Failed to fetch income data" });
        }

      case "financial_results_expenses":
        try {
          const expensesData = await getExpenses(
            groupBy as string | undefined,
            targetPeriod
          );
          return res.json({
            tableId,
            rows: expensesData,
            ...(groupBy && { groupBy: [groupBy] }),
          });
        } catch (error) {
          console.error("Error fetching financial results expenses:", error);
          return res.status(500).json({ error: "Failed to fetch expenses data" });
        }

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
      "income": "financial_results_income",
      "income_structure": "financial_results_income",
      "expenses": "financial_results_expenses",
      "assets": "balance_assets",
      "liabilities": "balance_liabilities",
    };

    const mappedTableId = tableIdMapping[tableId];
    if (mappedTableId) {
      console.log(`Mapping legacy tableId "${tableId}" to "${mappedTableId}"`);
      
      // Use the mapped table ID logic
      switch (mappedTableId) {
        case "financial_results_income":
          try {
            const incomeData = await getIncome(
              groupBy as string | undefined,
              targetPeriod
            );
            return res.json({
              tableId: mappedTableId,
              rows: incomeData,
              ...(groupBy && { groupBy: [groupBy] }),
            });
          } catch (error) {
            console.error("Error fetching financial results income:", error);
            return res.status(500).json({ error: "Failed to fetch income data" });
          }
        case "financial_results_expenses":
          try {
            const expensesData = await getExpenses(
              groupBy as string | undefined,
              targetPeriod
            );
            return res.json({
              tableId: mappedTableId,
              rows: expensesData,
              ...(groupBy && { groupBy: [groupBy] }),
            });
          } catch (error) {
            console.error("Error fetching financial results expenses:", error);
            return res.status(500).json({ error: "Failed to fetch expenses data" });
          }
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

    // Try old dashboard.table_data as last resort (for non-MART tables)
    try {
      const data = await getTableData(tableId);
      if (data.length === 0) {
        return res.status(404).json({ 
          error: `Table data not found for tableId: ${tableId}. Use MART table IDs: financial_results_income, financial_results_expenses, balance_assets, balance_liabilities` 
        });
      }
      return res.json({
        tableId,
        rows: data,
      });
    } catch (dbError) {
      console.error("Error fetching from database:", dbError);
      return res.status(404).json({ 
        error: `Table data not found for tableId: ${tableId}. Ensure data is loaded in MART tables or dashboard.table_data` 
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

