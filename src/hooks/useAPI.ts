/**
 * React Query hooks for API communication
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  fetchLayout,
  fetchAllKPIs,
  fetchTableData,
  fetchHealth,
  type Layout,
  type KPIMetric,
  type TableData,
  type HealthStatus,
} from "@/lib/api";

// Query Keys
export const queryKeys = {
  layout: ["layout"] as const,
  allKPIs: ["kpi", "all"] as const,
  tableData: (tableId: string, params?: Record<string, unknown>) =>
    ["table", tableId, params] as const,
  health: ["health"] as const,
};

// ============================================================================
// Layout Hooks
// ============================================================================

export function useLayout(options?: Omit<UseQueryOptions<Layout>, "queryKey" | "queryFn">) {
  const isDev = import.meta.env.DEV;
  return useQuery({
    queryKey: queryKeys.layout,
    queryFn: fetchLayout,
    staleTime: isDev ? 0 : 5 * 60 * 1000, // Dev: 0ms, Prod: 5 minutes
    ...options,
  });
}

// ============================================================================
// KPI Hooks
// ============================================================================

export function useAllKPIs(options?: Omit<UseQueryOptions<KPIMetric[]>, "queryKey" | "queryFn">) {
  const isDev = import.meta.env.DEV;
  return useQuery({
    queryKey: queryKeys.allKPIs,
    queryFn: fetchAllKPIs,
    staleTime: isDev ? 0 : 1 * 60 * 1000, // Dev: 0ms, Prod: 1 minute
    ...options,
  });
}

// ============================================================================
// Table Data Hooks
// ============================================================================

export function useTableData(
  tableId: string,
  params?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: string | string[];
  },
  options?: Omit<UseQueryOptions<TableData>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.tableData(tableId, params),
    queryFn: () => fetchTableData(tableId, params),
    staleTime: 1 * 60 * 1000,
    enabled: !!tableId,
    ...options,
  });
}

// ============================================================================
// Health Check Hook
// ============================================================================

export function useHealth(options?: Omit<UseQueryOptions<HealthStatus>, "queryKey" | "queryFn">) {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: fetchHealth,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    ...options,
  });
}
