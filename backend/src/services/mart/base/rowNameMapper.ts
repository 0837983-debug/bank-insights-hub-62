/**
 * Maps row_code to human-readable names
 * This should be replaced with data from config.table_rows when available
 */

const rowNameMap: Record<string, string> = {
  // Financial Results - Income
  "i1": "Чистый процентный доход (ЧПД)",
  "i2": "Процентные доходы",
  "i2-1": "Доходы по кредитам ФЛ",
  "i2-2": "Доходы по кредитам ЮЛ",
  "i2-3": "Доходы от размещений",
  "i3": "Процентные расходы",
  "i3-1": "Расходы по депозитам ФЛ",
  "i3-2": "Расходы по депозитам ЮЛ",
  "i3-3": "Прочие процентные расходы",
  "i4": "Чистый комиссионный доход (ЧКД)",
  "i5": "Комиссии международных переводов",
  "i5-1": "Переводы в СНГ",
  "i5-2": "Переводы в Европу",
  "i5-3": "Переводы в Азию",
  "i6": "Комиссии обслуживания",
  "i6-1": "Обслуживание карт",
  "i6-2": "Обслуживание счетов",
  "i6-3": "Прочее обслуживание",
  "i7": "Прочие комиссии",
  "i8": "Доходы по FX",
  "i9": "Спред конвертаций",
  "i9-1": "USD/RUB",
  "i9-2": "EUR/RUB",
  "i9-3": "Прочие пары",
  "i10": "Маржа по FX-операциям",
  "i11": "Доход трейдинга",
  "i12": "Прочие доходы",
  "i13": "Операционные",
  "i14": "Прочие финансовые",

  // Financial Results - Expenses
  "e1": "Операционные расходы (OPEX)",
  "e2": "Фонд оплаты труда",
  "e3": "IT расходы",
  "e4": "Административные расходы",
  "e5": "Резервы",
  "e6": "Налог на прибыль",
  
  // Balance - Assets
  "a1": "Активы",
  "a2": "Денежные средства",
  "a3": "Кредиты клиентам",
  "a4": "Ценные бумаги",
  "a5": "Основные средства",
  
  // Balance - Liabilities
  "l1": "Пассивы",
  "l2": "Депозиты клиентов",
  "l3": "Заёмные средства",
  "l4": "Капитал",
};

/**
 * Get human-readable name for row_code
 */
export function getRowName(rowCode: string): string {
  return rowNameMap[rowCode] || rowCode;
}

/**
 * Determine if row_code represents a group (based on naming pattern)
 */
export function isRowGroup(rowCode: string): boolean {
  // Groups are typically single-level codes like "i1", "i2", "i4", "e1"
  // Children have dashes like "i2-1", "i2-2"
  return !rowCode.includes("-");
}

/**
 * Get parent_id from row_code (for hierarchical structure)
 */
export function getParentId(rowCode: string): string | undefined {
  // Extract parent from codes like "i2-1" -> "i2"
  const parts = rowCode.split("-");
  if (parts.length > 1) {
    return parts[0];
  }
  return undefined;
}

/**
 * Get sort order based on row_code pattern
 */
export function getSortOrder(rowCode: string): number {
  // Extract numeric prefix (i1 -> 1, i2 -> 2, i2-1 -> 201)
  const match = rowCode.match(/^[a-z](\d+)/);
  if (match) {
    const base = parseInt(match[1]) * 1000;
    // Add sub-level if exists (i2-1 -> 2001)
    const subMatch = rowCode.match(/-(\d+)$/);
    if (subMatch) {
      return base + parseInt(subMatch[1]);
    }
    return base;
  }
  return 0;
}
