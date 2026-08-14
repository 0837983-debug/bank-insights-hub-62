import { useMemo } from "react";
import { useGetData } from "@/hooks/useAPI";
import { EChart } from "@/components/EChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { LayoutComponent, TableRow } from "@/lib/api";

// Типы графиков, поддерживаемые в интерфейсе. Названия приведены на русском,
// чтобы пользователь не видел технических терминов.
export type ChartKind = "столбчатый" | "линейный" | "площадной" | "круговой";

// Палитра цветов для серий данных.
const PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface DynamicChartProps {
  /** Компонент графика из layout. */
  component: LayoutComponent;
  /** Выбранные даты периодов (от 1 до 6, по убыванию). */
  dates: string[] | null;
}

/**
 * Универсальный компонент графика на дашборде.
 *
 * Загружает данные через getData (queryId из layout) и строит интерактивный
 * график с анимацией. Тип графика задаётся в layout через chartType:
 * "столбчатый" | "линейный" | "площадной" | "круговой" (по умолчанию
 * "столбчатый"). Ось категорий и ось значений определяются из колонок
 * layout: первая dimension-колонка — категория, первая measure-колонка —
 * значение.
 */
export function DynamicChart({ component, dates }: DynamicChartProps) {
  // Формируем параметры периодов { p1..p6 } из массива дат.
  const periodParams = useMemo(() => {
    if (!dates || dates.length === 0) return null;
    const params: Record<string, string> = {};
    dates.forEach((date, index) => {
      params[`p${index + 1}`] = date;
    });
    return params;
  }, [dates]);

  // Загружаем данные по queryId (тот же механизм, что и для таблиц).
  const {
    data: tableData,
    isLoading,
    error,
  } = useGetData(component.queryId || null, periodParams ?? {}, {
    enabled: !!component.queryId && !!periodParams && !!component.componentId,
    componentId: component.componentId,
  });

  // Определяем тип графика из layout (по умолчанию — столбчатый).
  const rawType = (component as LayoutComponent & { chartType?: string }).chartType;
  const kind: ChartKind =
    rawType === "линейный"
      ? "линейный"
      : rawType === "площадной"
        ? "площадной"
        : rawType === "круговой"
          ? "круговой"
          : "столбчатый";

  // Имена полей для категории и значения из колонок layout.
  const { xField, yField } = useMemo(() => {
    const columns = component.columns || [];
    const dimension = columns.find((c) => c.fieldType === "dimension");
    const measure = columns.find((c) => c.fieldType === "measure");
    return { xField: dimension?.id || "class", yField: measure?.id || "value" };
  }, [component.columns]);

  // Преобразуем строки API в пары { категория, значение }, агрегируя по категории.
  const chartData = useMemo(() => {
    const rows = (tableData?.rows || []) as TableRow[];
    if (rows.length === 0) return [];

    const aggregated = new Map<string, number>();
    rows.forEach((row) => {
      const rowData = row as unknown as Record<string, unknown>;
      const name = String(rowData[xField] ?? "Без категории");
      const value = Number(rowData[yField]) || 0;
      aggregated.set(name, (aggregated.get(name) || 0) + value);
    });

    return Array.from(aggregated.entries()).map(([name, value]) => ({ name, value }));
  }, [tableData, xField, yField]);

  // Строим конфигурацию графика ECharts в зависимости от типа.
  const option = useMemo(() => {
    const categories = chartData.map((d) => d.name);
    const values = chartData.map((d) => d.value);
    const title = component.title || "";

    // Общие настройки всплывающей подсказки и подписей.
    const base = {
      color: PALETTE,
      tooltip: { trigger: "axis" as const, backgroundColor: "rgba(255,255,255,0.95)" },
      grid: { left: 48, right: 24, top: 24, bottom: 32 },
      title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    };

    // Круговая диаграмма имеет собственную компоновку.
    if (kind === "круговой") {
      return {
        ...base,
        tooltip: { trigger: "item" as const },
        legend: { bottom: 0, left: "center" },
        series: [
          {
            type: "pie" as const,
            radius: ["45%", "70%"],
            itemStyle: { borderRadius: 6 },
            label: { show: true, formatter: "{b}\n{d}%" },
            data: chartData.map((d, i) => ({
              name: d.name,
              value: d.value,
              itemStyle: { color: PALETTE[i % PALETTE.length] },
            })),
          },
        ],
      };
    }

    // Линейный и площадной графики.
    if (kind === "линейный" || kind === "площадной") {
      const areaStyle = kind === "площадной" ? { opacity: 0.2 } : undefined;
      return {
        ...base,
        xAxis: { type: "category" as const, data: categories, axisTick: { alignWithLabel: true } },
        yAxis: { type: "value" as const },
        series: [
          {
            type: "line" as const,
            data: values,
            smooth: true,
            areaStyle,
            symbolSize: 6,
          },
        ],
      };
    }

    // Столбчатая диаграмма (по умолчанию).
    return {
      ...base,
      xAxis: { type: "category" as const, data: categories, axisTick: { alignWithLabel: true } },
      yAxis: { type: "value" as const },
      series: [
        {
          type: "bar" as const,
          data: values,
          barMaxWidth: 48,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [chartData, kind, component.title]);

  // Состояние загрузки — скелетон.
  if (isLoading && !tableData) {
    return (
      <div className="mt-4">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  // Ошибка загрузки — предупреждение.
  if (error && !tableData) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ошибка загрузки графика</AlertTitle>
        <AlertDescription>
          Не удалось загрузить данные для графика "{component.title}"
        </AlertDescription>
      </Alert>
    );
  }

  // Нет данных — информационное сообщение.
  if (!tableData || chartData.length === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-4 p-4 border rounded-lg">
        Нет данных для графика "{component.title}"
      </div>
    );
  }

  return (
    <div className="mt-6">
      <EChart option={option} className="h-80 w-full" />
    </div>
  );
}
