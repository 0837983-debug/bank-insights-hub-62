import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import DynamicDashboard from "./DynamicDashboard";
import * as useAPIHooks from "@/hooks/useAPI";

// Mock the API hooks
vi.mock("@/hooks/useAPI", () => ({
  useLayout: vi.fn(),
  useAllKPIs: vi.fn(),
}));

// Mock Header component to avoid issues
vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe("DynamicDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state", () => {
    vi.mocked(useAPIHooks.useLayout).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    vi.mocked(useAPIHooks.useAllKPIs).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    const { container } = render(<DynamicDashboard />, {
      wrapper: createWrapper(),
    });

    // Should show skeleton loaders (check for skeleton class)
    // The component renders 8 skeletons + 1 for the title = 9 total
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(8);
  });

  it("should show error state when layout fails", () => {
    vi.mocked(useAPIHooks.useLayout).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load layout"),
    } as any);

    vi.mocked(useAPIHooks.useAllKPIs).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<DynamicDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText("Ошибка загрузки данных")).toBeInTheDocument();
    expect(screen.getByText(/Не удалось загрузить layout/)).toBeInTheDocument();
  });

  it("should show error state when KPIs fail", () => {
    vi.mocked(useAPIHooks.useLayout).mockReturnValue({
      data: { sections: [], formats: {} },
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useAPIHooks.useAllKPIs).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load KPIs"),
    } as any);

    render(<DynamicDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText("Ошибка загрузки данных")).toBeInTheDocument();
    expect(screen.getByText(/Не удалось загрузить KPI/)).toBeInTheDocument();
  });

  it("should render dashboard with KPI cards", () => {
    const mockLayout = {
      formats: {
        currency_rub: { kind: "number" },
      },
      sections: [
        {
          id: "financial_results",
          title: "Финансовые результаты",
          components: [
            {
              id: "capital_card",
              type: "card" as const,
              title: "Капитал",
              dataSourceKey: "capital",
              format: { value: "currency_rub" },
            },
            {
              id: "ebitda_card",
              type: "card" as const,
              title: "EBITDA",
              dataSourceKey: "ebitda",
              format: { value: "currency_rub" },
            },
          ],
        },
      ],
    };

    const mockKPIs = [
      {
        id: "capital",
        title: "Капитал",
        value: 8200000000,
        description: "Совокупный капитал банка",
        change: 5.2,
        ytdChange: 12.7,
        category: "finance",
      },
      {
        id: "ebitda",
        title: "EBITDA",
        value: 2100000000,
        description: "Прибыль до вычета процентов",
        change: 12.3,
        ytdChange: 8.4,
        category: "finance",
      },
    ];

    vi.mocked(useAPIHooks.useLayout).mockReturnValue({
      data: mockLayout,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useAPIHooks.useAllKPIs).mockReturnValue({
      data: mockKPIs,
      isLoading: false,
      error: null,
    } as any);

    render(<DynamicDashboard />, { wrapper: createWrapper() });

    // Check section title
    expect(screen.getByText("Финансовые результаты")).toBeInTheDocument();

    // Check KPI cards are rendered
    expect(screen.getByText("Капитал")).toBeInTheDocument();
    expect(screen.getByText("EBITDA")).toBeInTheDocument();
    // Values are now formatted dynamically, check that cards are rendered
    const cards = screen.getAllByText(/Капитал|EBITDA/);
    expect(cards.length).toBe(2);
  });

  it("should handle missing KPI data gracefully", () => {
    const mockLayout = {
      formats: {},
      sections: [
        {
          id: "test_section",
          title: "Test Section",
          components: [
            {
              id: "nonexistent_card",
              type: "card" as const,
              title: "Nonexistent",
              dataSourceKey: "nonexistent",
            },
          ],
        },
      ],
    };

    vi.mocked(useAPIHooks.useLayout).mockReturnValue({
      data: mockLayout,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useAPIHooks.useAllKPIs).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<DynamicDashboard />, { wrapper: createWrapper() });

    // Section title should be rendered
    expect(screen.getByText("Test Section")).toBeInTheDocument();

    // Card should not be rendered if KPI data is missing
    expect(screen.queryByText("Nonexistent")).not.toBeInTheDocument();
  });

  it("should show placeholder for table components", () => {
    const mockLayout = {
      formats: {},
      sections: [
        {
          id: "test_section",
          title: "Test Section",
          components: [
            {
              id: "test_table",
              type: "table" as const,
              title: "Test Table",
              dataSourceKey: "test_data",
              columns: [],
            },
          ],
        },
      ],
    };

    vi.mocked(useAPIHooks.useLayout).mockReturnValue({
      data: mockLayout,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useAPIHooks.useAllKPIs).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<DynamicDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText("Таблицы будут добавлены в следующей версии")).toBeInTheDocument();
  });
});
