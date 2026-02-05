import { Router } from "express";
import uploadRoutes from "./uploadRoutes.js";
import sqlBuilderRoutes from "./sqlBuilderRoutes.js";
import dataRoutes from "./dataRoutes.js";

const router = Router();

// API routes
router.use("/upload", uploadRoutes);
router.use("/sql-builder", sqlBuilderRoutes);
router.use("/data", dataRoutes);

export default router;
