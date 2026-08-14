import { useMemo } from "react";
import { cn } from "@/lib/utils";

// Размеры области спарклайна в логических координатах.
// Спарклайн рисуется через SVG без внешних библиотек — это лёгкая
// мини-визуализация тренда для KPI-карточек.
const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 30;
const PADDING = 2;

interface SparklineProps {
  /** Значения точек тренда (например P1, P2, P3). Чем их больше, тем плавнее линия. */
  values: number[];
  /** Класс для кастомизации через CSS. */
  className?: string;
}

/**
 * Компактный график-спарклайн: рисует линию тренда по ряду значений.
 *
 * Значения масштабируются к фиксированной области просмотра, поэтому
 * спарклайн сохраняет пропорции при любом наборе точек. Если точек меньше
 * двух или значения некорректны — компонент возвращает null.
 *
 * @param values - массив числовых значений для построения линии
 * @param className - дополнительные CSS-классы для контейнера
 */
export function Sparkline({ values, className }: SparklineProps) {
  // Преобразуем ряд значений в координаты точек SVG-линии.
  const points = useMemo(() => {
    // Отфильтровываем некорректные значения; для линии нужно минимум 2 точки.
    const valid = values.filter((v) => typeof v === "number" && Number.isFinite(v));
    if (valid.length < 2) {
      return null;
    }

    // Определяем минимальное и максимальное значение для масштабирования.
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 1; // защита от деления на ноль при плоском ряде

    // Распределяем точки по ширине, а значения — по высоте области.
    const stepX = (VIEWBOX_WIDTH - PADDING * 2) / (valid.length - 1);
    return valid
      .map((value, index) => {
        const x = PADDING + index * stepX;
        const y =
          VIEWBOX_HEIGHT - PADDING - ((value - min) / range) * (VIEWBOX_HEIGHT - PADDING * 2);
        return { x, y };
      })
      .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`);
  }, [values]);

  if (!points) {
    return null;
  }

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full", className)}
      aria-hidden="true"
      data-testid="sparkline"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
