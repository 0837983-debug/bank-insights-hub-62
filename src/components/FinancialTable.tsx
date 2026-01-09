import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  InfoIcon,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTableSort } from "@/hooks/use-table-sort";
import { SortableHeader } from "@/components/SortableHeader";

// Данные для столбца с числовыми значениями
export interface DataColumnValue {
  value: number;
  percentage?: number;
  change?: number;
  changeYtd?: number;
}

// Определение столбца таблицы
export interface TableColumn {
  id: string;
  label: string;
  type: "text" | "data";
  align?: "left" | "right" | "center";
  width?: string;
  // Для data колонок:
  showPercentage?: boolean;
  showChange?: boolean;
  format?: "number" | "currency" | "percent";
}

// Строка таблицы (с поддержкой обеих версий для обратной совместимости)
export interface TableRowData {
  id: string;
  // Старый формат (для обратной совместимости):
  name?: string;
  value?: number;
  percentage?: number;
  change?: number;
  changeYtd?: number;
  // Новый формат:
  textColumns?: Record<string, string>; // {type: "Доходы", subtype: "Услуги"}
  dataColumns?: Record<string, DataColumnValue>; // {value1: {value: 100, change: 5}, value2: {value: 200}}
  // Общие поля:
  description?: string;
  isGroup?: boolean;
  isTotal?: boolean;
  indent?: number;
  parentId?: string;
}

export interface GroupingOption {
  id: string;
  label: string;
}

interface FinancialTableProps {
  title: string;
  rows: TableRowData[];
  columns?: TableColumn[]; // Новое: явное определение столбцов
  // Старый формат (для обратной совместимости):
  showPercentage?: boolean;
  showChange?: boolean;
  currency?: string;
  periodLabel?: string;
  tableId?: string;
  groupingOptions?: GroupingOption[];
  activeGrouping?: string | null;
  onGroupingChange?: (groupBy: string | null) => void;
  isLoading?: boolean;
}

const formatValueWithUnit = (num: number) => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (absNum >= 1e9) {
    return `${sign}${(absNum / 1e9).toFixed(2)}`;
  }
  if (absNum >= 1e6) {
    return `${sign}${(absNum / 1e6).toFixed(1)}M`;
  }
  if (absNum >= 1e3) {
    return `${sign}${(absNum / 1e3).toFixed(1)}K`;
  }
  return `${sign}${absNum.toFixed(0)}`;
};

export const FinancialTable = ({
  title,
  rows,
  showPercentage = true,
  showChange = true,
  periodLabel = "Значение",
  groupingOptions,
  activeGrouping: externalActiveGrouping,
  onGroupingChange,
  isLoading = false,
}: FinancialTableProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // Use external activeGrouping if provided, otherwise use internal state (for backward compatibility)
  const [internalActiveGrouping, setInternalActiveGrouping] = useState<string | null>(null);
  const activeGrouping =
    externalActiveGrouping !== undefined ? externalActiveGrouping : internalActiveGrouping;
  const [selectedRow, setSelectedRow] = useState<TableRowData | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleRowDoubleClick = (row: TableRowData) => {
    setSelectedRow(row);
    setIsDetailDialogOpen(true);
  };

  // Get detail rows for selected row (children or mock breakdown)
  const getDetailRows = (row: TableRowData): TableRowData[] => {
    // If row has children, show them
    const children = rows.filter((r) => r.parentId === row.id);
    if (children.length > 0) {
      return children;
    }

    // Otherwise generate mock detail breakdown
    return [
      {
        id: `${row.id}-d1`,
        name: "Детализация 1",
        value: row.value * 0.35,
        percentage: 35.0,
        change: (row.change ?? 0) + 1.2,
      },
      {
        id: `${row.id}-d2`,
        name: "Детализация 2",
        value: row.value * 0.28,
        percentage: 28.0,
        change: (row.change ?? 0) - 0.5,
      },
      {
        id: `${row.id}-d3`,
        name: "Детализация 3",
        value: row.value * 0.22,
        percentage: 22.0,
        change: (row.change ?? 0) + 0.8,
      },
      {
        id: `${row.id}-d4`,
        name: "Детализация 4",
        value: row.value * 0.15,
        percentage: 15.0,
        change: (row.change ?? 0) - 1.1,
      },
    ];
  };

  const getValueFn = useCallback((row: TableRowData, column: string) => {
    switch (column) {
      case "name":
        return row.name;
      case "value":
        return row.value;
      case "percentage":
        return row.percentage ?? 0;
      case "change":
        return row.change ?? 0;
      default:
        return row.name;
    }
  }, []);

  // Build hierarchical structure recursively
  const buildHierarchy = (parentId: string | undefined): TableRowData[] => {
    const children = rows.filter((r) => r.parentId === parentId);
    return children.flatMap((child) => [child, ...buildHierarchy(child.id)]);
  };

  // Separate top-level rows
  const topLevelRows = rows.filter((r) => !r.parentId);
  const {
    sortedData: sortedTopLevel,
    sortState,
    handleSort,
  } = useTableSort(topLevelRows, getValueFn);

  // Rebuild full sorted rows with nested children
  const sortedRows = sortedTopLevel.flatMap((row) => [row, ...buildHierarchy(row.id)]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Check if any ancestor is collapsed
  const isRowVisible = (row: TableRowData): boolean => {
    if (!row.parentId) return true;

    // Check all ancestors
    let currentParentId: string | undefined = row.parentId;
    while (currentParentId) {
      if (collapsedGroups.has(currentParentId)) return false;
      const parent = rows.find((r) => r.id === currentParentId);
      currentParentId = parent?.parentId;
    }
    return true;
  };

  // Calculate indent level based on hierarchy depth
  const getIndentLevel = (row: TableRowData): number => {
    let level = 0;
    let currentParentId = row.parentId;
    while (currentParentId) {
      level++;
      const parent = rows.find((r) => r.id === currentParentId);
      currentParentId = parent?.parentId;
    }
    return level;
  };

  // Get max depth level in the hierarchy (rows that have children)
  const getMaxDepth = (): number => {
    let maxDepth = 0;
    rows.forEach((row) => {
      const depth = getIndentLevel(row);
      if (depth > maxDepth) maxDepth = depth;
    });
    return maxDepth;
  };

  // Get all rows that have children (collapsible groups) at a specific depth
  const getCollapsibleRowsAtLevel = (level: number): string[] => {
    return rows
      .filter((r) => {
        const rowLevel = getIndentLevel(r);
        const hasChildren = rows.some((child) => child.parentId === r.id);
        return rowLevel === level && hasChildren && !r.isTotal;
      })
      .map((r) => r.id);
  };

  // Find the deepest level that has expanded groups
  const getDeepestExpandedLevel = (): number => {
    const maxDepth = getMaxDepth();
    for (let level = maxDepth - 1; level >= 0; level--) {
      const groupsAtLevel = getCollapsibleRowsAtLevel(level);
      const hasExpandedAtLevel = groupsAtLevel.some((id) => !collapsedGroups.has(id));
      if (hasExpandedAtLevel) {
        return level;
      }
    }
    return -1;
  };

  // Find the shallowest level that has collapsed groups
  const getShallowestCollapsedLevel = (): number => {
    const maxDepth = getMaxDepth();
    for (let level = 0; level < maxDepth; level++) {
      const groupsAtLevel = getCollapsibleRowsAtLevel(level);
      const hasCollapsedAtLevel = groupsAtLevel.some((id) => collapsedGroups.has(id));
      if (hasCollapsedAtLevel) {
        return level;
      }
    }
    return -1;
  };

  // Collapse one level - collapse the deepest expanded level
  const collapseOneLevel = () => {
    const deepestExpanded = getDeepestExpandedLevel();

    if (deepestExpanded >= 0) {
      const groupsToCollapse = getCollapsibleRowsAtLevel(deepestExpanded);
      setCollapsedGroups((prev) => {
        const next = new Set(prev);
        groupsToCollapse.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // Expand one level - expand the shallowest collapsed level (top to bottom)
  const expandOneLevel = () => {
    const shallowestCollapsed = getShallowestCollapsedLevel();

    if (shallowestCollapsed >= 0) {
      const groupsToExpand = getCollapsibleRowsAtLevel(shallowestCollapsed);
      setCollapsedGroups((prev) => {
        const next = new Set(prev);
        groupsToExpand.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleGroupingClick = (groupId: string) => {
    const newGrouping = activeGrouping === groupId ? null : groupId;
    // Update internal state only if external state is not provided
    if (externalActiveGrouping === undefined) {
      setInternalActiveGrouping(newGrouping);
    }
    setCollapsedGroups(new Set());
    onGroupingChange?.(newGrouping);
  };

  const visibleRows = sortedRows.filter(isRowVisible);
  const hasGroups = rows.some((r) => r.isGroup && !r.isTotal);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-2">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {hasGroups && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={collapseOneLevel}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Свернуть уровень</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={expandOneLevel}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Развернуть уровень</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Grouping buttons */}
        {groupingOptions && groupingOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {groupingOptions.map((option) => (
              <Button
                key={option.id}
                variant={activeGrouping === option.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleGroupingClick(option.id)}
                disabled={isLoading}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">
                  <SortableHeader
                    label="Показатель"
                    column="name"
                    currentColumn={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                    className="text-xs font-medium uppercase tracking-wider"
                  />
                </TableHead>
                {showPercentage && (
                  <TableHead className="text-right w-[100px]">
                    <div className="flex justify-end">
                      <SortableHeader
                        label="Доля"
                        column="percentage"
                        currentColumn={sortState.column}
                        direction={sortState.direction}
                        onSort={handleSort}
                        className="text-xs font-medium uppercase tracking-wider"
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="text-right">
                  <div className="flex justify-end">
                    <SortableHeader
                      label={periodLabel}
                      column="value"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                      className="text-xs font-medium uppercase tracking-wider"
                    />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => {
                const hasChildren = rows.some((r) => r.parentId === row.id);
                const isCollapsed = collapsedGroups.has(row.id);
                const isPositiveChange = row.change !== undefined && row.change > 0;
                const isNegativeChange = row.change !== undefined && row.change < 0;

                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors",
                      row.isTotal && "bg-muted/30 font-bold"
                    )}
                    onDoubleClick={() => handleRowDoubleClick(row)}
                  >
                    <TableCell
                      className="py-4"
                      style={{ paddingLeft: `${getIndentLevel(row) * 1.5 + 1}rem` }}
                    >
                      <div className="flex items-center gap-2">
                        {hasChildren && (
                          <button
                            onClick={() => toggleGroup(row.id)}
                            className="p-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        {!hasChildren && row.parentId && <span className="w-5 flex-shrink-0" />}
                        <span
                          className={cn(
                            row.isGroup && !row.parentId && "font-semibold",
                            row.isTotal && "font-bold"
                          )}
                        >
                          {row.name}
                        </span>
                        {row.description && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{row.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    {showPercentage && (
                      <TableCell className="text-right py-4">
                        <span className="text-sm text-muted-foreground">
                          {row.percentage !== undefined ? `${row.percentage.toFixed(1)}%` : "—"}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-right py-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold text-foreground">
                          {formatValueWithUnit(row.value)}
                        </span>
                        {showChange && row.change !== undefined && (
                          <div
                            className={cn(
                              "flex items-center gap-1 text-sm",
                              isPositiveChange && "text-green-600",
                              isNegativeChange && "text-red-600",
                              !isPositiveChange && !isNegativeChange && "text-muted-foreground"
                            )}
                          >
                            {isPositiveChange && <TrendingUp className="w-3 h-3" />}
                            {isNegativeChange && <TrendingDown className="w-3 h-3" />}
                            <span>
                              {row.change > 0 ? "+" : ""}
                              {row.change.toFixed(1)}%
                              {row.changeYtd !== undefined && (
                                <span className="ml-1">
                                  ({row.changeYtd > 0 ? "↑" : row.changeYtd < 0 ? "↓" : ""}
                                  {Math.abs(row.changeYtd).toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Детализация: {selectedRow?.name}</DialogTitle>
          </DialogHeader>

          {selectedRow && (
            <div className="mt-4">
              <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Значение:</span>
                    <span className="ml-2 font-semibold">
                      {formatValueWithUnit(selectedRow.value)}
                    </span>
                  </div>
                  {selectedRow.percentage !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Доля:</span>
                      <span className="ml-2 font-semibold">
                        {selectedRow.percentage.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {selectedRow.change !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Изменение:</span>
                      <span
                        className={cn(
                          "ml-2 font-semibold",
                          selectedRow.change > 0 && "text-green-600",
                          selectedRow.change < 0 && "text-red-600"
                        )}
                      >
                        {selectedRow.change > 0 ? "+" : ""}
                        {selectedRow.change.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Показатель</TableHead>
                    <TableHead className="text-right">Доля</TableHead>
                    <TableHead className="text-right">Значение</TableHead>
                    <TableHead className="text-right">Изм.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getDetailRows(selectedRow).map((detailRow) => {
                    const isPositive = detailRow.change !== undefined && detailRow.change > 0;
                    const isNegative = detailRow.change !== undefined && detailRow.change < 0;

                    return (
                      <TableRow key={detailRow.id} className="border-b border-border/50">
                        <TableCell className="py-3">
                          <span className={cn(detailRow.isGroup && "font-semibold")}>
                            {detailRow.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span className="text-sm text-muted-foreground">
                            {detailRow.percentage !== undefined
                              ? `${detailRow.percentage.toFixed(1)}%`
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3 font-semibold">
                          {formatValueWithUnit(detailRow.value)}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          {detailRow.change !== undefined && (
                            <div
                              className={cn(
                                "flex items-center justify-end gap-1 text-sm",
                                isPositive && "text-green-600",
                                isNegative && "text-red-600"
                              )}
                            >
                              {isPositive && <TrendingUp className="w-3 h-3" />}
                              {isNegative && <TrendingDown className="w-3 h-3" />}
                              <span>
                                {detailRow.change > 0 ? "+" : ""}
                                {detailRow.change.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
