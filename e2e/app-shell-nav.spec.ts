import { test, expect, type Page } from "@playwright/test";

const NAV_LINKS = [
  { testId: "nav-link-dashboard", path: "/" },
  { testId: "nav-link-upload", path: "/upload" },
  { testId: "nav-link-dev-tools", path: "/dev-tools" },
] as const;

type NavTestId = (typeof NAV_LINKS)[number]["testId"];

async function expectAllNavLinksVisible(page: Page) {
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByTestId("app-header")).toBeVisible();
  await expect(page.getByTestId("header-nav")).toBeVisible();

  for (const link of NAV_LINKS) {
    await expect(page.getByTestId(link.testId)).toBeVisible();
  }
}

async function expectActiveNavLink(page: Page, activeTestId: NavTestId) {
  for (const link of NAV_LINKS) {
    const locator = page.getByTestId(link.testId);

    if (link.testId === activeTestId) {
      await expect(locator).toHaveAttribute("aria-current", "page");
      await expect(locator).toHaveClass(/font-semibold/);
      await expect(locator).toHaveClass(/bg-muted/);
    } else {
      await expect(locator).not.toHaveAttribute("aria-current", "page");
    }
  }
}

test.describe("App Shell Navigation", () => {
  test("navigates / → /upload → /dev-tools → / with active state", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expectAllNavLinksVisible(page);
    await expectActiveNavLink(page, "nav-link-dashboard");

    await page.getByTestId("nav-link-upload").click();
    await expect(page).toHaveURL(/\/upload$/);
    await expectAllNavLinksVisible(page);
    await expectActiveNavLink(page, "nav-link-upload");
    await expect(page.getByTestId("upload-form")).toBeVisible();

    await page.getByTestId("nav-link-dev-tools").click();
    await expect(page).toHaveURL(/\/dev-tools$/);
    await expectAllNavLinksVisible(page);
    await expectActiveNavLink(page, "nav-link-dev-tools");
    await expect(page.getByRole("heading", { name: "Dev Tools", level: 1 })).toBeVisible();

    await page.getByTestId("nav-link-dashboard").click();
    await expect(page).toHaveURL(/\/$/);
    await expectAllNavLinksVisible(page);
    await expectActiveNavLink(page, "nav-link-dashboard");
  });

  test("shows all nav links on each route when visited directly", async ({ page }) => {
    const routes: { path: string; activeTestId: NavTestId }[] = [
      { path: "/", activeTestId: "nav-link-dashboard" },
      { path: "/upload", activeTestId: "nav-link-upload" },
      { path: "/dev-tools", activeTestId: "nav-link-dev-tools" },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      await expectAllNavLinksVisible(page);
      await expectActiveNavLink(page, route.activeTestId);
    }
  });
});
