import { Router } from "express";
import { buildLayoutFromDB } from "../services/config/layoutService.js";
import kpiRoutes from "./kpiRoutes.js";
import tableDataRoutes from "./tableDataRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import sqlBuilderRoutes from "./sqlBuilderRoutes.js";
import dataRoutes from "./dataRoutes.js";

const router = Router();

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

// API routes
router.use("/kpis", kpiRoutes);
router.use("/table-data", tableDataRoutes);
router.use("/upload", uploadRoutes);
router.use("/sql-builder", sqlBuilderRoutes);
router.use("/data", dataRoutes);

export default router;
