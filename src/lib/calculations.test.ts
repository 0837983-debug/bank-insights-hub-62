import { describe, it, expect } from "vitest";
import { calculatePercentChange, calculateRowPercentage, executeCalculation } from "./calculations";

describe("calculatePercentChange", () => {
  it("должен возвращать корректные значения для нормальных данных", () => {
    const result = calculatePercentChange(1100, 1000, 900);
    
    expect(result.ppDiff).toBe(100); // 1100 - 1000
    expect(result.ppPercent).toBe(0.1); // (1100 - 1000) / 1000 = 0.1 (10%)
    expect(result.ytdDiff).toBe(200); // 1100 - 900
    expect(result.ytdPercent).toBeCloseTo(0.2222, 4); // (1100 - 900) / 900 ≈ 0.2222 (22.22%)
  });

  it("должен обрабатывать null/undefined значения", () => {
    const result1 = calculatePercentChange(null, 1000, 900);
    expect(result1.ppDiff).toBe(-1000);
    expect(result1.ppPercent).toBe(-1);
    expect(result1.ytdDiff).toBe(-900);
    expect(result1.ytdPercent).toBe(-1);

    const result2 = calculatePercentChange(1100, undefined, null);
    expect(result2.ppDiff).toBe(1100);
    expect(result2.ppPercent).toBe(0); // Деление на ноль
    expect(result2.ytdDiff).toBe(0);
    expect(result2.ytdPercent).toBe(0);
  });

  it("должен обрабатывать деление на ноль для previous", () => {
    const result = calculatePercentChange(100, 0, 50);
    
    expect(result.ppDiff).toBe(100);
    expect(result.ppPercent).toBe(0); // Избегаем деления на ноль
    expect(result.ytdDiff).toBe(50);
    expect(result.ytdPercent).toBe(1); // 50 / 50 = 1
  });

  it("должен обрабатывать деление на ноль для previousYear", () => {
    const result = calculatePercentChange(100, 50, 0);
    
    expect(result.ppDiff).toBe(50);
    expect(result.ppPercent).toBe(1); // 50 / 50 = 1
    expect(result.ytdDiff).toBe(0);
    expect(result.ytdPercent).toBe(0); // Избегаем деления на ноль
  });

  it("должен округлять проценты до 4 знаков после запятой", () => {
    const result = calculatePercentChange(1000, 300, 200);
    
    // ppPercent = (1000 - 300) / 300 = 2.3333...
    expect(result.ppPercent).toBe(2.3333);
    
    // ytdPercent = (1000 - 200) / 200 = 4.0
    expect(result.ytdPercent).toBe(4);
  });

  it("должен обрабатывать отрицательные значения", () => {
    const result = calculatePercentChange(-100, -200, -300);
    
    expect(result.ppDiff).toBe(100); // -100 - (-200) = 100
    expect(result.ppPercent).toBe(-0.5); // 100 / (-200) = -0.5
    expect(result.ytdDiff).toBe(200); // -100 - (-300) = 200
    expect(result.ytdPercent).toBeCloseTo(-0.6667, 4); // 200 / (-300) ≈ -0.6667
  });

  it("должен обрабатывать случай, когда все значения равны нулю", () => {
    const result = calculatePercentChange(0, 0, 0);
    
    expect(result.ppDiff).toBe(0);
    expect(result.ppPercent).toBe(0);
    expect(result.ytdDiff).toBe(0);
    expect(result.ytdPercent).toBe(0);
  });

  it("должен обрабатывать случай без previousYear", () => {
    const result = calculatePercentChange(100, 50);
    
    expect(result.ppDiff).toBe(50);
    expect(result.ppPercent).toBe(1);
    expect(result.ytdDiff).toBe(0);
    expect(result.ytdPercent).toBe(0);
  });
});

describe("calculateRowPercentage", () => {
  it("должен возвращать корректный процент от родителя", () => {
    const result = calculateRowPercentage(50, 200);
    expect(result).toBe(25); // 50 составляет 25% от 200
  });

  it("должен обрабатывать null/undefined значения", () => {
    const result1 = calculateRowPercentage(null, 200);
    expect(result1).toBe(0);

    const result2 = calculateRowPercentage(50, undefined);
    expect(result2).toBe(0);
  });

  it("должен обрабатывать деление на ноль (parentTotal = 0)", () => {
    const result = calculateRowPercentage(50, 0);
    expect(result).toBe(0);
  });

  it("должен округлять до 2 знаков после запятой", () => {
    const result = calculateRowPercentage(33, 100);
    expect(result).toBe(33); // 33%
  });

  it("должен обрабатывать дробные значения", () => {
    const result = calculateRowPercentage(33.333, 100);
    expect(result).toBe(33.33); // Округление до 2 знаков
  });

  it("должен обрабатывать большие числа", () => {
    const result = calculateRowPercentage(1000000, 2000000);
    expect(result).toBe(50);
  });

  it("должен обрабатывать значения больше 100%", () => {
    const result = calculateRowPercentage(150, 100);
    expect(result).toBe(150); // 150% от 100
  });

  it("должен обрабатывать отрицательные значения", () => {
    const result = calculateRowPercentage(-50, 200);
    expect(result).toBe(-25); // -50 составляет -25% от 200
  });
});

describe("executeCalculation", () => {
  describe("percent_change", () => {
    it("должен корректно рассчитывать процентное изменение", () => {
      const result = executeCalculation(
        { type: "percent_change", current: "value", base: "ppValue" },
        { value: 1100, ppValue: 1000 }
      );
      expect(result).toBe(0.1); // (1100 - 1000) / 1000 = 0.1 (10%)
    });

    it("должен возвращать 0 при делении на ноль", () => {
      const result = executeCalculation(
        { type: "percent_change", current: "value", base: "ppValue" },
        { value: 100, ppValue: 0 }
      );
      expect(result).toBe(0);
    });

    it("должен обрабатывать отрицательные изменения", () => {
      const result = executeCalculation(
        { type: "percent_change", current: "value", base: "ppValue" },
        { value: 900, ppValue: 1000 }
      );
      expect(result).toBe(-0.1); // (900 - 1000) / 1000 = -0.1 (-10%)
    });

    it("должен округлять до 4 знаков после запятой", () => {
      const result = executeCalculation(
        { type: "percent_change", current: "value", base: "ppValue" },
        { value: 1000, ppValue: 300 }
      );
      expect(result).toBe(2.3333); // (1000 - 300) / 300 ≈ 2.3333
    });
  });

  describe("diff", () => {
    it("должен корректно рассчитывать разницу", () => {
      const result = executeCalculation(
        { type: "diff", minuend: "value", subtrahend: "ppValue" },
        { value: 1100, ppValue: 1000 }
      );
      expect(result).toBe(100); // 1100 - 1000
    });

    it("должен обрабатывать отрицательную разницу", () => {
      const result = executeCalculation(
        { type: "diff", minuend: "value", subtrahend: "ppValue" },
        { value: 900, ppValue: 1000 }
      );
      expect(result).toBe(-100); // 900 - 1000
    });

    it("должен обрабатывать отсутствующие поля", () => {
      const result = executeCalculation(
        { type: "diff", minuend: "value", subtrahend: "nonexistent" },
        { value: 100 }
      );
      expect(result).toBe(100); // 100 - 0
    });
  });

  describe("ratio", () => {
    it("должен корректно рассчитывать отношение", () => {
      const result = executeCalculation(
        { type: "ratio", numerator: "value", denominator: "total" },
        { value: 25, total: 100 }
      );
      expect(result).toBe(0.25);
    });

    it("должен возвращать 0 при делении на ноль", () => {
      const result = executeCalculation(
        { type: "ratio", numerator: "value", denominator: "total" },
        { value: 100, total: 0 }
      );
      expect(result).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("должен возвращать undefined для неизвестного типа", () => {
      const result = executeCalculation(
        { type: "unknown" as any },
        { value: 100 }
      );
      expect(result).toBeUndefined();
    });

    it("должен обрабатывать строковые числа", () => {
      const result = executeCalculation(
        { type: "diff", minuend: "value", subtrahend: "ppValue" },
        { value: "100", ppValue: "50" }
      );
      expect(result).toBe(50);
    });

    it("должен обрабатывать null/undefined значения как 0", () => {
      const result = executeCalculation(
        { type: "diff", minuend: "value", subtrahend: "ppValue" },
        { value: 100, ppValue: null }
      );
      expect(result).toBe(100); // 100 - 0
    });
  });
});
