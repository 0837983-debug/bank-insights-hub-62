import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReportFiltersProps {
  period: string;
  comparison: string;
  onPeriodChange: (value: string) => void;
  onComparisonChange: (value: string) => void;
}

const periodOptions = [
  { value: "month", label: "Месяц" },
  { value: "quarter", label: "Квартал" },
  { value: "half-year", label: "Полугодие" },
  { value: "year", label: "Год" },
];

const comparisonOptions = [
  { value: "prev-period", label: "Предыдущий период" },
  { value: "prev-year", label: "Аналогичный период пр. года" },
];

export const ReportFilters = ({
  period,
  comparison,
  onPeriodChange,
  onComparisonChange,
}: ReportFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-6 p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Период:</span>
        <div className="flex gap-1">
          {periodOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => onPeriodChange(opt.value)}
              className={cn("transition-all", period === opt.value && "shadow-sm")}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Сравнение:</span>
        <div className="flex gap-1">
          {comparisonOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={comparison === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => onComparisonChange(opt.value)}
              className={cn("transition-all", comparison === opt.value && "shadow-sm")}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
