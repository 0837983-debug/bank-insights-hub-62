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
  useTableData: vi.fn(),
  useGroupingOptions: vi.fn(),
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

  it("should render table components with data from API", () => {
    const mockLayout = {
      formats: {
        currency_rub: { kind: "number", prefixUnitSymbol: "₽", shorten: true },
        percent: { kind: "number", suffixUnitSymbol: "%" },
      },
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
              columns: [
                { id: "name", label: "Наименование", type: "text" },
                { id: "value", label: "Значение", type: "number" },
              ],
            },
          ],
        },
      ],
    };

    const mockTableData = {
      tableId: "test_data",
      rows: [
        {
          id: "row1",
          name: "Доход 1",
          value: 1000000,
          percentage: 50,
          change_pptd: 5.2,
          change_ytd: 10.1,
        },
        {
          id: "row2",
          name: "Доход 2",
          value: 2000000,
          percentage: 50,
          change_pptd: -2.1,
          change_ytd: 3.5,
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

    vi.mocked(useAPIHooks.useTableData).mockReturnValue({
      data: mockTableData,
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(useAPIHooks.useGroupingOptions).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<DynamicDashboard />, { wrapper: createWrapper() });

    // Section title should be rendered
    expect(screen.getByText("Test Section")).toBeInTheDocument();

    // Table title should be rendered
    expect(screen.getByText("Test Table")).toBeInTheDocument();

    // Table rows should be rendered
    expect(screen.getByText("Доход 1")).toBeInTheDocument();
    expect(screen.getByText("Доход 2")).toBeInTheDocument();
  });

  it("should show loading state for tables", () => {
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

    vi.mocked(useAPIHooks.useTableData).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    vi.mocked(useAPIHooks.useGroupingOptions).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    const { container } = render(<DynamicDashboard />, { wrapper: createWrapper() });

    // Section title should be rendered
    expect(screen.getByText("Test Section")).toBeInTheDocument();

    // Should show skeleton loaders for table
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should show error state for table when API fails", () => {
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

    vi.mocked(useAPIHooks.useTableData).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load table data"),
    } as any);

    vi.mocked(useAPIHooks.useGroupingOptions).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<DynamicDashboard />, { wrapper: createWrapper() });

    // Section title should be rendered
    expect(screen.getByText("Test Section")).toBeInTheDocument();

    // Should show error message
    expect(screen.getByText("Ошибка загрузки таблицы")).toBeInTheDocument();
    expect(
      screen.getByText(/Не удалось загрузить данные для таблицы "Test Table"/)
    ).toBeInTheDocument();
  });
});
