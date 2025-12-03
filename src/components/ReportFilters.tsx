import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";

interface ReportFiltersProps {
  period: string;
  comparison: string;
  onPeriodChange: (value: string) => void;
  onComparisonChange: (value: string) => void;
}

export const ReportFilters = ({
  period,
  comparison,
  onPeriodChange,
  onComparisonChange,
}: ReportFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Период:</span>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Месяц</SelectItem>
            <SelectItem value="quarter">Квартал</SelectItem>
            <SelectItem value="half-year">Полугодие</SelectItem>
            <SelectItem value="year">Год</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Сравнение:</span>
        <Select value={comparison} onValueChange={onComparisonChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prev-period">Предыдущий период</SelectItem>
            <SelectItem value="prev-year">Аналогичный период пр. года</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="ml-auto">
        <Button variant="outline" size="sm">
          <DownloadIcon className="w-4 h-4 mr-2" />
          Экспорт
        </Button>
      </div>
    </div>
  );
};
