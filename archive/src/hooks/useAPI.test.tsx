import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLayout, useAllKPIs, useTableData, useHealth } from "./useAPI";
import * as api from "@/lib/api";

// Mock the API module
vi.mock("@/lib/api");

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useAPI hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useLayout", () => {
    it("should fetch layout successfully", async () => {
      const mockLayout = {
        formats: { currency_rub: { kind: "number" } },
        sections: [],
      };

      vi.mocked(api.fetchLayout).mockResolvedValueOnce(mockLayout);

      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockLayout);
      expect(api.fetchLayout).toHaveBeenCalledTimes(1);
    });

    it("should handle layout fetch error", async () => {
      const mockError = new Error("Failed to fetch layout");
      vi.mocked(api.fetchLayout).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe("useAllKPIs", () => {
    it("should fetch all KPIs successfully", async () => {
      const mockKPIs = [
        {
          id: "capital",
          value: 8200000000,
          change: 5.2,
          ytdChange: 12.7,
        },
      ];

      vi.mocked(api.fetchAllKPIs).mockResolvedValueOnce(mockKPIs);

      const { result } = renderHook(() => useAllKPIs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockKPIs);
      expect(api.fetchAllKPIs).toHaveBeenCalledTimes(1);
    });
  });

  describe("useTableData", () => {
    it("should fetch table data successfully", async () => {
      const mockTableData = {
        tableId: "income_structure",
        rows: [],
      };

      vi.mocked(api.fetchTableData).mockResolvedValueOnce(mockTableData);

      const { result } = renderHook(() => useTableData("income_structure"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTableData);
      expect(api.fetchTableData).toHaveBeenCalledWith("income_structure", undefined);
    });

    it("should fetch table data with params", async () => {
      const mockTableData = {
        tableId: "income_structure",
        rows: [],
        requestedPeriod: "2025-01-01-2025-12-31",
      };

      vi.mocked(api.fetchTableData).mockResolvedValueOnce(mockTableData);

      const params = {
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      };

      const { result } = renderHook(() => useTableData("income_structure", params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockTableData);
      expect(api.fetchTableData).toHaveBeenCalledWith("income_structure", params);
    });
  });

  describe("useHealth", () => {
    it("should fetch health status successfully", async () => {
      const mockHealth = {
        status: "ok",
        message: "Backend is running",
      };

      vi.mocked(api.fetchHealth).mockResolvedValueOnce(mockHealth);

      const { result } = renderHook(() => useHealth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockHealth);
      expect(api.fetchHealth).toHaveBeenCalledTimes(1);
    });
  });
});
