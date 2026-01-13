/**
 * Calculate percentage change between current and previous value
 * Returns rounded to 2 decimal places
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0 || previous === null || previous === undefined) {
    return 0;
  }
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 100) / 100;
}

/**
 * Calculate percentage of value relative to total
 * Returns rounded to 4 decimal places (for percentages like 51.2345%)
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0 || total === null || total === undefined) {
    return 0;
  }
  const percentage = (value / total) * 100;
  return Math.round(percentage * 10000) / 10000;
}

/**
 * Calculate Year-to-Date change
 */
export function calculateYTDChange(current: number, ytdValue: number): number {
  return calculateChange(current, ytdValue);
}

/**
 * Aggregate (sum) array of values
 */
export function aggregateValues(values: number[]): number {
  return values.reduce((sum, val) => sum + (val || 0), 0);
}

/**
 * Round number to specified decimal places
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
