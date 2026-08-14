import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PeriodDate } from "@/lib/api";

// Максимальное число периодов, которое можно выбрать.
export const MAX_PERIODS = 6;

// Цвета меток периодов (P1..P6) для наглядности.
const PERIOD_BADGE_COLORS = [
  "bg-blue-500 text-white",
  "bg-green-500 text-white",
  "bg-orange-500 text-white",
  "bg-purple-500 text-white",
  "bg-cyan-500 text-white",
  "bg-pink-500 text-white",
];

interface DatePickerProps {
  /** Список доступных дат из API (все месяцы с флагами isP1..isP6) */
  availableDates: PeriodDate[];
  /** Текущие выбранные даты (массив, от 1 до 6, отсортирован по убыванию) */
  selectedDates: string[];
  /** Callback при применении выбора */
  onApply: (dates: string[]) => void;
  /** Состояние загрузки */
  isLoading?: boolean;
}

/**
 * Компонент выбора периодов — календарь.
 *
 * Позволяет задать количество периодов (от 1 до 6) и выбрать конкретные
 * месяцы из календаря-сетки всех доступных дат. Дата — минимальный
 * «кирпичик» периода (месяц). Выбранные даты возвращаются отсортированными
 * по убыванию: p1 — самая новая, последующие — более ранние.
 */
export function DatePicker({
  availableDates,
  selectedDates,
  onApply,
  isLoading = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Локальное состояние выбора (до нажатия Apply): выбранные даты и число периодов.
  const [localSelected, setLocalSelected] = useState<Set<string>>(() => {
    return new Set<string>(selectedDates.filter(Boolean));
  });
  const [periodCount, setPeriodCount] = useState<number>(() => {
    const len = selectedDates.filter(Boolean).length;
    return len > 0 ? len : 1;
  });

  // Синхронизация локального состояния при изменении props (внешний выбор).
  useEffect(() => {
    const filtered = selectedDates.filter(Boolean);
    setLocalSelected(new Set<string>(filtered));
    if (filtered.length > 0) setPeriodCount(filtered.length);
  }, [selectedDates]);

  // Краткая подпись месяца «янв. 2025».
  const formatMonthShort = useCallback((dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ru-RU", { year: "numeric", month: "short" });
    } catch {
      return dateStr;
    }
  }, []);

  // Обработка клика по месяцу: добавляет/снимает выбор с учётом лимита периодов.
  const handleMonthClick = useCallback(
    (dateStr: string) => {
      setLocalSelected((prev) => {
        const next = new Set(prev);
        if (next.has(dateStr)) {
          // Снимаем выбор месяца.
          next.delete(dateStr);
        } else {
          // Если выбрано уже периодCount месяцев — заменяем самый ранний.
          if (next.size >= periodCount) {
            const sorted = Array.from(next).sort(
              (a, b) => new Date(b).getTime() - new Date(a).getTime()
            );
            const oldest = sorted[sorted.length - 1];
            if (oldest) next.delete(oldest);
          }
          next.add(dateStr);
        }
        return next;
      });
    },
    [periodCount]
  );

  // Изменение количества периодов: сохраняем только periodCount самых новых дат.
  const handlePeriodCountChange = useCallback((value: string) => {
    const count = Math.min(MAX_PERIODS, Math.max(1, Number(value) || 1));
    setPeriodCount(count);
    setLocalSelected((prev) => {
      const sorted = Array.from(prev).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      return new Set<string>(sorted.slice(0, count));
    });
  }, []);

  // Применение выбора: сортируем по убыванию и передаём массив дат.
  const handleApply = useCallback(() => {
    const sorted = Array.from(localSelected).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    onApply(sorted);
    setIsOpen(false);
  }, [localSelected, onApply]);

  // Текст кнопки: диапазон от самой новой до самой старой выбранной даты.
  const buttonText = useMemo(() => {
    if (selectedDates.length === 0) {
      return "Выбрать период";
    }
    const first = formatMonthShort(selectedDates[0]);
    const last =
      selectedDates.length > 1 ? formatMonthShort(selectedDates[selectedDates.length - 1]) : null;
    return selectedDates.length === 1 ? first : `${first} — ${last}`;
  }, [selectedDates, formatMonthShort]);

  // Проверка наличия изменений относительно внешнего состояния.
  const hasChanges = useMemo(() => {
    const current = new Set<string>(selectedDates.filter(Boolean));
    if (current.size !== localSelected.size) return true;
    for (const date of current) {
      if (!localSelected.has(date)) return true;
    }
    return false;
  }, [selectedDates, localSelected]);

  // Группируем месяцы по годам для наглядной сетки календаря.
  const monthsByYear = useMemo(() => {
    const map = new Map<number, PeriodDate[]>();
    for (const d of availableDates) {
      const year = new Date(d.periodDate).getFullYear();
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(d);
    }
    // Сортируем годы по убыванию, внутри — месяцы по возрастанию (календарная сетка).
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        months: [...months].sort(
          (a, b) => new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime()
        ),
      }));
  }, [availableDates]);

  // Назначаем номера периодов выбранным датам (по убыванию дат: новейшая = P1).
  const selectedWithPeriod = useMemo(() => {
    const sorted = Array.from(localSelected).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    const map = new Map<string, number>();
    sorted.forEach((date, index) => map.set(date, index + 1));
    return map;
  }, [localSelected]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="date-picker-trigger"
          disabled={isLoading}
        >
          <CalendarIcon className="h-4 w-4" />
          {buttonText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b space-y-3">
          <h4 className="font-medium text-sm">Выберите периоды</h4>

          {/* Селектор количества периодов */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Количество периодов</span>
            <Select
              value={String(periodCount)}
              onValueChange={handlePeriodCountChange}
              data-testid="period-count-select"
            >
              <SelectTrigger className="w-24 h-9" data-testid="period-count-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)} data-testid={`period-count-${n}`}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Выберите {periodCount}{" "}
            {periodCount === 1 ? "месяц" : periodCount < 5 ? "месяца" : "месяцев"} из календаря.
            Минимальный шаг — месяц.
          </p>
        </div>

        {/* Календарь-сетка доступных месяцев */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-4">
          {monthsByYear.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2">Нет доступных дат</div>
          ) : (
            monthsByYear.map(({ year, months }) => (
              <div key={year}>
                <div className="text-xs font-medium text-muted-foreground mb-2">{year}</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {months.map((date) => {
                    const isSelected = localSelected.has(date.periodDate);
                    const periodNum = selectedWithPeriod.get(date.periodDate);

                    return (
                      <button
                        key={date.periodDate}
                        type="button"
                        onClick={() => handleMonthClick(date.periodDate)}
                        className={cn(
                          "flex items-center justify-center gap-1 px-2 py-2 text-xs rounded-md border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-muted"
                        )}
                        data-testid={`date-option-${date.periodDate}`}
                        aria-pressed={isSelected}
                      >
                        <span>{formatMonthShort(date.periodDate)}</span>
                        {isSelected && periodNum ? (
                          <span
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                              PERIOD_BADGE_COLORS[(periodNum - 1) % PERIOD_BADGE_COLORS.length]
                            )}
                          >
                            {periodNum}
                          </span>
                        ) : (
                          <CheckIcon className="h-3 w-3 opacity-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Отмена
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={localSelected.size === 0 || !hasChanges}
            data-testid="date-picker-apply"
          >
            Применить
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
