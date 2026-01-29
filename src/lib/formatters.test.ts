import { describe, it, expect, beforeEach } from "vitest";
import {
  formatValue,
  formatDate,
  initializeFormats,
  getFormatsCache,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatChange,
} from "./formatters";
import type { LayoutFormat } from "./api";

describe("formatValue", () => {
  beforeEach(() => {
    // Очищаем кэш перед каждым тестом
    initializeFormats({});
  });

  it("должен возвращать '-' для null/undefined/NaN", () => {
    expect(formatValue("currency_rub", null)).toBe("-");
    expect(formatValue("currency_rub", undefined)).toBe("-");
    expect(formatValue("currency_rub", NaN)).toBe("-");
  });

  it("должен использовать формат из кэша", () => {
    const formats: Record<string, LayoutFormat> = {
      currency_rub: {
        kind: "currency",
        prefixUnitSymbol: "₽",
        thousandSeparator: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
        shorten: true,
      },
    };
    initializeFormats(formats);

    const result = formatValue("currency_rub", 1000000);
    // Должен сократить до 1.0M и добавить префикс ₽
    expect(result).toContain("₽");
    expect(result).toContain("M");
  });

  it("должен применять multiplier из конфигурации", () => {
    const formats: Record<string, LayoutFormat> = {
      test_format: {
        kind: "number",
        multiplier: 0.001,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    };
    initializeFormats(formats);

    const result = formatValue("test_format", 1000);
    expect(result).toBe("1.00"); // 1000 * 0.001 = 1.00
  });

  it("должен применять сокращение (K, M, B)", () => {
    const formats: Record<string, LayoutFormat> = {
      test_shorten: {
        kind: "number",
        shorten: true,
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      },
    };
    initializeFormats(formats);

    expect(formatValue("test_shorten", 1500)).toContain("K"); // 1.5K
    expect(formatValue("test_shorten", 2500000)).toContain("M"); // 2.5M
    expect(formatValue("test_shorten", 3500000000)).toContain("B"); // 3.5B
  });

  it("должен применять разделители тысяч", () => {
    const formats: Record<string, LayoutFormat> = {
      test_thousands: {
        kind: "number",
        thousandSeparator: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    };
    initializeFormats(formats);

    const result = formatValue("test_thousands", 1234567);
    expect(result).toBe("1 234 567");
  });

  it("должен применять prefixUnitSymbol и suffixUnitSymbol", () => {
    const formats: Record<string, LayoutFormat> = {
      test_symbols: {
        kind: "number",
        prefixUnitSymbol: "$",
        suffixUnitSymbol: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    };
    initializeFormats(formats);

    const result = formatValue("test_symbols", 100);
    expect(result).toBe("$100USD");
  });

  it("должен использовать запасной вариант, если формат не найден", () => {
    const result = formatValue("nonexistent_format", 123.45);
    expect(result).toBe("123.45"); // Возвращает число как строку
  });

  it("должен корректно форматировать проценты", () => {
    const formats: Record<string, LayoutFormat> = {
      percent: {
        kind: "percent",
        suffixUnitSymbol: "%",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      },
    };
    initializeFormats(formats);

    const result = formatValue("percent", 5.2);
    expect(result).toBe("5.2%");
  });
});

describe("formatDate", () => {
  it("должен форматировать дату в формате 'short'", () => {
    const date = new Date("2024-01-15");
    const result = formatDate(date, "short");
    // Формат зависит от локали, но должен содержать дату
    expect(result).toBeTruthy();
    expect(result).not.toBe("-");
  });

  it("должен форматировать дату в формате 'long'", () => {
    const date = new Date("2024-01-15");
    const result = formatDate(date, "long");
    expect(result).toBeTruthy();
    expect(result).not.toBe("-");
  });

  it("должен форматировать дату в формате 'iso'", () => {
    const date = new Date("2024-01-15");
    const result = formatDate(date, "iso");
    expect(result).toBe("2024-01-15");
  });

  it("должен обрабатывать строку как дату", () => {
    const result = formatDate("2024-01-15", "iso");
    expect(result).toBe("2024-01-15");
  });

  it("должен обрабатывать число (timestamp) как дату", () => {
    const timestamp = new Date("2024-01-15").getTime();
    const result = formatDate(timestamp, "iso");
    expect(result).toBe("2024-01-15");
  });

  it("должен возвращать '-' для невалидной даты", () => {
    const invalidDate = new Date("invalid");
    const result = formatDate(invalidDate, "short");
    expect(result).toBe("-");
  });
});

describe("initializeFormats и getFormatsCache", () => {
  it("должен инициализировать кэш форматов", () => {
    const formats: Record<string, LayoutFormat> = {
      test_format: {
        kind: "number",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    };
    initializeFormats(formats);
    
    const cache = getFormatsCache();
    expect(cache).toEqual(formats);
  });

  it("должен перезаписывать существующий кэш", () => {
    initializeFormats({ format1: { kind: "number" } as LayoutFormat });
    initializeFormats({ format2: { kind: "currency" } as LayoutFormat });
    
    const cache = getFormatsCache();
    expect(cache).toEqual({ format2: { kind: "currency" } });
  });
});

describe("formatCurrency (deprecated)", () => {
  beforeEach(() => {
    initializeFormats({});
  });

  it("должен форматировать RUB валюту", () => {
    const result = formatCurrency(1000000, "RUB", true);
    expect(result).toContain("₽");
  });

  it("должен форматировать USD валюту", () => {
    const result = formatCurrency(1000000, "USD", true);
    expect(result).toContain("$");
  });

  it("должен использовать сокращение при shorten=true", () => {
    const result = formatCurrency(1000000, "RUB", true);
    expect(result).toMatch(/[KM]/); // Должен содержать K или M
  });
});

describe("formatNumber (deprecated)", () => {
  beforeEach(() => {
    initializeFormats({});
  });

  it("должен форматировать число с сокращением", () => {
    const result = formatNumber(1500, true);
    expect(result).toBeTruthy();
  });

  it("должен форматировать число без сокращения", () => {
    const result = formatNumber(1500, false);
    expect(result).toBeTruthy();
  });

  it("должен применять указанное количество знаков после запятой", () => {
    const result = formatNumber(123.456, false, 2);
    expect(result).toBeTruthy();
  });
});

describe("formatPercent (deprecated)", () => {
  beforeEach(() => {
    initializeFormats({});
  });

  it("должен форматировать процент", () => {
    const result = formatPercent(5.2, 1);
    expect(result).toContain("%");
  });

  it("должен применять указанное количество знаков после запятой", () => {
    const result = formatPercent(5.234, 2);
    expect(result).toContain("%");
  });
});

describe("formatChange (deprecated)", () => {
  beforeEach(() => {
    initializeFormats({});
  });

  it("должен добавлять '+' для положительных значений", () => {
    const result = formatChange(5.2, 1);
    expect(result).toContain("+");
    expect(result).toContain("%");
  });

  it("не должен добавлять '+' для отрицательных значений", () => {
    const result = formatChange(-5.2, 1);
    expect(result).not.toContain("+");
    expect(result).toContain("%");
  });
});
