import { pool } from "../config/database.js";

export interface TableRowData {
  id: string;
  name: string;
  description?: string;
  value: number;
  percentage?: number;
  change?: number;
  isGroup?: boolean;
  isTotal?: boolean;
  parentId?: string;
  sortOrder: number;
}

/**
 * Get table data by table ID
 */
export async function getTableData(tableId: string): Promise<TableRowData[]> {
  const result = await pool.query(
    `SELECT 
      row_id as "rowId", name, description, value, percentage, change,
      is_group as "isGroup", is_total as "isTotal", parent_id as "parentId",
      sort_order as "sortOrder"
    FROM dashboard.table_data
    WHERE table_id = $1
    ORDER BY sort_order ASC, row_id ASC`,
    [tableId]
  );

  return result.rows.map((row) => ({
    id: row.rowId,
    name: row.name,
    description: row.description || undefined,
    value: row.value ? Number(row.value) : 0,
    percentage: row.percentage ? Number(row.percentage) : undefined,
    change: row.change ? Number(row.change) : undefined,
    isGroup: row.isGroup,
    isTotal: row.isTotal,
    parentId: row.parentId || undefined,
    sortOrder: row.sortOrder,
  }));
}

/**
 * Insert or update table data
 */
export async function upsertTableData(
  tableId: string,
  rows: Omit<TableRowData, "sortOrder">[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      await client.query(
        `INSERT INTO dashboard.table_data 
         (table_id, row_id, name, description, value, percentage, change, 
          is_group, is_total, parent_id, sort_order, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
         ON CONFLICT (table_id, row_id)
         DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           value = EXCLUDED.value,
           percentage = EXCLUDED.percentage,
           change = EXCLUDED.change,
           is_group = EXCLUDED.is_group,
           is_total = EXCLUDED.is_total,
           parent_id = EXCLUDED.parent_id,
           sort_order = EXCLUDED.sort_order,
           updated_at = CURRENT_TIMESTAMP`,
        [
          tableId,
          row.id,
          row.name,
          row.description || null,
          row.value,
          row.percentage || null,
          row.change || null,
          row.isGroup || false,
          row.isTotal || false,
          row.parentId || null,
          index,
        ]
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
