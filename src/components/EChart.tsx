import { useEffect, useRef } from "react";
import * as echarts from "echarts";

/**
 * Лёгкая обёртка над библиотекой построения графиков ECharts.
 *
 * Принимает готовую конфигурацию (option) и создаёт интерактивный график
 * с анимацией. Автоматически подстраивается под размер контейнера и
 * корректно освобождает ресурсы при размонтировании. Библиотека не должна
 * упоминаться в интерфейсе — компонент только отображает график.
 */
export function EChart({
  option,
  className = "",
}: {
  /** Конфигурация графика в формате ECharts. */
  option: echarts.EChartsOption;
  /** Дополнительные CSS-классы контейнера. */
  className?: string;
}) {
  // Ссылка на DOM-контейнер, куда рендерится график.
  const chartRef = useRef<HTMLDivElement>(null);
  // Ссылка на активный экземпляр графика (для корректного освобождения).
  const instanceRef = useRef<echarts.ECharts | null>(null);

  // Создаём экземпляр графика при монтировании.
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    instanceRef.current = chart;

    // Отслеживаем изменение размера окна, чтобы график оставался адаптивным.
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      instanceRef.current = null;
    };
  }, []);

  // Обновляем конфигурацию при её изменении.
  useEffect(() => {
    instanceRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={chartRef} className={className} data-testid="echart" />;
}
