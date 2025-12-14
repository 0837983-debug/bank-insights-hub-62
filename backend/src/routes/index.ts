import { Router } from "express";
import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { buildLayoutFromDB } from "../services/layoutService.js";
import kpiRoutes from "./kpiRoutes.js";
import tableDataRoutes from "./tableDataRoutes.js";
import chartDataRoutes from "./chartDataRoutes.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Example route
router.get("/", (_req, res) => {
  res.json({ message: "API is working" });
});

// Layout endpoint
router.get("/layout", async (_req, res) => {
  try {
    const layout = await buildLayoutFromDB();
    res.json(layout);
  } catch (error) {
    console.error("Error building layout from database:", error);
    res.status(500).json({ error: "Failed to load layout data from database" });
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
    const fileName =
      groupByColumns.length > 0
        ? `${tableId}_groupby_${groupByColumns[0]}.json`
        : `${tableId}.json`;
    const tableDataPath = join(__dirname, "../mockups", fileName);
    
    // Read and parse the JSON file
    const tableData = await readFile(tableDataPath, "utf-8");
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

export default router;
