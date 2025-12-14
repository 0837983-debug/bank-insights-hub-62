import { pool } from "../config/database.js";

export interface KPICategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface KPIMetric {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  description: string;
  change?: number;
  ytdChange?: number;
  category: string;
  categoryId: string;
  iconName?: string;
  sortOrder: number;
}

/**
 * Get all KPI categories
 */
export async function getKPICategories(): Promise<KPICategory[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, name, sort_order as "sortOrder"
       FROM dashboard.kpi_categories
       ORDER BY sort_order, id`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get all KPI metrics
 */
export async function getAllKPIMetrics(): Promise<KPIMetric[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        m.id,
        m.title,
        m.value,
        m.subtitle,
        m.description,
        m.change,
        m.ytd_change as "ytdChange",
        c.name as category,
        c.id as "categoryId",
        m.icon_name as "iconName",
        m.sort_order as "sortOrder"
       FROM dashboard.kpi_metrics m
       LEFT JOIN dashboard.kpi_categories c ON m.category_id = c.id
       ORDER BY m.sort_order, m.id`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get KPI metrics by category
 */
export async function getKPIMetricsByCategory(categoryId: string): Promise<KPIMetric[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        m.id,
        m.title,
        m.value,
        m.subtitle,
        m.description,
        m.change,
        m.ytd_change as "ytdChange",
        c.name as category,
        c.id as "categoryId",
        m.icon_name as "iconName",
        m.sort_order as "sortOrder"
       FROM dashboard.kpi_metrics m
       LEFT JOIN dashboard.kpi_categories c ON m.category_id = c.id
       WHERE m.category_id = $1
       ORDER BY m.sort_order, m.id`,
      [categoryId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get single KPI metric by ID
 */
export async function getKPIMetricById(id: string): Promise<KPIMetric | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        m.id,
        m.title,
        m.value,
        m.subtitle,
        m.description,
        m.change,
        m.ytd_change as "ytdChange",
        c.name as category,
        c.id as "categoryId",
        m.icon_name as "iconName",
        m.sort_order as "sortOrder"
       FROM dashboard.kpi_metrics m
       LEFT JOIN dashboard.kpi_categories c ON m.category_id = c.id
       WHERE m.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Update KPI metric value
 */
export async function updateKPIMetricValue(
  id: string,
  value: string,
  change?: number,
  ytdChange?: number
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE dashboard.kpi_metrics
       SET value = $1,
           change = $2,
           ytd_change = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [value, change, ytdChange, id]
    );
  } finally {
    client.release();
  }
}

