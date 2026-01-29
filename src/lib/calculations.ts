/**
 * Утилиты для расчёта процентных изменений и других вычислений
 */

/**
 * Результат расчёта процентных изменений
 */
export interface PercentChangeResult {
  /** Абсолютное изменение к предыдущему периоду: current - previous */
  ppDiff: number;
  /** Изменение к предыдущему периоду в долях: (current - previous) / previous (0.1 = 10%) */
  ppPercent: number;
  /** Абсолютное изменение YTD: current - previousYear */
  ytdDiff: number;
  /** Изменение YTD в долях: (current - previousYear) / previousYear (0.1 = 10%) */
  ytdPercent: number;
}

/**
 * Расчёт процентных изменений (PPTD и YTD)
 * 
 * @param current - Текущее значение (value)
 * @param previous - Значение за предыдущий период (previousValue)
 * @param previousYear - Значение за аналогичный период прошлого года (previousYearValue)
 * @returns Объект с абсолютными и процентными изменениями (проценты в долях: 0.1 = 10%)
 * 
 * @example
 * const result = calculatePercentChange(1100, 1000, 900);
 * // result = {
 * //   ppDiff: 100,        // 1100 - 1000
 * //   ppPercent: 0.1,      // (1100 - 1000) / 1000 = 0.1 (10%)
 * //   ytdDiff: 200,        // 1100 - 900
 * //   ytdPercent: 0.2222   // (1100 - 900) / 900 ≈ 0.2222 (22.22%)
 * // }
 */
export function calculatePercentChange(
  current: number | null | undefined,
  previous: number | null | undefined,
  previousYear?: number | null | undefined
): PercentChangeResult {
  // Обработка null/undefined - возвращаем 0
  const currentValue = current ?? 0;
  const previousValue = previous ?? 0;
  const previousYearValue = previousYear ?? 0;

  // Абсолютные изменения
  const ppDiff = currentValue - previousValue;
  const ytdDiff = previousYearValue !== 0 ? currentValue - previousYearValue : 0;

  // Процентные изменения в долях (0.1 = 10%)
  // Если previous = 0, то ppPercent = 0 (избегаем деления на 0)
  const ppPercent = previousValue !== 0 
    ? ppDiff / previousValue
    : 0;

  // Если previousYear = 0, то ytdPercent = 0 (избегаем деления на 0)
  const ytdPercent = previousYearValue !== 0
    ? ytdDiff / previousYearValue
    : 0;

  return {
    ppDiff,
    ppPercent: Math.round(ppPercent * 10000) / 10000, // Округление до 4 знаков после запятой
    ytdDiff,
    ytdPercent: Math.round(ytdPercent * 10000) / 10000, // Округление до 4 знаков после запятой
  };
}

/**
 * Расчёт процента от родительской строки (доля от суммы родителя)
 * 
 * @param value - Значение текущей строки
 * @param parentTotal - Сумма родительской строки
 * @returns Процент от родителя (0-100)
 * 
 * @example
 * const percentage = calculateRowPercentage(50, 200);
 * // percentage = 25 (50 составляет 25% от 200)
 */
export function calculateRowPercentage(
  value: number | null | undefined,
  parentTotal: number | null | undefined
): number {
  const valueNum = value ?? 0;
  const totalNum = parentTotal ?? 0;

  // Если total = 0, возвращаем 0 (избегаем деления на 0)
  if (totalNum === 0) {
    return 0;
  }

  const percentage = (valueNum / totalNum) * 100;
  return Math.round(percentage * 100) / 100; // Округление до 2 знаков
}
