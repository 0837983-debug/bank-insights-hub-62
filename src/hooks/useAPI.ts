import { useQuery } from "@tanstack/react-query";

// Types
export interface KPI {
  id: string;
  title: string;
  value: string;
  description?: string;
  change?: number;
  ytdChange?: number;
  categoryId?: string;
  iconName?: string;
}

export interface LayoutComponent {
  id: string;
  type: "card" | "table";
  dataSourceKey: string;
  format?: {
    value: string;
  };
}

export interface LayoutSection {
  id: string;
  title: string;
  components: LayoutComponent[];
}

export interface Layout {
  formats: Record<string, unknown>;
  filters?: unknown[];
  sections: LayoutSection[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Fetch all KPIs
export function useAllKPIs() {
  return useQuery<KPI[]>({
    queryKey: ["kpis"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/kpis`);
      if (!response.ok) {
        throw new Error(`Failed to fetch KPIs: ${response.statusText}`);
      }
      return response.json();
    },
  });
}

// Fetch layout
export function useLayout() {
  return useQuery<Layout>({
    queryKey: ["layout"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/layout`);
      if (!response.ok) {
        throw new Error(`Failed to fetch layout: ${response.statusText}`);
      }
      return response.json();
    },
  });
}

// Fetch table data
export function useTableData(tableId: string) {
  return useQuery({
    queryKey: ["tableData", tableId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tables/${tableId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch table ${tableId}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!tableId,
  });
}

// Fetch chart data
export function useChartData(chartId: string) {
  return useQuery({
    queryKey: ["chartData", chartId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/charts/${chartId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch chart ${chartId}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!chartId,
  });
}
