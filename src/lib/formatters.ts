/**
 * Universal formatting utilities for numbers, currency, and percentages
 * Based on format definitions from layout API
 */

export interface FormatConfig {
  kind: "number" | "currency" | "percent" | "date";
  prefixUnitSymbol?: string;
  suffixUnitSymbol?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  thousandSeparator?: boolean;
  multiplier?: number;
  shorten?: boolean;
  currency?: string;
  pattern?: string;
}

/**
 * Format a number value according to the format configuration
 */
export function formatValue(
  value: number | null | undefined,
  formatConfig?: FormatConfig | string,
  formats?: Record<string, FormatConfig>
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }

  // If formatConfig is a string (format ID), look it up in formats dictionary
  let config: FormatConfig | undefined;
  if (typeof formatConfig === "string") {
    config = formats?.[formatConfig];
  } else {
    config = formatConfig;
  }

  // If no config, return raw number
  if (!config) {
    return value.toString();
  }

  let processedValue = value;

  // Apply multiplier
  if (config.multiplier) {
    processedValue = processedValue * config.multiplier;
  }

  // Handle shortening (K, M, B)
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

  // Format the number
  const minDigits = config.minimumFractionDigits ?? 0;
  const maxDigits = config.maximumFractionDigits ?? 2;
  let formattedNumber = processedValue.toFixed(maxDigits);

  // Remove trailing zeros if not required by minimumFractionDigits
  if (minDigits < maxDigits) {
    formattedNumber = parseFloat(formattedNumber).toFixed(minDigits);
  }

  // Add thousand separators
  if (config.thousandSeparator) {
    const parts = formattedNumber.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    formattedNumber = parts.join(".");
  }

  // Build final string with prefix/suffix
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
 * Format currency value
 */
export function formatCurrency(
  value: number,
  currency: string = "RUB",
  shorten: boolean = true
): string {
  return formatValue(value, {
    kind: "currency",
    prefixUnitSymbol: currency === "RUB" ? "₽" : "$",
    thousandSeparator: true,
    shorten,
    minimumFractionDigits: shorten ? 0 : 2,
    maximumFractionDigits: shorten ? 1 : 2,
  });
}

/**
 * Format number with optional shortening
 */
export function formatNumber(value: number, shorten: boolean = true, decimals?: number): string {
  return formatValue(value, {
    kind: "number",
    thousandSeparator: true,
    shorten,
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? (shorten ? 1 : 0),
  });
}

/**
 * Format percentage value
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return formatValue(value, {
    kind: "percent",
    suffixUnitSymbol: "%",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format change value with sign
 */
export function formatChange(value: number, decimals: number = 1): string {
  const sign = value > 0 ? "+" : "";
  return sign + formatPercent(value, decimals);
}

/**
 * Format date value
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
