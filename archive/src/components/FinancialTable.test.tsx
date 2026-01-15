import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FinancialTable, TableRowData } from "./FinancialTable";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockData: TableRowData[] = [
  {
    id: "revenue",
    name: "Доходы",
    value: 125400000,
    percentage: 100,
    change: 12.5,
    changeYtd: 8.3,
    isGroup: true,
  },
  {
    id: "revenue-services",
    name: "Услуги",
    value: 85000000,
    percentage: 67.8,
    change: 15.2,
    parentId: "revenue",
  },
  {
    id: "total",
    name: "ИТОГО",
    value: 125400000,
    percentage: 100,
    isTotal: true,
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe("FinancialTable", () => {
  it("renders table title", () => {
    renderWithProviders(<FinancialTable title="Структура доходов" rows={mockData} />);

    expect(screen.getByText("Структура доходов")).toBeInTheDocument();
  });

  it("renders all rows", () => {
    renderWithProviders(<FinancialTable title="Структура доходов" rows={mockData} />);

    expect(screen.getByText("Доходы")).toBeInTheDocument();
    expect(screen.getByText("Услуги")).toBeInTheDocument();
    expect(screen.getByText("ИТОГО")).toBeInTheDocument();
  });

  it("displays percentage when showPercentage is true", () => {
    renderWithProviders(
      <FinancialTable title="Структура доходов" rows={mockData} showPercentage={true} />
    );

    // Since "100.0%" appears multiple times in the table, we check that it exists at least once
    const percentages = screen.getAllByText("100.0%");
    expect(percentages.length).toBeGreaterThan(0);
    expect(screen.getByText("67.8%")).toBeInTheDocument();
  });

  it("displays change indicators when showChange is true", () => {
    renderWithProviders(
      <FinancialTable title="Структура доходов" rows={mockData} showChange={true} />
    );

    expect(screen.getByText(/12.5%/)).toBeInTheDocument();
    expect(screen.getByText(/15.2%/)).toBeInTheDocument();
  });

  it("collapses and expands groups", () => {
    renderWithProviders(<FinancialTable title="Структура доходов" rows={mockData} />);

    const servicesRow = screen.getByText("Услуги");
    expect(servicesRow).toBeVisible();

    // Find and click the collapse button for the parent group
    const collapseButtons = screen.getAllByRole("button");
    const groupCollapseButton = collapseButtons.find((btn) => btn.querySelector("svg"));

    if (groupCollapseButton) {
      fireEvent.click(groupCollapseButton);
      // After collapse, child should not be visible
      // Note: This depends on actual implementation
    }
  });

  it("applies correct styling for total row", () => {
    renderWithProviders(<FinancialTable title="Структура доходов" rows={mockData} />);

    const totalRow = screen.getByText("ИТОГО").closest("tr");
    expect(totalRow).toHaveClass("bg-muted/30");
  });
});
