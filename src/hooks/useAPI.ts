/**
 * React Query hooks for API communication
 */

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  fetchLayout,
  fetchAllKPIs,
  fetchHealth,
  getData,
  type Layout,
  type KPIMetric,
  type HealthStatus,
  type GetDataParams,
  type GetDataResponse,
  type FetchKPIsParams,
} from "@/lib/api";

// Query Keys
export const queryKeys = {
  layout: ["layout"] as const,
  allKPIs: ["kpi", "all"] as const,
  health: ["health"] as const,
  getData: (queryId: string, params?: GetDataParams) =>
    ["getData", queryId, params] as const,
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

export function useAllKPIs(
  params?: FetchKPIsParams,
  options?: Omit<UseQueryOptions<KPIMetric[]>, "queryKey" | "queryFn">
) {
  const isDev = import.meta.env.DEV;
  return useQuery({
    queryKey: [...queryKeys.allKPIs, params] as const,
    queryFn: () => fetchAllKPIs(params),
    staleTime: isDev ? 0 : 1 * 60 * 1000, // Dev: 0ms, Prod: 1 minute
    enabled: options?.enabled !== undefined ? options.enabled : true,
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

// ============================================================================
// GetData Hook
// ============================================================================

export function useGetData(
  queryId: string | null,
  params?: GetDataParams,
  options?: Omit<UseQueryOptions<GetDataResponse>, "queryKey" | "queryFn"> & {
    componentId?: string;
  }
) {
  const componentId = options?.componentId;
  // enabled должен проверять и queryId, и componentId (обязательные параметры)
  const defaultEnabled = !!queryId && !!componentId;
  return useQuery({
    queryKey: queryKeys.getData(queryId || "", params),
    queryFn: () => getData(queryId!, params, componentId),
    enabled: options?.enabled !== undefined ? options.enabled : defaultEnabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
}
