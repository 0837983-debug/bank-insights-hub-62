import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface KPICategory {
  id: string;
  name: string;
  description?: string;
}

export interface KPIMetric {
  id: string;
  title: string;
  value: number;
  description: string;
  change: number;
  ytdChange?: number;
  category: string;
  icon?: string;
}

/**
 * Get all KPI categories
 */
export async function getKPICategories(): Promise<KPICategory[]> {
  try {
    const categoriesPath = join(__dirname, "../mockups/kpi-categories.json");
    const categoriesData = await readFile(categoriesPath, "utf-8");
    return JSON.parse(categoriesData);
  } catch (error) {
    console.error("Error reading kpi-categories.json:", error);
    throw new Error("Failed to load KPI categories");
  }
}

/**
 * Get all KPI metrics
 */
export async function getAllKPIMetrics(): Promise<KPIMetric[]> {
  try {
    const kpisPath = join(__dirname, "../mockups/kpis.json");
    const kpisData = await readFile(kpisPath, "utf-8");
    return JSON.parse(kpisData);
  } catch (error) {
    console.error("Error reading kpis.json:", error);
    throw new Error("Failed to load KPI metrics");
  }
}

/**
 * Get KPI metrics by category
 */
export async function getKPIMetricsByCategory(categoryId: string): Promise<KPIMetric[]> {
  try {
    const allMetrics = await getAllKPIMetrics();
    return allMetrics.filter((metric) => metric.category === categoryId);
  } catch (error) {
    console.error("Error filtering KPI metrics by category:", error);
    throw new Error("Failed to load KPI metrics by category");
  }
}

/**
 * Get single KPI metric by ID
 */
export async function getKPIMetricById(id: string): Promise<KPIMetric | null> {
  try {
    const allMetrics = await getAllKPIMetrics();
    return allMetrics.find((metric) => metric.id === id) || null;
  } catch (error) {
    console.error("Error finding KPI metric by ID:", error);
    throw new Error("Failed to load KPI metric");
  }
}
