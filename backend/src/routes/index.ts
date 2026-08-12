import { Router } from "express";
import uploadRoutes from "./uploadRoutes.js";
import sqlBuilderRoutes from "./sqlBuilderRoutes.js";
import dataRoutes from "./dataRoutes.js";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";

const router = Router();

// Публичные маршруты аутентификации (вход/обновление/выход) — открыты по белому списку
router.use("/auth", authRoutes);

// Защищённые маршруты (доступ только авторизованным)
router.use("/users", userRoutes);

// API routes
router.use("/upload", uploadRoutes);
router.use("/sql-builder", sqlBuilderRoutes);
router.use("/data", dataRoutes);

export default router;
