/**
 * Сквозные (E2E) тесты авторизации через реальный браузер (Playwright).
 * Проверяют вход, отказ, защиту страниц и работу ролей через интерфейс.
 */
import { test, expect } from "@playwright/test";

// Пароль супер-админа берётся из окружения; по умолчанию — dev-значение из .env
const ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD =
  process.env.SUPER_ADMIN_PASSWORD ?? "GTdusE+3mN306uhmBM1IBfXZvWS6WYEy";

test("неавторизованного пользователя отправляет на страницу входа", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForURL("**/login");
  await expect(page).toHaveURL(/\/login/);
});

test("при неверном пароле показывает сообщение об отказе и не пускает", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill("#username", ADMIN_USERNAME);
  await page.fill("#password", "definitely-wrong-password");
  await page.click('button[type="submit"]');

  // Показывается сообщение об ошибке (отказ в доступе)
  await expect(page.getByText(/Неверное имя пользователя или пароль/)).toBeVisible();
  // Остаёмся на странице входа
  await expect(page).toHaveURL(/\/login/);
});

test("вход администратора открывает дашборд и пункт управления аккаунтами", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill("#username", ADMIN_USERNAME);
  await page.fill("#password", ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  // После входа попадаем на дашборд
  await page.waitForURL("**/");
  await expect(page).toHaveURL(/\/$/);

  // У супер-админа в меню есть пункт "Аккаунты"
  await expect(page.getByTestId("nav-link-users")).toBeVisible();
});

test("выход возвращает на страницу входа", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#username", ADMIN_USERNAME);
  await page.fill("#password", ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/");

  // Открываем меню настроек и нажимаем "Выйти"
  await page.getByTestId("btn-header-settings").click();
  await page.getByText("Выйти").click();
  await page.waitForURL("**/login");
  await expect(page).toHaveURL(/\/login/);
});
