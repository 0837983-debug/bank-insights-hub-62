import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "./Header";

describe("Header", () => {
  it("renders all navigation links", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByTestId("nav-link-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-upload")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-dev-tools")).toBeInTheDocument();
  });

  it("applies active styles to the current route", () => {
    render(
      <MemoryRouter initialEntries={["/upload"]}>
        <Header />
      </MemoryRouter>
    );

    const uploadLink = screen.getByTestId("nav-link-upload");
    const dashboardLink = screen.getByTestId("nav-link-dashboard");

    expect(uploadLink.className).toContain("bg-muted");
    expect(uploadLink.className).toContain("font-semibold");
    expect(dashboardLink.className).not.toContain("font-semibold");
  });
});
