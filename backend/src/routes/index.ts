import { Router } from "express";
import { buildLayoutFromDB } from "../services/layoutService.js";
import kpiRoutes from "./kpiRoutes.js";
import tableDataRoutes from "./tableDataRoutes.js";
import commandRoutes from "./commandRoutes.js";

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
router.use("/commands", commandRoutes);

export default router;
