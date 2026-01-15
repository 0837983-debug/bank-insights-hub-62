import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { fetchLayout, fetchAllKPIs, fetchTableData, fetchHealth, APIError } from "./api";

// Mock fetch globally
const originalFetch = global.fetch;

beforeAll(() => {
  // Mock environment variable
  vi.stubEnv("VITE_API_URL", "http://localhost:3001/api");
});

afterAll(() => {
  global.fetch = originalFetch;
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API Client", () => {
  describe("fetchHealth", () => {
    it("should fetch health status successfully", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok", message: "Backend is running" }),
      } as Response);

      const result = await fetchHealth();

      expect(result).toEqual({
        status: "ok",
        message: "Backend is running",
      });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/health",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should throw APIError on fetch failure", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error" }),
      } as Response);

      await expect(fetchHealth()).rejects.toThrow(APIError);
    });
  });

  describe("fetchLayout", () => {
    it("should fetch layout successfully", async () => {
      const mockLayout = {
        formats: { currency_rub: { kind: "number" } },
        sections: [{ id: "test", title: "Test Section", components: [] }],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockLayout,
      } as Response);

      const result = await fetchLayout();

      expect(result).toEqual(mockLayout);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/layout",
        expect.any(Object)
      );
    });
  });

  describe("fetchAllKPIs", () => {
    it("should fetch all KPIs successfully", async () => {
      const mockKPIs = [
        {
          id: "capital",
          value: 8200000000,
          change: 5.2,
          ytdChange: 12.7,
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockKPIs,
      } as Response);

      const result = await fetchAllKPIs();

      expect(result).toEqual(mockKPIs);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/kpis",
        expect.any(Object)
      );
    });
  });

  describe("fetchTableData", () => {
    it("should fetch table data without params", async () => {
      const mockTableData = {
        tableId: "income_structure",
        rows: [],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTableData,
      } as Response);

      const result = await fetchTableData("income_structure");

      expect(result).toEqual(mockTableData);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/table-data/income_structure",
        expect.any(Object)
      );
    });

    it("should fetch table data with date params", async () => {
      const mockTableData = {
        tableId: "income_structure",
        rows: [],
        requestedPeriod: "2025-01-01-2025-12-31",
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTableData,
      } as Response);

      const result = await fetchTableData("income_structure", {
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });

      expect(result).toEqual(mockTableData);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/table-data/income_structure?dateFrom=2025-01-01&dateTo=2025-12-31",
        expect.any(Object)
      );
    });

    it("should fetch table data with groupBy param", async () => {
      const mockTableData = {
        tableId: "income_structure",
        rows: [],
        groupBy: ["region"],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTableData,
      } as Response);

      const result = await fetchTableData("income_structure", {
        groupBy: "region",
      });

      expect(result).toEqual(mockTableData);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/table-data/income_structure?groupBy=region",
        expect.any(Object)
      );
    });
  });

  describe("APIError", () => {
    it("should create APIError with message", () => {
      const error = new APIError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("APIError");
      expect(error.status).toBeUndefined();
    });

    it("should create APIError with status and data", () => {
      const errorData = { error: "Not found" };
      const error = new APIError("Test error", 404, errorData);
      expect(error.message).toBe("Test error");
      expect(error.status).toBe(404);
      expect(error.data).toEqual(errorData);
    });
  });
});
