import { Router } from "express";
import {
  getKPICategories,
  getAllKPIMetrics,
  getKPIMetricsByCategory,
  getKPIMetricById,
} from "../services/kpiService.js";

const router = Router();

/**
 * GET /api/kpis/categories
 * Get all KPI categories
 */
router.get("/categories", async (_req, res) => {
  try {
    const categories = await getKPICategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching KPI categories:", error);
    res.status(500).json({ error: "Failed to fetch KPI categories" });
  }
});

/**
 * GET /api/kpis
 * Get all KPI metrics
 */
router.get("/", async (_req, res) => {
  try {
    const metrics = await getAllKPIMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching KPI metrics:", error);
    res.status(500).json({ error: "Failed to fetch KPI metrics" });
  }
});

/**
 * GET /api/kpis/category/:categoryId
 * Get KPI metrics by category
 */
router.get("/category/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const metrics = await getKPIMetricsByCategory(categoryId);
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching KPI metrics by category:", error);
    res.status(500).json({ error: "Failed to fetch KPI metrics by category" });
  }
});

/**
 * GET /api/kpis/:id
 * Get single KPI metric by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const metric = await getKPIMetricById(id);
    
    if (!metric) {
      return res.status(404).json({ error: "KPI metric not found" });
    }
    
    res.json(metric);
  } catch (error) {
    console.error("Error fetching KPI metric:", error);
    res.status(500).json({ error: "Failed to fetch KPI metric" });
  }
});

export default router;

