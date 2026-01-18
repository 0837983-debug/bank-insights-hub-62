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
 * Парсинг даты из разных форматов
 * Поддерживает:
 * - YYYY-MM-DD (стандартный формат)
 * - DD.MM.YYYY (российский формат)
 * - DD/MM/YYYY (международный формат)
 * - MM/DD/YYYY (американский формат)
 * 
 * @param dateString - строка с датой
 * @returns Date объект или null, если парсинг не удался
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") {
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
