import { describe, it, expect } from "vitest";
import { formatDateForSQL, getPeriodDates } from "../periodService.js";

describe("periodService", () => {
  describe("formatDateForSQL", () => {
    it("должен форматировать дату в формат YYYY-MM-DD", () => {
      const date = new Date("2025-12-01");
      const result = formatDateForSQL(date);
      expect(result).toBe("2025-12-01");
    });

    it("должен корректно форматировать дату с однозначными месяцами и днями", () => {
      const date = new Date("2025-01-05");
      const result = formatDateForSQL(date);
      expect(result).toBe("2025-01-05");
    });

    it("должен корректно форматировать дату с двузначными месяцами и днями", () => {
      const date = new Date("2025-12-31");
      const result = formatDateForSQL(date);
      expect(result).toBe("2025-12-31");
    });

    it("должен корректно форматировать дату високосного года", () => {
      const date = new Date("2024-02-29");
      const result = formatDateForSQL(date);
      expect(result).toBe("2024-02-29");
    });

    it("должен корректно форматировать дату с временем (игнорирует время)", () => {
      const date = new Date("2025-12-01T15:30:45.123Z");
      const result = formatDateForSQL(date);
      expect(result).toBe("2025-12-01");
    });
  });

  describe("getPeriodDates", () => {
    it("должен возвращать захардкоженные даты для тестирования", async () => {
      const result = await getPeriodDates();

      expect(result).toHaveProperty("current");
      expect(result).toHaveProperty("previousMonth");
      expect(result).toHaveProperty("previousYear");

      // Проверка захардкоженных дат
      expect(result.current).toEqual(new Date("2025-12-01"));
      expect(result.previousMonth).toEqual(new Date("2025-11-01"));
      expect(result.previousYear).toEqual(new Date("2024-12-01"));
    });

    it("должен возвращать объект с типом PeriodDates", async () => {
      const result = await getPeriodDates();

      expect(result.current).toBeInstanceOf(Date);
      expect(result.previousMonth).toBeInstanceOf(Date);
      expect(result.previousYear).toBeInstanceOf(Date);
    });

    it("должен возвращать валидные даты", async () => {
      const result = await getPeriodDates();

      expect(result.current).not.toBeNull();
      expect(result.previousMonth).not.toBeNull();
      expect(result.previousYear).not.toBeNull();
      expect(result.current!.getTime()).not.toBeNaN();
      expect(result.previousMonth!.getTime()).not.toBeNaN();
      expect(result.previousYear!.getTime()).not.toBeNaN();
    });
  });
});
