import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "./Header";
import { AuthProvider } from "@/context/AuthContext";
import * as authLib from "@/lib/auth";

// Мокаем восстановление сессии, чтобы тест не обращался к сети.
// Возвращаем супер-админа, чтобы все пункты навигации были доступны.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof authLib>();
  return {
    ...actual,
    apiRefresh: vi.fn().mockResolvedValue({
      user: {
        id: 1,
        username: "admin",
        role: "super_admin",
        isActive: true,
        createdAt: "2026-08-11T00:00:00.000Z",
      },
      accessToken: "test-token",
    }),
  };
});

describe("Header", () => {
  it("renders all navigation links", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Header />
        </AuthProvider>
      </MemoryRouter>
    );

    // Ждём асинхронного восстановления сессии (apiRefresh)
    expect(await screen.findByTestId("nav-link-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-upload")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-users")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-dev-tools")).toBeInTheDocument();
  });

  it("applies active styles to the current route", async () => {
    render(
      <MemoryRouter initialEntries={["/upload"]}>
        <AuthProvider>
          <Header />
        </AuthProvider>
      </MemoryRouter>
    );

    const uploadLink = await screen.findByTestId("nav-link-upload");
    const dashboardLink = screen.getByTestId("nav-link-dashboard");

    expect(uploadLink.className).toContain("bg-muted");
    expect(uploadLink.className).toContain("font-semibold");
    expect(dashboardLink.className).not.toContain("font-semibold");
  });
});
