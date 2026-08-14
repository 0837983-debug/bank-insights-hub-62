import { useMemo } from "react";
import { EChart } from "@/components/EChart";
import { Card, CardContent } from "@/components/ui/card";
import type { KPIMetric } from "@/lib/api";

// Явные цвета графиков (HEX). ECharts рисует в canvas, где CSS-переменные
// не работают, поэтому цвета задаются константами. Палитра согласована
// с цветами темы приложения.
const PALETTE = ["#3b82f6", "#06b6d4", "#22c55e", "#f59e0b", "#a855f7"];

// Цвета для серий периодов (от текущего к более ранним).
const PERIOD_COLORS = [
  "#3b82f6", // P1 — текущий период (синий)
  "#22c55e", // P2 — зелёный
  "#f59e0b", // P3 — оранжевый
  "#a855f7", // P4 — фиолетовый
  "#06b6d4", // P5 — циановый
  "#ec4899", // P6 — розовый
];

// Названия периодов для легенды и тепловой карты (от текущего к более ранним).
const PERIOD_NAMES = ["Текущий", "P2", "P3", "P4", "P5", "P6"];

interface DashboardChartsProps {
  /** Список метрик KPI, загруженных для текущих дат. */
  kpis: KPIMetric[];
}

/**
 * Панель наглядных графиков на главном дашборде.
 *
 * Строит набор интерактивных, цветных графиков по реальным данным KPI:
 * сравнительная столбчатая диаграмма, линейный график динамики, круговая
 * диаграмма долей и тепловая карта значений по периодам. Библиотека
 * графиков в интерфейсе не упоминается — отображаются только результаты.
 */
export function DashboardCharts({ kpis }: DashboardChartsProps) {
  // Отбираем метрики с числовыми значениями текущего периода.
  const validKpis = useMemo(() => {
    return kpis.filter((k) => typeof k.value === "number" && Number.isFinite(k.value));
  }, [kpis]);

  // Подготовка данных для графиков. Строим серии по всем доступным периодам
  // (от текущего P1 к более ранним P2..P6). Доступность определяется наличием
  // хотя бы одного числового значения в метриках.
  const labels = validKpis.map((k) => k.componentId || k.id);

  // Функция получения значения периода из метрики.
  const getPeriodValue = (k: KPIMetric, index: number): number | null => {
    switch (index) {
      case 0:
        return k.value ?? null;
      case 1:
        return k.p2Value ?? null;
      case 2:
        return k.p3Value ?? null;
      case 3:
        return k.p4Value ?? null;
      case 4:
        return k.p5Value ?? null;
      case 5:
        return k.p6Value ?? null;
      default:
        return null;
    }
  };

  // Определяем число отображаемых периодов (первый, у которого нет данных, обрывает ряд).
  const periodCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < PERIOD_NAMES.length; i++) {
      const hasValue = validKpis.some((k) => {
        const v = getPeriodValue(k, i);
        return typeof v === "number" && Number.isFinite(v);
      });
      if (!hasValue) break;
      count = i + 1;
    }
    return Math.max(1, count);
  }, [validKpis]);

  // Массив серий: [{ name, data }, ...] для bar/line.
  const periodSeries = useMemo(() => {
    const series: Array<{ name: string; data: Array<number | null> }> = [];
    for (let i = 0; i < periodCount; i++) {
      series.push({
        name: PERIOD_NAMES[i],
        data: validKpis.map((k) => getPeriodValue(k, i)),
      });
    }
    return series;
  }, [validKpis, periodCount]);

  // Параметры оси для единообразного стиля графиков.
  const axisStyle = {
    axisLine: { lineStyle: { color: "#e2e8f0" } },
    axisLabel: { color: "#64748b", fontSize: 11 },
  };

  // Конфигурация сравнительной столбчатой диаграммы (по выбранным периодам).
  const barOption = useMemo(() => {
    return {
      tooltip: { trigger: "axis" as const },
      legend: { bottom: 0, textStyle: { color: "#64748b" } },
      grid: { left: 48, right: 24, top: 24, bottom: 48 },
      xAxis: {
        type: "category" as const,
        data: labels,
        axisLabel: { ...axisStyle.axisLabel, rotate: 20 },
      },
      yAxis: { type: "value" as const, ...axisStyle },
      series: periodSeries.map((series, i) => ({
        name: series.name,
        type: "bar" as const,
        data: series.data,
        barMaxWidth: 26,
        itemStyle: { color: PERIOD_COLORS[i % PERIOD_COLORS.length], borderRadius: [4, 4, 0, 0] },
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, periodSeries]);

  // Конфигурация линейного графика динамики (по выбранным периодам).
  const lineOption = useMemo(() => {
    return {
      tooltip: { trigger: "axis" as const },
      legend: { bottom: 0, textStyle: { color: "#64748b" } },
      grid: { left: 48, right: 24, top: 24, bottom: 48 },
      xAxis: {
        type: "category" as const,
        data: labels,
        axisLabel: { ...axisStyle.axisLabel, rotate: 20 },
      },
      yAxis: { type: "value" as const, ...axisStyle },
      series: periodSeries.map((series, i) => {
        const color = PERIOD_COLORS[i % PERIOD_COLORS.length];
        return {
          name: series.name,
          type: "line" as const,
          data: series.data,
          smooth: true,
          symbolSize: 6,
          lineStyle: { color, width: 3 },
          itemStyle: { color },
          areaStyle: i === 0 ? { color, opacity: 0.08 } : undefined,
        };
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, periodSeries]);

  // Конфигурация круговой диаграммы долей текущего периода.
  const pieOption = useMemo(() => {
    return {
      color: PALETTE,
      tooltip: { trigger: "item" as const },
      legend: { bottom: 0, textStyle: { color: "#64748b" } },
      series: [
        {
          type: "pie" as const,
          radius: ["42%", "70%"],
          center: ["50%", "45%"],
          itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: "bold" as const },
          },
          data: validKpis.map((k, i) => ({
            name: k.componentId || k.id,
            value: Math.abs(k.value),
            itemStyle: { color: PALETTE[i % PALETTE.length] },
          })),
        },
      ],
    };
  }, [validKpis]);

  // Конфигурация тепловой карты: метрики по периодам.
  // Строки — метрики, столбцы — выбранные периоды (P1..P6).
  const heatOption = useMemo(() => {
    const periods = PERIOD_NAMES.slice(0, periodCount);
    // Значения для тепловой карты: тройка [строка, столбец, значение].
    const data: Array<[number, number, number]> = [];
    validKpis.forEach((k, row) => {
      for (let col = 0; col < periodCount; col++) {
        const v = getPeriodValue(k, col);
        if (typeof v === "number" && Number.isFinite(v)) {
          data.push([row, col, v]);
        }
      }
    });

    return {
      tooltip: {
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params;
          const item = p as { value?: [number, number, number] };
          const value = item.value;
          if (!value) return "";
          const [r, c, v] = value;
          return `${labels[r]} · ${periods[c]}: ${v.toLocaleString("ru-RU")}`;
        },
      },
      grid: { left: 110, right: 24, top: 16, bottom: 40 },
      xAxis: { type: "category" as const, data: periods, splitArea: { show: true } },
      yAxis: {
        type: "category" as const,
        data: labels,
        axisLabel: { color: "#64748b", fontSize: 11 },
      },
      visualMap: {
        min: Math.min(...data.map((d) => d[2])),
        max: Math.max(...data.map((d) => d[2])),
        calculable: true,
        orient: "horizontal" as const,
        left: "center",
        bottom: 0,
        inRange: { color: ["#fee2e2", "#3b82f6"] },
        textStyle: { color: "#64748b" },
      },
      series: [
        {
          type: "heatmap" as const,
          data,
          label: { show: true, fontSize: 10 },
          itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 3 },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.2)" } },
        },
      ],
    };
  }, [validKpis, labels, periodCount]);

  // Если нет данных — ничего не отображаем.
  if (validKpis.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-base font-semibold text-foreground mb-2">
            Сравнение показателей по периодам
          </h3>
          <EChart option={barOption} className="h-72 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-base font-semibold text-foreground mb-2">
            Динамика показателей по периодам
          </h3>
          <EChart option={lineOption} className="h-72 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-base font-semibold text-foreground mb-2">
            Доли показателей (текущий период)
          </h3>
          <EChart option={pieOption} className="h-72 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <h3 className="text-base font-semibold text-foreground mb-2">
            Тепловая карта значений по периодам
          </h3>
          <EChart option={heatOption} className="h-72 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
