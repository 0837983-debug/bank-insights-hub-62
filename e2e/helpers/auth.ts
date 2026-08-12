/**
 * Централизованный центр входа для E2E-тестов.
 *
 * Единый источник логина, токенов и учётных данных супер-администратора.
 * Все тесты, которым нужна авторизация, используют функции из этого модуля
 * (или фикстуру `adminToken` из fixtures.ts), вместо ручного дублирования логики.
 */
import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { API_BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } from "../config.js";

/** Базовый URL backend-API (единый источник — e2e/config.ts). */
export { API_BASE_URL };

/** Учётные данные супер-администратора (единый источник — e2e/config.ts). */
export { ADMIN_USERNAME, ADMIN_PASSWORD };

/** Путь страницы входа во фронтенде. */
export const LOGIN_PAGE_URL = "/login";

/** Поле ввода логина на странице входа. */
export const LOGIN_USERNAME_SELECTOR = "#username";
/** Поле ввода пароля на странице входа. */
export const LOGIN_PASSWORD_SELECTOR = "#password";
/** Селектор кнопки отправки формы входа. */
export const LOGIN_SUBMIT_SELECTOR = 'button[type="submit"]';

/**
 * Получает access-токен супер-администратора через API.
 * Используется для авторизации API-запросов в тестах.
 * @param request - контекст API-запросов Playwright
 * @returns access-токен супер-администратора
 */
export async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), "админ должен залогиниться через API").toBeTruthy();
  const body = (await res.json()) as { accessToken?: string };
  if (!body.accessToken) {
    throw new Error("Логин администратора не вернул access-токен");
  }
  return body.accessToken;
}

/**
 * Выполняет вход супер-администратора через интерфейс.
 * После успешного входа страница уходит с /login на главную.
 * @param page - объект страницы Playwright
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(LOGIN_PAGE_URL);
  await page.fill(LOGIN_USERNAME_SELECTOR, ADMIN_USERNAME);
  await page.fill(LOGIN_PASSWORD_SELECTOR, ADMIN_PASSWORD);
  await page.click(LOGIN_SUBMIT_SELECTOR);
  // Ждём ухода с формы входа на защищённую страницу
  await page.waitForURL("**/");
}

/**
 * Вход администратора и переход на указанный путь после авторизации.
 * Удобен для тестов, стартующих сразу с целевой страницы.
 * @param page - объект страницы Playwright
 * @param path - целевой путь после входа (например "/users")
 */
export async function loginAsAdminAndGoto(
  page: Page,
  path: string
): Promise<void> {
  await loginAsAdmin(page);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
