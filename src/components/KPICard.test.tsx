import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KPICard } from "./KPICard";
import { DollarSign } from "lucide-react";

describe("KPICard", () => {
  it("renders title and value correctly", () => {
    render(<KPICard title="Выручка" value="₽125.4M" description="Общая выручка за период" />);

    expect(screen.getByText("Выручка")).toBeInTheDocument();
    expect(screen.getByText("₽125.4M")).toBeInTheDocument();
  });

  it("displays change indicators when showChange is true", () => {
    render(
      <KPICard
        title="Выручка"
        value="₽125.4M"
        description="Общая выручка"
        change={12.5}
        ytdChange={8.3}
        showChange={true}
      />
    );

    expect(screen.getByText("12.5%")).toBeInTheDocument();
    expect(screen.getByText(/8.3%/)).toBeInTheDocument();
  });

  it("does not display change when showChange is false", () => {
    render(
      <KPICard
        title="Выручка"
        value="₽125.4M"
        description="Общая выручка"
        change={12.5}
        showChange={false}
      />
    );

    expect(screen.queryByText("12.5%")).not.toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    const { container } = render(
      <KPICard
        title="Выручка"
        value="₽125.4M"
        description="Общая выручка"
        icon={<DollarSign data-testid="dollar-icon" />}
      />
    );

    expect(container.querySelector('[data-testid="dollar-icon"]')).toBeInTheDocument();
  });

  it("applies correct color for positive change", () => {
    const { container } = render(
      <KPICard
        title="Выручка"
        value="₽125.4M"
        description="Общая выручка"
        change={12.5}
        showChange={true}
      />
    );

    const changeElement = screen.getByText("12.5%");
    expect(changeElement).toHaveClass("text-success");
  });

  it("applies correct color for negative change", () => {
    const { container } = render(
      <KPICard
        title="Выручка"
        value="₽125.4M"
        description="Общая выручка"
        change={-5.2}
        showChange={true}
      />
    );

    const changeElement = screen.getByText("5.2%");
    expect(changeElement).toHaveClass("text-destructive");
  });
});
