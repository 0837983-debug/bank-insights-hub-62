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
import { InfoIcon, ChevronRight, ChevronDown, TrendingUp, TrendingDown, ChevronsUpDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTableSort, SortDirection } from "@/hooks/use-table-sort";
import { SortableHeader } from "@/components/SortableHeader";

export interface TableRowData {
  id: string;
  name: string;
  description?: string;
  value: number;
  percentage?: number;
  change?: number;
  isGroup?: boolean;
  isTotal?: boolean;
  indent?: number;
  parentId?: string;
}

interface FinancialTableProps {
  title: string;
  rows: TableRowData[];
  showPercentage?: boolean;
  showChange?: boolean;
  currency?: string;
  periodLabel?: string;
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
}: FinancialTableProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
  const { sortedData: sortedTopLevel, sortState, handleSort } = useTableSort(topLevelRows, getValueFn);

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

  const visibleRows = sortedRows.filter(isRowVisible);
  const hasGroups = rows.some((r) => r.isGroup && !r.isTotal);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={expandOneLevel}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Развернуть уровень</TooltipContent>
            </Tooltip>
          </div>
        )}
      </CardHeader>
      <CardContent>
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
                    "border-b border-border/50",
                    row.isTotal && "bg-muted/30 font-bold"
                  )}
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
                      <span className={cn(
                        row.isGroup && !row.parentId && "font-semibold",
                        row.isTotal && "font-bold"
                      )}>
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
                        <div className={cn(
                          "flex items-center gap-1 text-sm",
                          isPositiveChange && "text-green-600",
                          isNegativeChange && "text-red-600",
                          !isPositiveChange && !isNegativeChange && "text-muted-foreground"
                        )}>
                          {isPositiveChange && <TrendingUp className="w-3 h-3" />}
                          {isNegativeChange && <TrendingDown className="w-3 h-3" />}
                          <span>
                            {row.change > 0 ? "+" : ""}{row.change.toFixed(1)}%
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
      </CardContent>
    </Card>
  );
};
