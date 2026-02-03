import { describe, it, expect } from "vitest";
import { transformTableData } from "../DynamicDashboard";
import type { TableData, FieldType, CalculationConfig } from "@/lib/api";

// Helper type for test columns
interface TestColumn {
  id: string;
  fieldType?: FieldType;
  calculationConfig?: CalculationConfig;
  sub_columns?: TestColumn[];
}

describe("transformTableData", () => {
  describe("с columns из layout (универсальный режим)", () => {
    it("должен корректно обработать balance данные (class → section → item → sub_item)", () => {
      const apiData: TableData = {
        rows: [
          { id: "1", class: "Активы", section: "Денежные средства", item: "Касса", value: 1000, previousValue: 900, ytdValue: 800 },
          { id: "2", class: "Активы", section: "Денежные средства", item: "Расчётный счёт", value: 2000, previousValue: 1800, ytdValue: 1600 },
          { id: "3", class: "Активы", section: "Кредиты", item: "Корпоративные", value: 5000, previousValue: 4500, ytdValue: 4000 },
        ],
        columns: [],
      };

      const columns: TestColumn[] = [
        { id: "class", fieldType: 'dimension' },
        { id: "section", fieldType: 'dimension' },
        { id: "item", fieldType: 'dimension' },
        { id: "sub_item", fieldType: 'dimension' },
        { id: "value", fieldType: 'measure' },
        { id: "previousValue", fieldType: 'measure' },
        { id: "ytdValue", fieldType: 'measure' },
      ];

      const result = transformTableData(apiData, columns);

      // Проверяем что группы созданы
      const groups = result.filter(r => r.isGroup);
      const leaves = result.filter(r => !r.isGroup);

      expect(leaves).toHaveLength(3);
      expect(groups.length).toBeGreaterThan(0);

      // Проверяем агрегацию для группы "Активы"
      const aktivyGroup = groups.find(g => g.class === "Активы" && !g.section);
      expect(aktivyGroup).toBeDefined();
      expect(aktivyGroup?.value).toBe(8000); // 1000 + 2000 + 5000
      expect((aktivyGroup as any)?.previousValue).toBe(7200); // 900 + 1800 + 4500
      expect((aktivyGroup as any)?.ytdValue).toBe(6400); // 800 + 1600 + 4000

      // Проверяем агрегацию для группы "Денежные средства"
      const cashGroup = groups.find(g => g.section === "Денежные средства" && !g.item);
      expect(cashGroup).toBeDefined();
      expect(cashGroup?.value).toBe(3000); // 1000 + 2000
    });

    it("должен корректно обработать fin_results данные (class → category → item → subitem)", () => {
      const apiData: TableData = {
        rows: [
          { id: "1", class: "Доходы", category: "Процентные", item: "Кредиты ФЛ", value: 500, ppValue: 450, pyValue: 400 },
          { id: "2", class: "Доходы", category: "Процентные", item: "Кредиты ЮЛ", value: 800, ppValue: 750, pyValue: 700 },
          { id: "3", class: "Расходы", category: "Операционные", item: "Зарплата", value: 200, ppValue: 190, pyValue: 180 },
        ],
        columns: [],
      };

      const columns: TestColumn[] = [
        { id: "class", fieldType: 'dimension' },
        { id: "category", fieldType: 'dimension' },
        { id: "item", fieldType: 'dimension' },
        { id: "subitem", fieldType: 'dimension' },
        { id: "value", fieldType: 'measure' },
        { id: "ppValue", fieldType: 'measure' },
        { id: "pyValue", fieldType: 'measure' },
      ];

      const result = transformTableData(apiData, columns);

      const groups = result.filter(r => r.isGroup);
      const leaves = result.filter(r => !r.isGroup);

      expect(leaves).toHaveLength(3);

      // Проверяем агрегацию для группы "Доходы"
      const incomeGroup = groups.find(g => g.class === "Доходы" && !(g as any).category);
      expect(incomeGroup).toBeDefined();
      expect(incomeGroup?.value).toBe(1300); // 500 + 800

      // Проверяем агрегацию для группы "Процентные"
      const interestGroup = groups.find(g => (g as any).category === "Процентные" && !g.item);
      expect(interestGroup).toBeDefined();
      expect(interestGroup?.value).toBe(1300);
    });
  });

  describe("без columns (обратная совместимость)", () => {
    it("должен использовать дефолтную иерархию class → section → item → sub_item", () => {
      const apiData: TableData = {
        rows: [
          { id: "1", class: "Активы", section: "Касса", value: 1000 },
          { id: "2", class: "Активы", section: "Счета", value: 2000 },
        ],
        columns: [],
      };

      // Вызываем без columns
      const result = transformTableData(apiData);

      const groups = result.filter(r => r.isGroup);
      expect(groups.length).toBeGreaterThan(0);

      // Должна быть группа "Активы"
      const aktivyGroup = groups.find(g => g.class === "Активы" && !g.section);
      expect(aktivyGroup).toBeDefined();
      expect(aktivyGroup?.value).toBe(3000);
    });
  });

  describe("edge cases", () => {
    it("должен возвращать пустой массив для пустых данных", () => {
      const apiData: TableData = { rows: [], columns: [] };
      const result = transformTableData(apiData);
      expect(result).toEqual([]);
    });

    it("должен корректно обрабатывать null/undefined значения в dimension полях", () => {
      const apiData: TableData = {
        rows: [
          { id: "1", class: "Активы", section: null, item: undefined, value: 1000 },
          { id: "2", class: "Активы", section: "Счета", value: 2000 },
        ],
        columns: [],
      };

      const columns: TestColumn[] = [
        { id: "class", fieldType: 'dimension' },
        { id: "section", fieldType: 'dimension' },
        { id: "item", fieldType: 'dimension' },
        { id: "value", fieldType: 'measure' },
      ];

      const result = transformTableData(apiData, columns);

      // Не должно падать
      expect(result.length).toBeGreaterThan(0);
    });

    it("должен рассчитывать ppChange и ytdChange для групп", () => {
      const apiData: TableData = {
        rows: [
          { id: "1", class: "Активы", value: 1000, previousValue: 800, ytdValue: 500 },
        ],
        columns: [],
      };

      const columns: TestColumn[] = [
        { id: "class", fieldType: 'dimension' },
        { id: "value", fieldType: 'measure' },
        { id: "previousValue", fieldType: 'measure' },
        { id: "ytdValue", fieldType: 'measure' },
        // Добавляем calculated поля с calculationConfig
        {
          id: "ppChange",
          fieldType: 'calculated',
          calculationConfig: { type: 'percent_change', current: 'value', base: 'previousValue' }
        },
        {
          id: "ytdChange",
          fieldType: 'calculated',
          calculationConfig: { type: 'percent_change', current: 'value', base: 'ytdValue' }
        },
      ];

      const result = transformTableData(apiData, columns);
      const group = result.find(r => r.isGroup);

      expect(group).toBeDefined();
      expect(group?.ppChange).toBeCloseTo(0.25); // (1000 - 800) / 800 = 0.25
      expect(group?.ytdChange).toBeCloseTo(1); // (1000 - 500) / 500 = 1
    });
  });
});
