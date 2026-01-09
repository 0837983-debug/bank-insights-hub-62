import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterIcon } from "lucide-react";
import { useState } from "react";

interface FilterPanelProps {
  onFilterChange?: (filters: any) => void;
}

export const FilterPanel = ({ onFilterChange }: FilterPanelProps) => {
  const [period, setPeriod] = useState<string>("month");
  const [segment, setSegment] = useState<string>("all");

  const handleApply = () => {
    onFilterChange?.({ period, segment });
  };

  const handleReset = () => {
    setPeriod("month");
    setSegment("all");
    onFilterChange?.({ period: "month", segment: "all" });
  };

  return (
    <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <FilterIcon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Фильтры</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Период</label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">День</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="quarter">Квартал</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Сегмент клиента</label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите сегмент" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сегменты</SelectItem>
              <SelectItem value="retail">Физические лица</SelectItem>
              <SelectItem value="corporate">Корпоративные</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2 md:col-span-2">
          <Button onClick={handleApply} className="flex-1">
            Применить фильтры
          </Button>
          <Button onClick={handleReset} variant="outline" className="flex-1">
            Сбросить
          </Button>
        </div>
      </div>
    </div>
  );
};
