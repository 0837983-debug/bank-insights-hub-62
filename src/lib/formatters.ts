/**
 * Универсальные утилиты форматирования для чисел, валют и процентов
 * Основано на определениях форматов из layout API
 * 
 * Форматы загружаются из layout API при загрузке страницы и кэшируются
 * для использования во всем приложении.
 */

import type { LayoutFormat } from "@/lib/api";

// Глобальный кэш для форматов, загруженных из layout API
let formatsCache: Record<string, LayoutFormat> = {};

/**
 * Инициализирует кэш форматов из данных layout API
 * Должна вызываться при загрузке layout при инициализации страницы
 * 
 * @param formats - Объект форматов из layout API (layout.formats)
 */
export function initializeFormats(formats: Record<string, LayoutFormat>): void {
  formatsCache = formats;
}

/**
 * Получить кэш форматов (для целей тестирования/отладки)
 */
export function getFormatsCache(): Record<string, LayoutFormat> {
  return formatsCache;
}

/**
 * Форматирует числовое значение согласно конфигурации формата из layout API
 * 
 * @param formatId - ID формата (ключ из layout.formats)
 * @param value - Числовое значение для форматирования
 * @returns Отформатированная строка или "-" если значение null/undefined/NaN
 * 
 * @example
 * // Предполагая, что формат "currency_rub" загружен из layout API
 * formatValue("currency_rub", 1000000) // "₽1.0M"
 * formatValue("percent", 5.2) // "5.2%"
 */
export function formatValue(
  formatId: string,
  value: number | null | undefined
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }

  // Получить конфигурацию формата из кэша
  const config = formatsCache[formatId];

  // Если конфигурация не найдена, вернуть исходное число как запасной вариант
  if (!config) {
    console.warn(`Format config not found for formatId: ${formatId}. Available formats:`, Object.keys(formatsCache));
    return value.toString();
  }

  let processedValue = value;

  // Применить множитель из конфигурации формата
  if (config.multiplier) {
    processedValue = processedValue * config.multiplier;
  }

  // Обработать сокращение (K, M, B)
  let suffix = "";
  if (config.shorten) {
    const absValue = Math.abs(processedValue);
    if (absValue >= 1e9) {
      processedValue = processedValue / 1e9;
      suffix = "B";
    } else if (absValue >= 1e6) {
      processedValue = processedValue / 1e6;
      suffix = "M";
    } else if (absValue >= 1e3) {
      processedValue = processedValue / 1e3;
      suffix = "K";
    }
  }

  // Форматировать число
  const minDigits = config.minimumFractionDigits ?? 0;
  const maxDigits = config.maximumFractionDigits ?? 2;
  
  // Используем Intl.NumberFormat для правильного форматирования с min/max digits
  // Используем 'en-US' чтобы получить точку в качестве десятичного разделителя
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
    useGrouping: false, // Разделители тысяч обрабатываем отдельно
  });
  
  let formattedNumber = formatter.format(processedValue);

  // Добавить разделители тысяч
  if (config.thousandSeparator) {
    const parts = formattedNumber.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    formattedNumber = parts.join(".");
  }

  // Построить итоговую строку с префиксом/суффиксом
  let result = formattedNumber;

  if (config.prefixUnitSymbol) {
    result = config.prefixUnitSymbol + result;
  }

  if (suffix) {
    result = result + suffix;
  }

  if (config.suffixUnitSymbol) {
    result = result + config.suffixUnitSymbol;
  }

  return result;
}

/**
 * Форматирует значение валюты (устарело - используйте formatValue с formatId из layout)
 * @deprecated Используйте formatValue(formatId, value) вместо этого
 */
export function formatCurrency(
  value: number,
  currency: string = "RUB",
  shorten: boolean = true
): string {
  // Попытаться использовать формат из кэша, если доступен
  const formatId = currency === "RUB" ? "currency_rub" : "currency_usd";
  if (formatsCache[formatId]) {
    return formatValue(formatId, value);
  }
  
  // Запасной вариант - форматирование по умолчанию
  const config: LayoutFormat = {
    kind: "currency",
    prefixUnitSymbol: currency === "RUB" ? "₽" : "$",
    thousandSeparator: true,
    shorten,
    minimumFractionDigits: shorten ? 0 : 2,
    maximumFractionDigits: shorten ? 1 : 2,
  };
  formatsCache[formatId] = config;
  return formatValue(formatId, value);
}

/**
 * Форматирует число с опциональным сокращением (устарело - используйте formatValue с formatId из layout)
 * @deprecated Используйте formatValue(formatId, value) вместо этого
 */
export function formatNumber(value: number, shorten: boolean = true, decimals?: number): string {
  const formatId = `number_${shorten ? "short" : "long"}_${decimals ?? 0}`;
  if (formatsCache[formatId]) {
    return formatValue(formatId, value);
  }
  
  // Запасной вариант - форматирование по умолчанию
  const config: LayoutFormat = {
    kind: "number",
    thousandSeparator: true,
    shorten,
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? (shorten ? 1 : 0),
  };
  formatsCache[formatId] = config;
  return formatValue(formatId, value);
}

/**
 * Форматирует процентное значение (устарело - используйте formatValue с formatId из layout)
 * @deprecated Используйте formatValue(formatId, value) вместо этого
 */
export function formatPercent(value: number, decimals: number = 1): string {
  const formatId = "percent";
  if (formatsCache[formatId]) {
    return formatValue(formatId, value);
  }
  
  // Запасной вариант - форматирование по умолчанию
  const config: LayoutFormat = {
    kind: "percent",
    suffixUnitSymbol: "%",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  formatsCache[formatId] = config;
  return formatValue(formatId, value);
}

/**
 * Форматирует значение изменения со знаком (устарело - используйте formatValue с formatId из layout)
 * @deprecated Используйте formatValue(formatId, value) вместо этого
 */
export function formatChange(value: number, decimals: number = 1): string {
  const sign = value > 0 ? "+" : "";
  return sign + formatPercent(value, decimals);
}

/**
 * Форматирует значение даты
 */
export function formatDate(
  date: Date | string | number,
  format: "short" | "long" | "iso" = "short"
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return "-";
  }

  switch (format) {
    case "iso":
      return d.toISOString().split("T")[0];
    case "long":
      return d.toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "short":
    default:
      return d.toLocaleDateString("ru-RU");
  }
}
