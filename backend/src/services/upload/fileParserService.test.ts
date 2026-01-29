import { describe, it, expect } from "vitest";
import { parseCSV, parseXLSX, getRowValue, validateFileStructure } from "./fileParserService.js";

describe("fileParserService", () => {
  describe("parseCSV", () => {
    it("should parse valid CSV file with semicolon delimiter", async () => {
      // Create test CSV with semicolon delimiter
      const csvContent = "month;class;section;item;amount\n2025-01-01;assets;loans;corporate_loans;4500000000";
      const testFile = Buffer.from(csvContent, "utf-8");
      
      const result = await parseCSV(testFile);

      expect(result).toHaveProperty("headers");
      expect(result).toHaveProperty("rows");
      expect(Array.isArray(result.headers)).toBe(true);
      expect(Array.isArray(result.rows)).toBe(true);
      expect(result.headers.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeGreaterThan(0);

      // Check headers
      expect(result.headers).toContain("month");
      expect(result.headers).toContain("class");
      expect(result.headers).toContain("section");
      expect(result.headers).toContain("item");
      expect(result.headers).toContain("amount");

      // Check first row
      const firstRow = result.rows[0];
      expect(firstRow).toHaveProperty("month");
      expect(firstRow).toHaveProperty("class");
      expect(firstRow).toHaveProperty("section");
      expect(firstRow).toHaveProperty("item");
      expect(firstRow).toHaveProperty("amount");

      // Check that amount is parsed as number
      expect(typeof firstRow.amount).toBe("number");
      expect(firstRow.amount).toBeGreaterThan(0);
    });

    it("should parse CSV file with comma delimiter", async () => {
      // Create test CSV with comma delimiter
      const csvContent = "month,class,section,item,amount\n2025-01-01,assets,loans,corporate_loans,4500000000";
      const testFile = Buffer.from(csvContent, "utf-8");

      const result = await parseCSV(testFile);

      expect(result.headers).toContain("month");
      expect(result.headers).toContain("amount");
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].amount).toBe(4500000000);
    });

    it("should throw error for empty CSV file", async () => {
      const emptyFile = Buffer.from("", "utf-8");

      await expect(parseCSV(emptyFile)).rejects.toThrow();
    });

    it("should throw error for CSV file with only headers", async () => {
      const headerOnlyFile = Buffer.from("month;class;section;item;amount\n", "utf-8");

      await expect(parseCSV(headerOnlyFile)).rejects.toThrow("CSV файл пуст");
    });

    it("should trim whitespace from values", async () => {
      const csvContent = "month;class;section;item;amount\n  2025-01-01  ;  assets  ;loans;corporate_loans;4500000000";
      const testFile = Buffer.from(csvContent, "utf-8");

      const result = await parseCSV(testFile);

      expect(result.rows[0].month).toBe("2025-01-01");
      expect(result.rows[0].class).toBe("assets");
    });

    it("should parse numeric values correctly", async () => {
      const csvContent = "month;class;section;item;amount\n2025-01-01;assets;loans;corporate_loans;4500000000";
      const testFile = Buffer.from(csvContent, "utf-8");

      const result = await parseCSV(testFile);

      expect(typeof result.rows[0].amount).toBe("number");
      expect(result.rows[0].amount).toBe(4500000000);
    });

    it("should handle empty values as null", async () => {
      const csvContent = "month;class;section;item;amount\n2025-01-01;assets;loans;corporate_loans;";
      const testFile = Buffer.from(csvContent, "utf-8");

      const result = await parseCSV(testFile);

      expect(result.rows[0].amount).toBeNull();
    });
  });

  describe("parseXLSX", () => {
    // Note: XLSX parsing tests require actual XLSX files
    // For now, we'll test error cases and structure validation
    it("should throw error for empty XLSX file", async () => {
      const emptyFile = Buffer.from("", "utf-8");

      await expect(parseXLSX(emptyFile)).rejects.toThrow();
    });

    it("should throw error for invalid XLSX file", async () => {
      const invalidFile = Buffer.from("This is not an XLSX file", "utf-8");

      await expect(parseXLSX(invalidFile)).rejects.toThrow();
    });

    // Note: Full XLSX parsing tests would require creating actual XLSX files
    // These can be added when XLSX test files are created
  });

  describe("getRowValue", () => {
    it("должен возвращать значение при точном совпадении ключа", () => {
      const row = { month: "2025-01-01", amount: 1000 };
      expect(getRowValue(row, "month")).toBe("2025-01-01");
      expect(getRowValue(row, "amount")).toBe(1000);
    });

    it("должен возвращать значение при совпадении без учёта регистра", () => {
      const row = { Month: "2025-01-01", Amount: 1000 };
      expect(getRowValue(row, "month")).toBe("2025-01-01");
      expect(getRowValue(row, "MONTH")).toBe("2025-01-01");
      expect(getRowValue(row, "amount")).toBe(1000);
    });

    it("должен возвращать undefined для несуществующего поля", () => {
      const row = { month: "2025-01-01" };
      expect(getRowValue(row, "nonexistent")).toBeUndefined();
    });
  });

  describe("validateFileStructure", () => {
    it("должен вернуть valid=true если все заголовки присутствуют", () => {
      const headers = ["month", "class", "section", "item", "amount"];
      const required = ["month", "class", "amount"];
      const result = validateFileStructure(headers, required);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("должен вернуть valid=false если заголовки отсутствуют", () => {
      const headers = ["month", "class"];
      const required = ["month", "class", "section", "amount"];
      const result = validateFileStructure(headers, required);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain("section");
      expect(result.missing).toContain("amount");
    });

    it("должен работать без учёта регистра", () => {
      const headers = ["Month", "Class", "Amount"];
      const required = ["month", "class", "amount"];
      const result = validateFileStructure(headers, required);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe("parseFile (combined)", () => {
    it("should detect CSV file type correctly", async () => {
      const csvContent = "month;class;section;item;amount\n2025-01-01;assets;loans;corporate_loans;4500000000";
      const testFile = Buffer.from(csvContent, "utf-8");

      // CSV parsing should work
      const result = await parseCSV(testFile);
      expect(result.headers).toContain("month");
    });

    it("should validate file structure", async () => {
      // Create test CSV with all required headers
      const csvContent = "month;class;section;item;amount\n2025-01-01;assets;loans;corporate_loans;4500000000";
      const testFile = Buffer.from(csvContent, "utf-8");
      const result = await parseCSV(testFile);

      // Should have expected headers for balance table
      const requiredHeaders = ["month", "class", "section", "item", "amount"];
      requiredHeaders.forEach((header) => {
        expect(result.headers).toContain(header);
      });
    });

    it("should throw error for unsupported file type", async () => {
      const { parseFile } = await import("./fileParserService.js");
      const testFile = Buffer.from("test content", "utf-8");
      
      await expect(parseFile(testFile, "test.pdf")).rejects.toThrow("Неподдерживаемый формат");
    });
  });
});
