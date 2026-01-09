/**
 * React Query hooks for API communication
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  fetchLayout,
  fetchKPICategories,
  fetchAllKPIs,
  fetchKPIsByCategory,
  fetchKPIById,
  fetchTableData,
  fetchGroupingOptions,
  fetchChartData,
  fetchHealth,
  type Layout,
  type KPICategory,
  type KPIMetric,
  type TableData,
  type GroupingOption,
  type ChartData,
  type HealthStatus,
} from "@/lib/api";

// Query Keys
export const queryKeys = {
  layout: ["layout"] as const,
  kpiCategories: ["kpi", "categories"] as const,
  allKPIs: ["kpi", "all"] as const,
  kpisByCategory: (categoryId: string) => ["kpi", "category", categoryId] as const,
  kpiById: (id: string) => ["kpi", "detail", id] as const,
  tableData: (tableId: string, params?: Record<string, unknown>) =>
    ["table", tableId, params] as const,
  groupingOptions: (tableId: string) => ["table", tableId, "grouping-options"] as const,
  chartData: (chartId: string) => ["chart", chartId] as const,
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

export function useKPICategories(
  options?: Omit<UseQueryOptions<KPICategory[]>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.kpiCategories,
    queryFn: fetchKPICategories,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useAllKPIs(options?: Omit<UseQueryOptions<KPIMetric[]>, "queryKey" | "queryFn">) {
  const isDev = import.meta.env.DEV;
  return useQuery({
    queryKey: queryKeys.allKPIs,
    queryFn: fetchAllKPIs,
    staleTime: isDev ? 0 : 1 * 60 * 1000, // Dev: 0ms, Prod: 1 minute
    ...options,
  });
}

export function useKPIsByCategory(
  categoryId: string,
  options?: Omit<UseQueryOptions<KPIMetric[]>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.kpisByCategory(categoryId),
    queryFn: () => fetchKPIsByCategory(categoryId),
    staleTime: 1 * 60 * 1000,
    enabled: !!categoryId,
    ...options,
  });
}

export function useKPIById(
  id: string,
  options?: Omit<UseQueryOptions<KPIMetric>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.kpiById(id),
    queryFn: () => fetchKPIById(id),
    staleTime: 1 * 60 * 1000,
    enabled: !!id,
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

export function useGroupingOptions(
  tableId: string,
  options?: Omit<UseQueryOptions<GroupingOption[]>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.groupingOptions(tableId),
    queryFn: () => fetchGroupingOptions(tableId),
    staleTime: 5 * 60 * 1000, // 5 minutes - grouping options rarely change
    enabled: !!tableId,
    ...options,
  });
}

// ============================================================================
// Chart Data Hooks
// ============================================================================

export function useChartData(
  chartId: string,
  options?: Omit<UseQueryOptions<ChartData>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.chartData(chartId),
    queryFn: () => fetchChartData(chartId),
    staleTime: 1 * 60 * 1000,
    enabled: !!chartId,
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
