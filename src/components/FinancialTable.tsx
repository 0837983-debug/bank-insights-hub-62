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
import { useLayout } from "@/hooks/useAPI";
import { formatValue } from "@/lib/formatters";

// Данные для столбца с числовыми значениями
export interface DataColumnValue {
  value: number;
  percentage?: number;
  ppChange?: number;
  ppChangeAbsolute?: number;
  ytdChange?: number;
  ytdChangeAbsolute?: number;
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

// Строка таблицы
export interface TableRowData {
  // Поля из mart.balance (основные)
  class?: string;
  section?: string;
  item?: string;
  sub_item?: string;
  value?: number;
  // Расчетные поля
  percentage?: number;
  previousValue?: number;
  ytdValue?: number;
  ppChange?: number; // в долях
  ppChangeAbsolute?: number;
  ytdChange?: number; // в долях
  ytdChangeAbsolute?: number;
  // Поля из mart.balance (аналитика)
  client_type?: string;
  client_segment?: string;
  product_code?: string;
  portfolio_code?: string;
  currency_code?: string;
  // Служебные поля
  id: string;
  period_date?: string;
  description?: string;
  sortOrder?: number;
  // Иерархия
  parentId?: string;
  isGroup?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export interface GroupingOption {
  id: string;
  label: string;
}

// Интерфейс для кнопки из layout
export interface ButtonComponent {
  id: string;
  componentId: string;
  type: "button";
  title: string;
  label?: string;
  tooltip?: string;
  icon?: string;
  dataSourceKey?: string;
}

interface FinancialTableProps {
  title: string;
  rows: TableRowData[];
  columns?: TableColumn[];
  showPercentage?: boolean;
  showChange?: boolean;
  currency?: string;
  periodLabel?: string;
  tableId?: string;
  componentId?: string; // ID компонента для получения форматов из layout
  // Deprecated: используйте buttons вместо этого
  groupingOptions?: GroupingOption[];
  activeGrouping?: string | null;
  onGroupingChange?: (groupBy: string | null) => void;
  // Новые props для кнопок
  buttons?: ButtonComponent[];
  activeButtonId?: string | null;
  onButtonClick?: (buttonId: string | null) => void;
  isLoading?: boolean;
}

export const FinancialTable = ({
  title,
  rows,
  showPercentage = true,
  showChange = true,
  periodLabel = "Значение",
  componentId,
  groupingOptions, // Deprecated
  activeGrouping: externalActiveGrouping, // Deprecated
  onGroupingChange, // Deprecated
  buttons,
  activeButtonId: externalActiveButtonId,
  onButtonClick,
  isLoading = false,
}: FinancialTableProps) => {
  // Получаем layout для доступа к форматам
  const { data: layout } = useLayout();
  
  // Находим компонент в layout по componentId
  const component = componentId
    ? layout?.sections
        .flatMap((section) => section.components)
        .find((c) => c.componentId === componentId && c.type === "table")
    : null;
  
  // Получаем форматы из layout
  const valueColumn = component?.columns?.find((col) => col.id === "value");
  const valueFormatId = valueColumn?.format || "currency_rub"; // fallback
  const percentageFormatId = "percent";
  
  // Получаем форматы для изменений из sub_columns
  const ppChangeSubColumn = valueColumn?.sub_columns?.find((col) => col.id === "ppChange");
  const ppChangeAbsoluteSubColumn = valueColumn?.sub_columns?.find((col) => col.id === "ppChangeAbsolute");
  const ytdChangeSubColumn = valueColumn?.sub_columns?.find((col) => col.id === "ytdChange");
  const ytdChangeAbsoluteSubColumn = valueColumn?.sub_columns?.find((col) => col.id === "ytdChangeAbsolute");
  
  const ppChangeFormatId = ppChangeSubColumn?.format || percentageFormatId;
  const ppChangeAbsoluteFormatId = ppChangeAbsoluteSubColumn?.format || valueFormatId;
  const ytdChangeFormatId = ytdChangeSubColumn?.format || percentageFormatId;
  const ytdChangeAbsoluteFormatId = ytdChangeAbsoluteSubColumn?.format || valueFormatId;
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // Deprecated: для обратной совместимости
  const [internalActiveGrouping, setInternalActiveGrouping] = useState<string | null>(null);
  const activeGrouping =
    externalActiveGrouping !== undefined ? externalActiveGrouping : internalActiveGrouping;
  // Новое состояние для кнопок
  const [internalActiveButtonId, setInternalActiveButtonId] = useState<string | null>(null);
  const activeButtonId = externalActiveButtonId !== undefined ? externalActiveButtonId : internalActiveButtonId;
  const [selectedRow, setSelectedRow] = useState<TableRowData | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleRowDoubleClick = (row: TableRowData) => {
    setSelectedRow(row);
    setIsDetailDialogOpen(true);
  };

  // Get detail rows for selected row (children or mock breakdown)
  const getDetailRows = (row: TableRowData): TableRowData[] => {
    // Если нет children, генерируем mock детализацию
    const displayName = [row.section, row.item, row.sub_item]
      .filter(Boolean)
      .join(' - ') || row.id;
    
    // Рассчитываем базовые значения для детализации
    const baseValue = row.value ?? 0;
    const basePreviousValue = row.previousValue ?? 0;
    const baseYtdValue = row.ytdValue ?? 0;
    
    // Вычисляем ppChange для mock данных
    const calcPpChange = (value: number, prevValue: number): number | undefined => {
      if (prevValue === 0) return 0;
      return Math.round(((value - prevValue) / prevValue) * 10000) / 10000;
    };
    
    const createDetailRow = (id: string, suffix: string, multiplier: number): TableRowData => {
      const value = baseValue * multiplier;
      const previousValue = basePreviousValue * multiplier;
      return {
        id,
        section: `${displayName} - ${suffix}`,
        value,
        previousValue,
        ytdValue: baseYtdValue * multiplier,
        percentage: multiplier * 100,
        ppChange: calcPpChange(value, previousValue),
      };
    };
    
    return [
      createDetailRow(`${row.id}-d1`, 'Детализация 1', 0.35),
      createDetailRow(`${row.id}-d2`, 'Детализация 2', 0.28),
      createDetailRow(`${row.id}-d3`, 'Детализация 3', 0.22),
      createDetailRow(`${row.id}-d4`, 'Детализация 4', 0.15),
    ];
  };

  const getValueFn = useCallback((row: TableRowData, column: string) => {
    if (column === "name") {
      const hierarchyFields = [row.class, row.section, row.item, row.sub_item];
      const lastValue = hierarchyFields.filter(Boolean).pop();
      return lastValue ?? row.id;
    }
    // Динамическое получение значения из row по имени колонки
    const value = (row as any)[column];
    
    // Для числовых полей возвращаем число, для текстовых - строку
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return value;
    }
    
    // Если значение не найдено, возвращаем пустую строку или 0
    return '';
  }, []);

  const hasHierarchy = rows.some((r) => r.parentId || r.isGroup);
  const topLevelRows = hasHierarchy ? rows.filter((r) => !r.parentId) : rows;
  const {
    sortedData: sortedTopLevel,
    sortState,
    handleSort,
  } = useTableSort(topLevelRows, getValueFn);

  const rowById = new Map(rows.map((row) => [row.id, row]));
  const childrenByParent = new Map<string, TableRowData[]>();
  rows.forEach((row) => {
    if (row.parentId) {
      const list = childrenByParent.get(row.parentId) ?? [];
      list.push(row);
      childrenByParent.set(row.parentId, list);
    }
  });

  const sortChildren = (items: TableRowData[]) =>
    [...items].sort((a, b) => {
      const aOrder = a.sortOrder ?? 0;
      const bOrder = b.sortOrder ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.id.localeCompare(b.id);
    });

  const buildHierarchy = (parents: TableRowData[]): TableRowData[] => {
    const result: TableRowData[] = [];
    sortChildren(parents).forEach((parent) => {
      result.push(parent);
      const children = childrenByParent.get(parent.id) ?? [];
      if (children.length > 0) {
        result.push(...buildHierarchy(children));
      }
    });
    return result;
  };

  const sortedRows = hasHierarchy ? buildHierarchy(sortedTopLevel) : sortedTopLevel;

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

  const isRowVisible = (row: TableRowData): boolean => {
    if (!row.parentId) return true;

    // Проверяем, не свёрнут ли какой-либо родитель
    let currentParentId: string | undefined = row.parentId;
    while (currentParentId) {
      if (collapsedGroups.has(currentParentId)) return false;
      const parent = rows.find((r) => r.id === currentParentId);
      currentParentId = parent?.parentId;
    }
    return true;
  };

  const getIndentLevel = (row: TableRowData): number => {
    let level = 0;
    let currentParentId = row.parentId;
    while (currentParentId) {
      level += 1;
      const parent = rowById.get(currentParentId);
      currentParentId = parent?.parentId;
    }
    return level;
  };

  const getMaxDepth = (): number => {
    let maxDepth = 0;
    rows.forEach((row) => {
      const depth = getIndentLevel(row);
      if (depth > maxDepth) maxDepth = depth;
    });
    return maxDepth;
  };

  // Получаем все строки с детьми (группы) на указанном уровне
  const getCollapsibleRowsAtLevel = (level: number): string[] => {
    return rows
      .filter((r) => {
        const rowLevel = getIndentLevel(r);
        const hasChildren = (childrenByParent.get(r.id)?.length ?? 0) > 0;
        return rowLevel === level && hasChildren && !r.isTotal;
      })
      .map((r) => r.id);
  };

  // Найти самый глубокий уровень с развёрнутыми группами
  const getDeepestExpandedLevel = (): number => {
    const maxDepth = getMaxDepth();
    // Ищем с самого глубокого уровня (maxDepth) до 0
    for (let level = maxDepth; level >= 0; level--) {
      const groupsAtLevel = getCollapsibleRowsAtLevel(level);
      if (groupsAtLevel.length > 0) {
      const hasExpandedAtLevel = groupsAtLevel.some((id) => !collapsedGroups.has(id));
      if (hasExpandedAtLevel) {
        return level;
        }
      }
    }
    return -1;
  };

  // Найти самый верхний уровень со свёрнутыми группами
  const getShallowestCollapsedLevel = (): number => {
    const maxDepth = getMaxDepth();
    for (let level = 0; level <= maxDepth; level++) {
      const groupsAtLevel = getCollapsibleRowsAtLevel(level);
      if (groupsAtLevel.length > 0) {
      const hasCollapsedAtLevel = groupsAtLevel.some((id) => collapsedGroups.has(id));
      if (hasCollapsedAtLevel) {
        return level;
        }
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

  // Deprecated: для обратной совместимости
  const handleGroupingClick = (groupId: string) => {
    const newGrouping = activeGrouping === groupId ? null : groupId;
    // Update internal state only if external state is not provided
    if (externalActiveGrouping === undefined) {
      setInternalActiveGrouping(newGrouping);
    }
    setCollapsedGroups(new Set());
    onGroupingChange?.(newGrouping);
  };

  // Новая функция для обработки клика по кнопке
  const handleButtonClick = (buttonId: string | null) => {
    const newButtonId = activeButtonId === buttonId ? null : buttonId;
    // Update internal state only if external state is not provided
    if (externalActiveButtonId === undefined) {
      setInternalActiveButtonId(newButtonId);
    }
    if (onButtonClick) {
      onButtonClick(newButtonId);
    }
    setCollapsedGroups(new Set());
  };

  const visibleRows = sortedRows.filter(isRowVisible);
  const hasGroups = rows.some((r) => (childrenByParent.get(r.id)?.length ?? 0) > 0);

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
                    data-testid="btn-collapse-level"
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
                    data-testid="btn-expand-level"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Развернуть уровень</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Buttons from layout */}
        {buttons && buttons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {buttons.map((button) => (
              <Button
                key={button.id}
                variant={activeButtonId === button.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleButtonClick(button.id)}
                disabled={isLoading}
                title={button.tooltip}
                data-testid={`btn-${button.id}`}
              >
                {button.label || button.title}
              </Button>
            ))}
          </div>
        )}
        {/* Deprecated: Grouping buttons (для обратной совместимости) */}
        {groupingOptions && groupingOptions.length > 0 && !buttons && (
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
                {(() => {
                  if (!component?.columns || component.columns.length === 0) {
                    return (
                      <TableHead colSpan={100} className="text-center py-8 text-muted-foreground">
                        Колонки не определены в layout для этой таблицы
                      </TableHead>
                    );
                  }
                  
                  // Разделяем колонки на текстовые (иерархия) и числовые (метрики)
                  const textColumns = component.columns.filter(col => col.type === 'string' || col.type === 'text');
                  const numericColumns = component.columns.filter(col => col.type !== 'string' && col.type !== 'text');
                  
                  return (
                    <>
                      {/* Одна колонка "Показатель" для всей иерархии */}
                      {textColumns.length > 0 && (
                        <TableHead className="w-[50%]">
                  <SortableHeader
                    label="Показатель"
                    column="name"
                    currentColumn={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                    className="text-xs font-medium uppercase tracking-wider"
                  />
                  </TableHead>
                )}
                      {/* Числовые колонки */}
                      {numericColumns.map((col) => (
                        <TableHead key={col.id} className="text-right">
                  <div className="flex justify-end">
                    <SortableHeader
                              label={col.label || col.id}
                              column={col.id}
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                      className="text-xs font-medium uppercase tracking-wider"
                    />
                  </div>
                </TableHead>
                      ))}
                    </>
                  );
                })()}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => {
                // Разделяем колонки
                const textColumns = component?.columns?.filter(col => col.type === 'string' || col.type === 'text') || [];
                const numericColumns = component?.columns?.filter(col => col.type !== 'string' && col.type !== 'text') || [];
                
                const hierarchyValues = textColumns
                  .map((col) => (row as any)[col.id])
                  .filter(Boolean);
                const displayName =
                  hierarchyValues[hierarchyValues.length - 1] || row.id;
                const indentLevel = getIndentLevel(row);
                const hasChildren = (childrenByParent.get(row.id)?.length ?? 0) > 0;
                const isCollapsed = collapsedGroups.has(row.id);

                return (
                  <TableRow
                    key={row.id}
                    className="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                    onDoubleClick={() => handleRowDoubleClick(row)}
                    data-testid={`table-row-${row.id}`}
                  >
                    {/* Колонка "Показатель" с иерархией */}
                    {textColumns.length > 0 && (
                    <TableCell
                      className="py-4"
                        style={{ paddingLeft: `${indentLevel * 1.5 + 1}rem` }}
                    >
                      <div className="flex items-center gap-2">
                        {hasChildren && (
                          <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(row.id);
                              }}
                            className="p-0.5 hover:bg-muted rounded transition-colors flex-shrink-0"
                            data-testid={`btn-toggle-row-${row.id}`}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                          {!hasChildren && indentLevel > 0 && (
                            <span className="w-5 flex-shrink-0" />
                          )}
                        <span
                          className={cn(
                              row.isGroup && "font-semibold",
                            row.isTotal && "font-bold"
                          )}
                        >
                            {displayName}
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
                    )}
                    
                    {/* Числовые колонки */}
                    {numericColumns.map((col) => {
                      const value = (row as any)[col.id];
                      const formatId = col.format || (col.id === "value" ? valueFormatId : percentageFormatId);
                      const numValue = typeof value === "number" ? value : undefined;
                      
                      // Читаем готовые ppChange/ytdChange напрямую из row
                      // Они уже рассчитаны в transformTableData через executeCalculation
                      const ppChangeValue: number | undefined = (row as any).ppChange;
                      const ytdChangeValue: number | undefined = (row as any).ytdChange;
                      
                      // Получаем форматы для отображения изменений
                      const ppChangeSubCol = col.sub_columns?.find((sc) => sc.id === "ppChange");
                      const ytdChangeSubCol = col.sub_columns?.find((sc) => sc.id === "ytdChange");
                      const ppChangeFormat = ppChangeSubCol?.format || percentageFormatId;
                      const ytdChangeFormat = ytdChangeSubCol?.format || percentageFormatId;
                      
                      return (
                        <TableCell key={col.id} className="text-right py-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold text-foreground">
                              {numValue !== undefined ? formatValue(formatId, numValue) : "—"}
                        </span>
                            {showChange && ppChangeValue !== undefined && (
                          <div
                            className={cn(
                              "flex items-center gap-1 text-sm",
                                  ppChangeValue > 0 && "text-green-600",
                                  ppChangeValue < 0 && "text-red-600",
                                  ppChangeValue === 0 && "text-muted-foreground"
                            )}
                          >
                                {ppChangeValue > 0 && <TrendingUp className="w-3 h-3" />}
                                {ppChangeValue < 0 && <TrendingDown className="w-3 h-3" />}
                            <span>
                                  {ppChangeValue > 0 ? "+" : ""}
                                  {formatValue(ppChangeFormat, Math.abs(ppChangeValue))}
                                  {ytdChangeValue !== undefined && (
                                <span className="ml-1">
                                      ({ytdChangeValue > 0 ? "↑" : ytdChangeValue < 0 ? "↓" : ""}
                                      {formatValue(ytdChangeFormat, Math.abs(ytdChangeValue))})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                      );
                    })}
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
            <DialogTitle className="text-lg">
              Детализация: {selectedRow ? [selectedRow.section, selectedRow.item, selectedRow.sub_item].filter(Boolean).join(' - ') || selectedRow.id : ''}
            </DialogTitle>
          </DialogHeader>

          {selectedRow && (
            <div className="mt-4">
              <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Значение:</span>
                    <span className="ml-2 font-semibold">
                      {selectedRow.value !== undefined ? formatValue(valueFormatId, selectedRow.value) : "—"}
                    </span>
                  </div>
                  {selectedRow.percentage !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Доля:</span>
                      <span className="ml-2 font-semibold">
                        {formatValue(percentageFormatId, selectedRow.percentage)}
                      </span>
                    </div>
                  )}
                  {(() => {
                    // Читаем готовое значение ppChange из row
                    const ppChange = selectedRow.ppChange;
                    
                    return ppChange !== undefined && ppChange !== 0 ? (
                      <div>
                        <span className="text-muted-foreground">Изменение:</span>
                        <span
                          className={cn(
                            "ml-2 font-semibold",
                            ppChange > 0 && "text-green-600",
                            ppChange < 0 && "text-red-600"
                          )}
                        >
                          {ppChange > 0 ? "+" : ""}
                          {formatValue(ppChangeFormatId, Math.abs(ppChange))}
                        </span>
                      </div>
                    ) : null;
                  })()}
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
                    // Читаем готовое значение ppChange из detailRow
                    const detailPpChange = detailRow.ppChange;
                    const isPositive = detailPpChange !== undefined && detailPpChange > 0;
                    const isNegative = detailPpChange !== undefined && detailPpChange < 0;
                    const detailDisplayName = [detailRow.section, detailRow.item, detailRow.sub_item]
                      .filter(Boolean)
                      .join(' - ') || detailRow.id;

                    return (
                      <TableRow key={detailRow.id} className="border-b border-border/50">
                        <TableCell className="py-3">
                          <span className="font-medium">
                            {detailDisplayName}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span className="text-sm text-muted-foreground">
                            {detailRow.percentage !== undefined
                              ? formatValue(percentageFormatId, detailRow.percentage)
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3 font-semibold">
                          {detailRow.value !== undefined ? formatValue(valueFormatId, detailRow.value) : "—"}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          {detailPpChange !== undefined && detailPpChange !== 0 && (
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
                                {detailPpChange > 0 ? "+" : ""}
                                {formatValue(ppChangeFormatId, Math.abs(detailPpChange))}
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
