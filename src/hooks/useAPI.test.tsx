import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useLayout,
  useKPICategories,
  useAllKPIs,
  useKPIsByCategory,
  useKPIById,
  useTableData,
  useHealth,
} from "./useAPI";
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

  describe("useKPICategories", () => {
    it("should fetch KPI categories successfully", async () => {
      const mockCategories = [{ id: "finance", name: "Финансы", description: "Test" }];

      vi.mocked(api.fetchKPICategories).mockResolvedValueOnce(mockCategories);

      const { result } = renderHook(() => useKPICategories(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCategories);
      expect(api.fetchKPICategories).toHaveBeenCalledTimes(1);
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

  describe("useKPIsByCategory", () => {
    it("should fetch KPIs by category successfully", async () => {
      const mockKPIs = [
        {
          id: "capital",
          value: 8200000000,
          change: 5.2,
          ytdChange: 12.7,
        },
      ];

      vi.mocked(api.fetchKPIsByCategory).mockResolvedValueOnce(mockKPIs);

      const { result } = renderHook(() => useKPIsByCategory("finance"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockKPIs);
      expect(api.fetchKPIsByCategory).toHaveBeenCalledWith("finance");
    });

    it("should not fetch when categoryId is empty", () => {
      const { result } = renderHook(() => useKPIsByCategory(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.fetchKPIsByCategory).not.toHaveBeenCalled();
    });
  });

  describe("useKPIById", () => {
    it("should fetch KPI by ID successfully", async () => {
      const mockKPI = {
        id: "capital",
        value: 8200000000,
        change: 5.2,
        ytdChange: 12.7,
      };

      vi.mocked(api.fetchKPIById).mockResolvedValueOnce(mockKPI);

      const { result } = renderHook(() => useKPIById("capital"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockKPI);
      expect(api.fetchKPIById).toHaveBeenCalledWith("capital");
    });

    it("should not fetch when id is empty", () => {
      const { result } = renderHook(() => useKPIById(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(api.fetchKPIById).not.toHaveBeenCalled();
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
