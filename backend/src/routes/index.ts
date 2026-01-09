import { Router } from "express";
import { buildLayoutFromDB } from "../services/layoutService.js";
import kpiRoutes from "./kpiRoutes.js";
import tableDataRoutes from "./tableDataRoutes.js";
import chartDataRoutes from "./chartDataRoutes.js";
import commandRoutes from "./commandRoutes.js";

const router = Router();

// Example route
router.get("/", (_req, res) => {
  res.json({ message: "API is working" });
});

// Layout endpoint - builds from DB config
router.get("/layout", async (req, res) => {
  try {
    const { layout_id } = req.query;
    const layout = await buildLayoutFromDB(
      typeof layout_id === "string" ? layout_id : undefined
    );
    return res.json(layout);
  } catch (error: any) {
    console.error("Error building layout from DB:", error);
    return res.status(500).json({ error: "Failed to load layout data" });
  }
});

// Card data endpoint (legacy - kept for backward compatibility)
router.get("/cardsdata", async (_req, res) => {
  try {
    const cardDataPath = join(__dirname, "../mockups/cardsdata.json");
    const cardData = await readFile(cardDataPath, "utf-8");
    const data = JSON.parse(cardData);
    res.json(data);
  } catch (error) {
    console.error("Error reading cardsdata.json:", error);
    res.status(500).json({ error: "Failed to load card data" });
  }
});

// Table data endpoint (legacy - kept for backward compatibility)
router.get("/table-data", async (req, res) => {
  try {
    const { tableId, dateFrom: _dateFrom, dateTo: _dateTo, groupBy: rawGroupBy } = req.query;
    
    // Validate tableId parameter
    if (!tableId || typeof tableId !== "string") {
      return res.status(400).json({ error: "tableId parameter is required" });
    }
    
    // dateFrom and dateTo are ignored for now as per requirements
    // Grouping columns (can be multiple): groupBy param as string or array
    const groupByColumns =
      typeof rawGroupBy === "string"
        ? [rawGroupBy]
        : Array.isArray(rawGroupBy)
        ? rawGroupBy.filter((item) => typeof item === "string")
        : [];
    
    // Construct file path - if groupBy is provided, prefer grouped file
    // File naming convention: table-data-{tableId}.json or table-data-{tableId}_{groupBy}.json
    // Keep underscores as-is (don't normalize to dashes) to match actual file names
    const baseFileName = `table-data-${tableId}.json`;
    const groupedFileName =
      groupByColumns.length > 0
        ? `table-data-${tableId}_${groupByColumns[0]}.json`
        : null;
    
    // Try grouped file first, then fall back to base file
    let tableDataPath = join(__dirname, "../mockups", groupedFileName || baseFileName);
    let tableData: string;
    
    try {
      tableData = await readFile(tableDataPath, "utf-8");
    } catch (err: any) {
      // If grouped file not found, try base file
      if (err.code === "ENOENT" && groupedFileName) {
        tableDataPath = join(__dirname, "../mockups", baseFileName);
        try {
          tableData = await readFile(tableDataPath, "utf-8");
        } catch (fallbackErr: any) {
          // If base file also not found, try with normalized name (for backward compatibility)
          const normalizedTableId = tableId.replace(/_/g, "-");
          const normalizedFileName = `table-data-${normalizedTableId}.json`;
          tableDataPath = join(__dirname, "../mockups", normalizedFileName);
          tableData = await readFile(tableDataPath, "utf-8");
        }
      } else {
        throw err;
      }
    }
    
    const data = JSON.parse(tableData);
    
    // If dateFrom/dateTo provided, reflect them in the response
    const dateFrom = typeof _dateFrom === "string" ? _dateFrom : undefined;
    const dateTo = typeof _dateTo === "string" ? _dateTo : undefined;
    if (dateFrom || dateTo) {
      const periodParts = [];
      if (dateFrom) periodParts.push(dateFrom);
      if (dateTo) periodParts.push(dateTo);
      if (periodParts.length > 0) {
        data.requestedPeriod = periodParts.join("-");
      }
    }
    if (groupByColumns.length > 0) {
      data.groupBy = groupByColumns;
    }
    return res.json(data);
  } catch (error: any) {
    console.error("Error reading table data:", error);
    // Handle file not found error
    if (error.code === "ENOENT") {
      return res
        .status(404)
        .json({ error: `Table data file for tableId "${req.query.tableId}" not found` });
    }
    return res.status(500).json({ error: "Failed to load table data" });
  }
});

// New API routes
router.use("/kpis", kpiRoutes);
router.use("/table-data", tableDataRoutes);
router.use("/chart-data", chartDataRoutes);
router.use("/commands", commandRoutes);

export default router;
