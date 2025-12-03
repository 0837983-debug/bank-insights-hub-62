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
import { DownloadIcon, InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TableRow {
  id: string;
  name: string;
  description?: string;
  value: number;
  percentage?: number;
  isGroup?: boolean;
  isTotal?: boolean;
  indent?: number;
}

interface FinancialTableProps {
  title: string;
  rows: TableRow[];
  showPercentage?: boolean;
  currency?: string;
}

const formatNumber = (num: number, currency: string = "₽") => {
  const absNum = Math.abs(num);
  if (absNum >= 1e9) {
    return `${currency}${(num / 1e9).toFixed(2)} млрд`;
  }
  if (absNum >= 1e6) {
    return `${currency}${(num / 1e6).toFixed(1)} млн`;
  }
  if (absNum >= 1e3) {
    return `${currency}${(num / 1e3).toFixed(1)} тыс`;
  }
  return `${currency}${num.toFixed(0)}`;
};

export const FinancialTable = ({
  title,
  rows,
  showPercentage = true,
  currency = "₽",
}: FinancialTableProps) => {
  const handleExport = () => {
    const csvContent = [
      ["Наименование", "Сумма", showPercentage ? "Доля, %" : ""].filter(Boolean).join(","),
      ...rows.map((row) =>
        [row.name, row.value, showPercentage ? row.percentage : ""].filter((v) => v !== "").join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleExport}>
          <DownloadIcon className="w-4 h-4 mr-2" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Наименование</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              {showPercentage && <TableHead className="text-right w-[100px]">Доля, %</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  row.isGroup && "bg-muted/50 font-semibold",
                  row.isTotal && "bg-primary/5 font-bold border-t-2"
                )}
              >
                <TableCell
                  className={cn("flex items-center gap-2")}
                  style={{ paddingLeft: row.indent ? `${row.indent * 1.5 + 1}rem` : undefined }}
                >
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
