import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PeriodDate } from "@/lib/api";

interface DatePickerProps {
  /** Список доступных дат из API */
  availableDates: PeriodDate[];
  /** Текущие выбранные даты { p1, p2, p3 } */
  selectedDates: {
    p1: string | null;
    p2: string | null;
    p3: string | null;
  };
  /** Callback при применении выбора */
  onApply: (dates: { p1: string; p2: string | null; p3: string | null }) => void;
  /** Состояние загрузки */
  isLoading?: boolean;
}

/**
 * Компонент выбора периодов.
 * Позволяет выбрать до 3 дат из списка.
 * - p1 = самая новая выбранная дата
 * - p2 = вторая по новизне
 * - p3 = самая старая
 */
export function DatePicker({
  availableDates,
  selectedDates,
  onApply,
  isLoading = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Локальное состояние для выбора дат (до нажатия Apply)
  const [localSelected, setLocalSelected] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (selectedDates.p1) initial.add(selectedDates.p1);
    if (selectedDates.p2) initial.add(selectedDates.p2);
    if (selectedDates.p3) initial.add(selectedDates.p3);
    return initial;
  });

  // Синхронизация локального состояния при изменении props
  useMemo(() => {
    const newSet = new Set<string>();
    if (selectedDates.p1) newSet.add(selectedDates.p1);
    if (selectedDates.p2) newSet.add(selectedDates.p2);
    if (selectedDates.p3) newSet.add(selectedDates.p3);
    setLocalSelected(newSet);
  }, [selectedDates.p1, selectedDates.p2, selectedDates.p3]);

  // Форматирование даты для отображения
  const formatDate = useCallback((dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  }, []);

  // Обработка клика по дате
  const handleDateClick = useCallback((dateStr: string) => {
    setLocalSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        // Снимаем выбор
        newSet.delete(dateStr);
      } else {
        // Добавляем, если меньше 3 выбрано
        if (newSet.size < 3) {
          newSet.add(dateStr);
        }
      }
      return newSet;
    });
  }, []);

  // Применение выбора: сортируем по убыванию и назначаем p1/p2/p3
  const handleApply = useCallback(() => {
    const sortedDates = Array.from(localSelected).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    onApply({
      p1: sortedDates[0] || "",
      p2: sortedDates[1] || null,
      p3: sortedDates[2] || null,
    });
    setIsOpen(false);
  }, [localSelected, onApply]);

  // Текст кнопки
  const buttonText = useMemo(() => {
    if (selectedDates.p1) {
      return formatDate(selectedDates.p1);
    }
    return "Выбрать период";
  }, [selectedDates.p1, formatDate]);

  // Проверка изменений
  const hasChanges = useMemo(() => {
    const currentSet = new Set<string>();
    if (selectedDates.p1) currentSet.add(selectedDates.p1);
    if (selectedDates.p2) currentSet.add(selectedDates.p2);
    if (selectedDates.p3) currentSet.add(selectedDates.p3);

    if (currentSet.size !== localSelected.size) return true;
    for (const date of currentSet) {
      if (!localSelected.has(date)) return true;
    }
    return false;
  }, [selectedDates, localSelected]);

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
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Выберите периоды</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Выберите до 3 дат. Выбрано: {localSelected.size}/3
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {availableDates.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2">
              Нет доступных дат
            </div>
          ) : (
            <div className="space-y-1">
              {availableDates.map((date) => {
                const isSelected = localSelected.has(date.periodDate);
                const isDisabled = !isSelected && localSelected.size >= 3;

                return (
                  <button
                    key={date.periodDate}
                    onClick={() => handleDateClick(date.periodDate)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    data-testid={`date-option-${date.periodDate}`}
                  >
                    <span className="flex items-center gap-2">
                      {formatDate(date.periodDate)}
                      {/* Показываем метки p1/p2/p3 по умолчанию */}
                      {date.isP1 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
                          P1
                        </span>
                      )}
                      {date.isP2 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-300">
                          P2
                        </span>
                      )}
                      {date.isP3 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-700 dark:text-orange-300">
                          P3
                        </span>
                      )}
                    </span>
                    {isSelected && <CheckIcon className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-3 border-t flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
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
