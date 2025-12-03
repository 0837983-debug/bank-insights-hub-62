import { useState } from "react";
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
import { DownloadIcon, InfoIcon, ChevronRight, ChevronDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TableRowData {
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
}

const formatNumber = (num: number, currency: string = "₽") => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (absNum >= 1e9) {
    return `${sign}${currency}${(absNum / 1e9).toFixed(2)}`;
  }
  if (absNum >= 1e6) {
    return `${sign}${currency}${(absNum / 1e6).toFixed(1)}`;
  }
  if (absNum >= 1e3) {
    return `${sign}${currency}${(absNum / 1e3).toFixed(1)}`;
  }
  return `${sign}${currency}${absNum.toFixed(0)}`;
};

export const FinancialTable = ({
  title,
  rows,
  showPercentage = true,
  showChange = true,
  currency = "₽",
}: FinancialTableProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
    return !collapsedGroups.has(row.parentId);
  };

  const handleExport = () => {
    const headers = ["Наименование", "Сумма, млрд руб"];
    if (showPercentage) headers.push("Доля, %");
    if (showChange) headers.push("Изм., %");
    
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => {
        const values = [row.name, row.value.toString()];
        if (showPercentage) values.push(row.percentage?.toString() || "");
        if (showChange) values.push(row.change?.toString() || "");
        return values.join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.csv`;
    link.click();
  };

  const visibleRows = rows.filter(isRowVisible);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const groupIds = rows.filter((r) => r.isGroup && !r.isTotal).map((r) => r.id);
              setCollapsedGroups(new Set(groupIds));
            }}
          >
            <ChevronRight className="w-4 h-4 mr-1" />
            Свернуть
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCollapsedGroups(new Set())}
          >
            <ChevronDown className="w-4 h-4 mr-1" />
            Развернуть
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Наименование</TableHead>
              <TableHead className="text-right">Сумма, млрд руб</TableHead>
              {showPercentage && <TableHead className="text-right w-[90px]">Доля, %</TableHead>}
              {showChange && <TableHead className="text-right w-[90px]">Изм., %</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => {
              const hasChildren = rows.some((r) => r.parentId === row.id);
              const isCollapsed = collapsedGroups.has(row.id);

              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    row.isGroup && "bg-muted/50 font-semibold",
                    row.isTotal && "bg-primary/5 font-bold border-t-2"
                  )}
                >
                  <TableCell
                    className="flex items-center gap-2"
                    style={{ paddingLeft: row.indent ? `${row.indent * 1.5 + 1}rem` : undefined }}
                  >
                    {hasChildren && (
                      <button
                        onClick={() => toggleGroup(row.id)}
                        className="p-0.5 hover:bg-muted rounded transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                    {!hasChildren && row.indent && <span className="w-5" />}
                    {row.name}
                    {row.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoIcon className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{row.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(row.value, currency)}
                  </TableCell>
                  {showPercentage && (
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {row.percentage !== undefined ? `${row.percentage.toFixed(1)}%` : "—"}
                    </TableCell>
                  )}
                  {showChange && (
                    <TableCell
                      className={cn(
                        "text-right font-mono",
                        row.change !== undefined && row.change > 0 && "text-green-600",
                        row.change !== undefined && row.change < 0 && "text-red-600"
                      )}
                    >
                      {row.change !== undefined
                        ? `${row.change > 0 ? "+" : ""}${row.change.toFixed(1)}%`
                        : "—"}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};