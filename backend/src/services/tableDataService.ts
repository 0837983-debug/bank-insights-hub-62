import { prisma } from "../config/database.js";

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
  const rows = await prisma.dashboardTableData.findMany({
    where: {
      tableId: tableId,
    },
    orderBy: [
      { sortOrder: "asc" },
      { rowId: "asc" },
    ],
  });

  return rows.map((row) => ({
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
  await prisma.$transaction(
    rows.map((row, index) =>
      prisma.dashboardTableData.upsert({
        where: {
          tableId_rowId: {
            tableId: tableId,
            rowId: row.id,
          },
        },
        update: {
          name: row.name,
          description: row.description || null,
          value: row.value,
          percentage: row.percentage || null,
          change: row.change || null,
          isGroup: row.isGroup || false,
          isTotal: row.isTotal || false,
          parentId: row.parentId || null,
          sortOrder: index,
          updatedAt: new Date(),
        },
        create: {
          tableId: tableId,
          rowId: row.id,
          name: row.name,
          description: row.description || null,
          value: row.value,
          percentage: row.percentage || null,
          change: row.change || null,
          isGroup: row.isGroup || false,
          isTotal: row.isTotal || false,
          parentId: row.parentId || null,
          sortOrder: index,
        },
      })
    )
  );
}
