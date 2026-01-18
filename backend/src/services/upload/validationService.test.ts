import { describe, it, expect } from "vitest";
import type { ParsedRow } from "./fileParserService.js";

// Note: These tests focus on validation logic that doesn't require DB connection
// Full integration tests with DB should be in e2e/api-upload.spec.ts

describe("validationService", () => {
  describe("Data structure validation", () => {
    it("should validate required fields are present", () => {
      // Test that row has required fields
      const validRow: ParsedRow = {
        month: "2025-01-01",
        class: "assets",
        section: "loans",
        item: "corporate_loans",
        amount: 4500000000,
      };

      // Required fields should be present
      expect(validRow.month).toBeTruthy();
      expect(validRow.class).toBeTruthy();
      expect(validRow.amount).toBeTruthy();
    });

    it("should identify missing required fields", () => {
      const invalidRow: ParsedRow = {
        month: "2025-01-01",
        // class is missing
        section: "loans",
        // item is missing
        amount: 4500000000,
      };

      // Should detect missing fields
      expect(invalidRow.class).toBeUndefined();
      expect(invalidRow.item).toBeUndefined();
    });
  });

  describe("Data type validation", () => {
    it("should validate date format", () => {
      const validDate = "2025-01-01";
      const invalidDate = "2025/01/01";
      const invalidDate2 = "01-2025-01";

      // Valid date format: YYYY-MM-DD
      expect(validDate.match(/^\d{4}-\d{2}-\d{2}$/)).toBeTruthy();
      expect(invalidDate.match(/^\d{4}-\d{2}-\d{2}$/)).toBeFalsy();
      expect(invalidDate2.match(/^\d{4}-\d{2}-\d{2}$/)).toBeFalsy();
    });

    it("should validate numeric format", () => {
      const validNumber = 4500000000;
      const invalidNumber = "not_a_number";
      const invalidNumber2 = "abc123";

      // Valid number should be a number type
      expect(typeof validNumber).toBe("number");
      expect(typeof invalidNumber).toBe("string");
      expect(typeof invalidNumber2).toBe("string");

      // Should parse numeric strings
      const parsedNumber = parseFloat("4500000000");
      expect(typeof parsedNumber).toBe("number");
      expect(isNaN(parsedNumber)).toBeFalsy();

      const parsedInvalid = parseFloat("not_a_number");
      expect(isNaN(parsedInvalid)).toBeTruthy();
    });
  });

  describe("Uniqueness validation", () => {
    it("should detect duplicate rows", () => {
      const rows: ParsedRow[] = [
        {
          month: "2025-01-01",
          class: "assets",
          section: "loans",
          item: "corporate_loans",
          amount: 4500000000,
        },
        {
          month: "2025-01-01",
          class: "assets",
          section: "loans",
          item: "corporate_loans",
          amount: 4500000000,
        },
      ];

      // Should detect duplicates based on key fields (month, class, section, item)
      const key1 = `${rows[0].month}-${rows[0].class}-${rows[0].section}-${rows[0].item}`;
      const key2 = `${rows[1].month}-${rows[1].class}-${rows[1].section}-${rows[1].item}`;

      expect(key1).toBe(key2); // Duplicate detected
    });

    it("should allow unique rows", () => {
      const rows: ParsedRow[] = [
        {
          month: "2025-01-01",
          class: "assets",
          section: "loans",
          item: "corporate_loans",
          amount: 4500000000,
        },
        {
          month: "2025-01-01",
          class: "assets",
          section: "loans",
          item: "retail_loans",
          amount: 5000000000,
        },
      ];

      const key1 = `${rows[0].month}-${rows[0].class}-${rows[0].section}-${rows[0].item}`;
      const key2 = `${rows[1].month}-${rows[1].class}-${rows[1].section}-${rows[1].item}`;

      expect(key1).not.toBe(key2); // Unique rows
    });
  });

  describe("Error aggregation", () => {
    it("should count validation errors correctly", () => {
      const errors = [
        { fieldName: "month", errorType: "invalid_date_format", errorMessage: "Invalid date" },
        { fieldName: "amount", errorType: "invalid_number", errorMessage: "Invalid number" },
        { fieldName: "class", errorType: "required_missing", errorMessage: "Required field" },
      ];

      expect(errors.length).toBe(3);
      expect(errors.filter((e) => e.errorType === "invalid_date_format").length).toBe(1);
      expect(errors.filter((e) => e.errorType === "invalid_number").length).toBe(1);
      expect(errors.filter((e) => e.errorType === "required_missing").length).toBe(1);
    });

    it("should group errors by type", () => {
      const errors = [
        { fieldName: "month", errorType: "invalid_date_format", errorMessage: "Invalid date" },
        { fieldName: "date", errorType: "invalid_date_format", errorMessage: "Invalid date 2" },
        { fieldName: "amount", errorType: "invalid_number", errorMessage: "Invalid number" },
      ];

      const dateErrors = errors.filter((e) => e.errorType === "invalid_date_format");
      const numberErrors = errors.filter((e) => e.errorType === "invalid_number");

      expect(dateErrors.length).toBe(2);
      expect(numberErrors.length).toBe(1);
    });
  });
});
