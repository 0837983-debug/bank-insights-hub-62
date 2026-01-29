import { describe, it, expect } from "vitest";
import {
  isValidDateFormat,
  excelSerialToDate,
  parseDate,
  formatDateForSQL,
  isValidDateRange,
} from "../dateUtils.js";

describe("dateUtils", () => {
  describe("isValidDateFormat", () => {
    it("должен вернуть true для корректного формата YYYY-MM-DD", () => {
      expect(isValidDateFormat("2025-12-01")).toBe(true);
      expect(isValidDateFormat("2024-01-31")).toBe(true);
      expect(isValidDateFormat("2023-02-28")).toBe(true);
    });

    it("должен вернуть false для некорректного формата", () => {
      expect(isValidDateFormat("2025/12/01")).toBe(false);
      expect(isValidDateFormat("01-12-2025")).toBe(false);
      expect(isValidDateFormat("2025-12-1")).toBe(false);
      expect(isValidDateFormat("25-12-01")).toBe(false);
      expect(isValidDateFormat("invalid")).toBe(false);
      expect(isValidDateFormat("")).toBe(false);
    });

    it("должен вернуть false для несуществующих дат", () => {
      expect(isValidDateFormat("2025-02-30")).toBe(false);
      expect(isValidDateFormat("2025-13-01")).toBe(false);
      expect(isValidDateFormat("2025-00-01")).toBe(false);
    });
  });

  describe("excelSerialToDate", () => {
    it("должен конвертировать Excel serial date в Date", () => {
      // 45292 = 2024-01-01
      const result = excelSerialToDate(45292);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // январь
      expect(result?.getDate()).toBe(1);
    });

    it("должен вернуть null для некорректных значений", () => {
      expect(excelSerialToDate(-1)).toBeNull();
      expect(excelSerialToDate(0)).toBeNull();
      expect(excelSerialToDate(NaN)).toBeNull();
    });

    it("должен игнорировать дробную часть (время)", () => {
      const result1 = excelSerialToDate(45292);
      const result2 = excelSerialToDate(45292.5);
      expect(result1?.getDate()).toBe(result2?.getDate());
    });
  });

  describe("parseDate", () => {
    it("должен парсить YYYY-MM-DD формат", () => {
      const result = parseDate("2025-12-01");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(11); // декабрь
      expect(result?.getDate()).toBe(1);
    });

    it("должен парсить DD.MM.YYYY формат", () => {
      const result = parseDate("01.12.2025");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(11);
      expect(result?.getDate()).toBe(1);
    });

    it("должен парсить Excel serial number", () => {
      const result = parseDate(45292); // 2024-01-01
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });

    it("должен вернуть null для некорректных значений", () => {
      expect(parseDate("invalid")).toBeNull();
      expect(parseDate("")).toBeNull();
      expect(parseDate(null as any)).toBeNull();
      expect(parseDate(undefined as any)).toBeNull();
      expect(parseDate(1000)).toBeNull(); // слишком маленькое число
      expect(parseDate(200000)).toBeNull(); // слишком большое число
    });

    it("должен парсить стандартный Date формат", () => {
      const result = parseDate("2025-12-01T10:00:00Z");
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("formatDateForSQL", () => {
    it("должен форматировать дату в YYYY-MM-DD", () => {
      const date = new Date("2025-12-01");
      const result = formatDateForSQL(date);
      expect(result).toBe("2025-12-01");
    });

    it("должен корректно форматировать даты с однозначными месяцами и днями", () => {
      const date = new Date("2025-01-05");
      const result = formatDateForSQL(date);
      expect(result).toBe("2025-01-05");
    });
  });

  describe("isValidDateRange", () => {
    it("должен вернуть true для дат в допустимом диапазоне", () => {
      const now = new Date();
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      expect(isValidDateRange(lastYear)).toBe(true);
    });

    it("должен вернуть false для дат в будущем (больше чем на год)", () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 2);
      expect(isValidDateRange(future)).toBe(false);
    });

    it("должен вернуть false для слишком старых дат", () => {
      const old = new Date();
      old.setFullYear(old.getFullYear() - 15); // больше 10 лет по умолчанию
      expect(isValidDateRange(old)).toBe(false);
    });

    it("должен использовать кастомный maxAge", () => {
      const old = new Date();
      old.setFullYear(old.getFullYear() - 5);
      expect(isValidDateRange(old, 3)).toBe(false); // maxAge = 3 года
      expect(isValidDateRange(old, 10)).toBe(true); // maxAge = 10 лет
    });
  });
});
