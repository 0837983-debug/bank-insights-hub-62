import { describe, it, expect } from "vitest";
import { validateConfig } from "../validator.js";
import type { QueryConfig } from "../types.js";

describe("Query Config Validator", () => {
  describe("valid config", () => {
    it("should accept valid config with all fields", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [
          { type: "column", field: "class" },
          {
            type: "case_agg",
            func: "sum",
            when: { field: "period_date", op: "=", value: ":p1" },
            then: { field: "value" },
            else: null,
            as: "value",
          },
        ],
        where: {
          op: "and",
          items: [{ field: "class", op: "=", value: ":class" }],
        },
        groupBy: ["class"],
        orderBy: [{ field: "class", direction: "asc" }],
        limit: 100,
        offset: 0,
        params: {
          p1: "2025-08-01",
          class: "assets",
        },
        paramTypes: {
          p1: "date",
          class: "string",
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("invalid identifiers", () => {
    it("should reject invalid schema identifier", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart-; DROP", // Invalid: contains hyphen and semicolon
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        params: {},
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });

    it("should reject invalid table identifier", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "123balance", // Invalid: starts with number
        },
        select: [{ type: "column", field: "class" }],
        params: {},
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });

    it("should reject invalid field identifier", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class-name" }], // Invalid: contains hyphen
        params: {},
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });
  });

  describe("invalid param values", () => {
    it("should reject param value without colon prefix", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [{ field: "class", op: "=", value: "p1" }], // Missing ":"
        },
        params: {
          p1: "assets",
        },
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });

    it("should reject raw values in where", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [{ field: "class", op: "=", value: "assets" }], // Raw value instead of param
        },
        params: {},
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });
  });

  describe("invalid where structure", () => {
    it("should reject nested where groups", () => {
      const config: any = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [
            {
              op: "or", // Nested group - not allowed
              items: [
                { field: "class", op: "=", value: ":class1" },
                { field: "class", op: "=", value: ":class2" },
              ],
            },
          ],
        },
        params: {},
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });
  });

  describe("invalid paramTypes", () => {
    it("should reject unknown param type", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        params: {
          class: "assets",
        },
        paramTypes: {
          class: "unknown_type" as any, // Invalid type
        },
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });
  });

  describe("invalid operators", () => {
    it("should reject unknown where operator", () => {
      const config: any = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        where: {
          op: "and",
          items: [{ field: "class", op: "unknown_op", value: ":class" }],
        },
        params: {
          class: "assets",
        },
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });
  });

  describe("missing required fields", () => {
    it("should reject config without from", () => {
      const config: any = {
        select: [{ type: "column", field: "class" }],
        params: {},
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });

    it("should reject config without select", () => {
      const config: any = {
        from: {
          schema: "mart",
          table: "balance",
        },
        params: {},
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });

    it("should reject config without params", () => {
      const config: any = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });
  });

  describe("invalid limit/offset", () => {
    it("should reject negative limit", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        limit: -1,
        params: {},
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });

    it("should reject negative offset", () => {
      const config: QueryConfig = {
        from: {
          schema: "mart",
          table: "balance",
        },
        select: [{ type: "column", field: "class" }],
        offset: -1,
        params: {},
      };

      expect(() => validateConfig(config)).toThrow("invalid config");
    });
  });
});
