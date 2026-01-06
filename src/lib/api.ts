/**
 * API Client for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// API Error class
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

// ============================================================================
// Layout API
// ============================================================================

export interface LayoutFormat {
  kind: string;
  prefixUnitSymbol?: string;
  suffixUnitSymbol?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  thousandSeparator?: boolean;
  shorten?: boolean;
}

export interface LayoutFilter {
  group: string;
  items: Array<{
    id: string;
    label: string;
    type: string;
    params?: Record<string, unknown>;
  }>;
}

export interface LayoutComponent {
  id: string;
  type: "card" | "table" | "chart";
  title: string;
  tooltip?: string;
  icon?: string;
  dataSourceKey: string;
  format?: Record<string, string>;
  compactDisplay?: boolean;
  columns?: Array<{
    id: string;
    label: string;
    type: string;
    isDimension?: boolean;
    isMeasure?: boolean;
    format?: Record<string, string>;
  }>;
  groupableFields?: string[];
}

export interface LayoutSection {
  id: string;
  title: string;
  components: LayoutComponent[];
}

export interface Layout {
  formats: Record<string, LayoutFormat>;
  filters?: LayoutFilter[];
  sections: LayoutSection[];
}

export async function fetchLayout(): Promise<Layout> {
  return apiFetch<Layout>("/layout");
}

// ============================================================================
// KPI API
// ============================================================================

export interface KPICategory {
  id: string;
  name: string;
  description?: string;
}

export interface KPIMetric {
  id: string;
  title: string;
  value: number;
  description: string;
  change: number;
  ytdChange?: number;
  category: string;
  icon?: string;
}

export async function fetchKPICategories(): Promise<KPICategory[]> {
  return apiFetch<KPICategory[]>("/kpis/categories");
}

export async function fetchAllKPIs(): Promise<KPIMetric[]> {
  return apiFetch<KPIMetric[]>("/kpis");
}

export async function fetchKPIsByCategory(categoryId: string): Promise<KPIMetric[]> {
  return apiFetch<KPIMetric[]>(`/kpis/category/${categoryId}`);
}

export async function fetchKPIById(id: string): Promise<KPIMetric> {
  return apiFetch<KPIMetric>(`/kpis/${id}`);
}

// ============================================================================
// Table Data API
// ============================================================================

export interface TableRow {
  id: string;
  name?: string;
  value?: number;
  percentage?: number;
  change_pptd?: number;
  change_ytd?: number;
  isGroup?: boolean;
  isTotal?: boolean;
  parentId?: string;
  [key: string]: unknown;
}

export interface TableData {
  tableId: string;
  title: string;
  columns: Array<{
    id: string;
    label: string;
    type: string;
  }>;
  rows: TableRow[];
  requestedPeriod?: string;
  groupBy?: string[];
}

export async function fetchTableData(
  tableId: string,
  params?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: string | string[];
  }
): Promise<TableData> {
  const queryParams = new URLSearchParams();
  queryParams.append("tableId", tableId);

  if (params?.dateFrom) queryParams.append("dateFrom", params.dateFrom);
  if (params?.dateTo) queryParams.append("dateTo", params.dateTo);
  if (params?.groupBy) {
    if (Array.isArray(params.groupBy)) {
      params.groupBy.forEach((g) => queryParams.append("groupBy", g));
    } else {
      queryParams.append("groupBy", params.groupBy);
    }
  }

  return apiFetch<TableData>(`/table-data?${queryParams.toString()}`);
}

// ============================================================================
// Chart Data API
// ============================================================================

export interface ChartDataPoint {
  period: string;
  value: number;
  label: string;
}

export interface ChartData {
  chartId: string;
  title: string;
  type: "line" | "bar" | "area";
  data: ChartDataPoint[];
}

export async function fetchChartData(chartId: string): Promise<ChartData> {
  return apiFetch<ChartData>(`/chart-data/${chartId}`);
}

// ============================================================================
// Health Check
// ============================================================================

export interface HealthStatus {
  status: string;
  message: string;
}

export async function fetchHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>("/health");
}
