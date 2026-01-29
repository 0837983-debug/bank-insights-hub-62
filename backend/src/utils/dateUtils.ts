/**
 * Утилиты для работы с датами
 */

/**
 * Валидация формата даты (YYYY-MM-DD)
 * @param dateString - строка с датой
 * @returns true если формат корректный
 */
export function isValidDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return (
    date instanceof Date &&
    !isNaN(date.getTime()) &&
    dateString === date.toISOString().split("T")[0]
  );
}

/**
 * Конвертация Excel serial date в JavaScript Date
 * Excel хранит даты как число дней с 1899-12-30 (включая баг с 1900-02-29)
 * 
 * @param serial - Excel serial number (например, 45292 = 2024-01-01)
 * @returns Date объект или null, если значение некорректно
 */
export function excelSerialToDate(serial: number): Date | null {
  if (typeof serial !== 'number' || isNaN(serial) || serial < 1) {
    return null;
  }
  
  // Excel serial: дни с 1899-12-30 (включая баг с 1900-02-29)
  // JavaScript Date: миллисекунды с 1970-01-01
  // 25569 = количество дней между 1899-12-30 и 1970-01-01
  const millisecondsPerDay = 86400000;
  const excelEpoch = 25569; // 1899-12-30
  
  // Игнорируем дробную часть (время)
  const days = Math.floor(serial);
  
  return new Date((days - excelEpoch) * millisecondsPerDay);
}

/**
 * Парсинг даты из разных форматов
 * Поддерживает:
 * - YYYY-MM-DD (стандартный формат)
 * - DD.MM.YYYY (российский формат)
 * - DD/MM/YYYY (международный формат)
 * - MM/DD/YYYY (американский формат)
 * - Excel serial number (число в диапазоне 30000-100000)
 * 
 * @param dateString - строка с датой или число (Excel serial)
 * @returns Date объект или null, если парсинг не удался
 */
export function parseDate(dateString: string | number): Date | null {
  if (dateString === null || dateString === undefined) {
    return null;
  }
  
  // Если это число, проверяем, похоже ли на Excel serial date
  if (typeof dateString === "number") {
    // Excel serial dates обычно в диапазоне ~1982-2173 (30000-100000)
    if (dateString > 30000 && dateString < 100000) {
      return excelSerialToDate(dateString);
    }
    return null;
  }
  
  if (typeof dateString !== "string") {
    return null;
  }

  // Стандартный формат YYYY-MM-DD
  if (isValidDateFormat(dateString)) {
    return new Date(dateString);
  }

  // DD.MM.YYYY
  const ddmmyyyy = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  const match1 = dateString.match(ddmmyyyy);
  if (match1) {
    const [, day, month, year] = match1;
    return new Date(`${year}-${month}-${day}`);
  }

  // DD/MM/YYYY или MM/DD/YYYY
  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match2 = dateString.match(slash);
  if (match2) {
    const [, part1, part2, year] = match2;
    // Пробуем оба варианта
    const date1 = new Date(`${year}-${part2}-${part1}`); // DD/MM/YYYY
    const date2 = new Date(`${year}-${part1}-${part2}`); // MM/DD/YYYY
    
    // Проверяем, какой формат корректный (дата должна быть валидной)
    if (!isNaN(date1.getTime()) && date1.getDate() === parseInt(part1)) {
      return date1;
    }
    if (!isNaN(date2.getTime()) && date2.getMonth() + 1 === parseInt(part1)) {
      return date2;
    }
  }

  // Пробуем стандартный парсинг Date
  const date = new Date(dateString);
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date;
  }

  return null;
}

/**
 * Форматирование даты в формат YYYY-MM-DD
 * @param date - Date объект
 * @returns строка в формате YYYY-MM-DD
 */
export function formatDateForSQL(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Валидация значения даты (проверка, что дата не в будущем и не слишком старая)
 * @param date - Date объект
 * @param maxAge - максимальный возраст в годах (по умолчанию 10)
 * @returns true если дата валидна
 */
export function isValidDateRange(
  date: Date,
  maxAge: number = 10
): boolean {
  const now = new Date();
  const maxDate = new Date(now.getFullYear() + 1, 11, 31); // Конец следующего года
  const minDate = new Date(now.getFullYear() - maxAge, 0, 1); // Начало года maxAge лет назад

  return date >= minDate && date <= maxDate;
}
