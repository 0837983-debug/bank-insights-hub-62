/**
 * Интеграционные (гибридные) тесты панели управления пользователями.
 *
 * Гибридный подход: реальные действия выполняются через браузер (UI),
 * а проверки состояния — через API и напрямую в тестовой базе данных.
 *
 * Требования к тестам:
 *  - ИДЕМПОТЕНТНОСТЬ: тест можно запускать сколько угодно раз, он не «копится».
 *  - ДЕТЕРМИНИРОВАННОСТЬ: результат предсказуем; после теста база данных
 *    возвращается в то же состояние, что и до теста (созданный пользователь
 *    гарантированно удаляется).
 *
 * Запуск (docker-контур):
 *   E2E_DOCKER_MODE=true npx playwright test e2e/users-integration.spec.ts --reporter=list
 */
import { test, expect, Page, APIRequestContext } from "@playwright/test";
import { execSync } from "node:child_process";

const ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD =
  process.env.SUPER_ADMIN_PASSWORD ?? "GTdusE+3mN306uhmBM1IBfXZvWS6WYEy";

const API_BASE_URL =
  process.env.E2E_DOCKER_API_URL ?? "http://localhost:3001/api";
const COMPOSE_FILE =
  process.env.E2E_DOCKER_COMPOSE_FILE ?? "docker-compose.dev.yml";
const DB_NAME = process.env.DB_NAME ?? "bankdb_local";
const DB_USER = process.env.DB_USER ?? "bank_local_user";

/**
 * Уникальное имя тестового пользователя.
 * На основе времени, чтобы параллельные прогоны не пересекались.
 */
function testUsername(): string {
  return `e2e_user_${Date.now().toString(36)}`;
}

/** Выполняет SQL-запрос в тестовой базе данных через docker compose. */
function dbQuery(sql: string): string {
  return execSync(
    `docker compose -f ${COMPOSE_FILE} exec -T postgres psql -U ${DB_USER} -d ${DB_NAME} -t -A -c "${sql}"`,
    { cwd: process.cwd(), encoding: "utf-8" }
  ).trim();
}

/** Проверяет, существует ли пользователь в БД по имени. */
function dbUserExists(username: string): boolean {
  return dbQuery(
    `SELECT COUNT(*) FROM auth.users WHERE username = '${username}';`
  ) === "1";
}

/** Удаляет пользователя из БД по имени (очистка). */
function dbDeleteUser(username: string): void {
  dbQuery(
    `DELETE FROM auth.users WHERE username = '${username}';`
  );
}

/** Получает access-токен администратора через API. */
async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), "админ должен залогиниться через API").toBeTruthy();
  const body = await res.json();
  return body.accessToken as string;
}

/** Входит администратором через интерфейс и переходит на страницу «Аккаунты». */
async function loginAndOpenUsers(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill("#username", ADMIN_USERNAME);
  await page.fill("#password", ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/");
  await page.getByTestId("nav-link-users").click();
  await expect(page).toHaveURL(/\/users/);
}

test.describe("Панель управления пользователями (интеграционные)", () => {
  test("создание пользователя через интерфейс: создаётся в UI, API и БД", async ({
    page,
    request,
  }) => {
    const username = testUsername();

    // Гарантируем чистоту перед тестом (идемпотентность)
    dbDeleteUser(username);

    await loginAndOpenUsers(page);

    // Заполняем форму создания
    await page.fill("#newUsername", username);
    // Выбираем роль «Менеджер»
    await page.getByTestId("role-select").click();
    await page.getByRole("option", { name: "Менеджер" }).click();
    await page.click('button[type="submit"]');

    // Пользователь появился в таблице
    await expect(
      page.locator(`tr:has-text("${username}")`)
    ).toBeVisible();

    // В API пользователь существует
    const token = await adminToken(request);
    const listRes = await request.get(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    const found = list.users.find(
      (u: { username: string }) => u.username === username
    );
    expect(found, "пользователь должен быть в списке API").toBeTruthy();

    // В базе данных пользователь существует
    expect(dbUserExists(username)).toBe(true);

    // Очистка после теста — детерминизм (БД как до)
    dbDeleteUser(username);
    expect(dbUserExists(username)).toBe(false);
  });

  test("удаление пользователя через интерфейс: удаляется из UI, API и БД", async ({
    page,
    request,
  }) => {
    const username = testUsername();

    // Подготавливаем пользователя в БД (как если бы он существовал ранее)
    dbDeleteUser(username); // идемпотентность: снимаем старый след
    // Создаём через API, чтобы данные были консистентны
    const token = await adminToken(request);
    const createRes = await request.post(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { username, role: "viewer" },
    });
    expect(createRes.ok(), "подготовка пользователя через API").toBeTruthy();
    expect(dbUserExists(username)).toBe(true);

    await loginAndOpenUsers(page);

    // Находим строку с пользователем и нажимаем «Удалить»
    const row = page.locator(`tr:has-text("${username}")`);
    await expect(row).toBeVisible();

    // Подтверждаем окно подтверждения
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByTestId(`btn-delete-${username}`).click();

    // Строка исчезла из таблицы
    await expect(page.locator(`tr:has-text("${username}")`)).toHaveCount(0);

    // В API пользователь удалён
    const listRes = await request.get(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    const found = list.users.find(
      (u: { username: string }) => u.username === username
    );
    expect(found, "пользователь должен отсутствовать в API").toBeUndefined();

    // В базе данных пользователь удалён
    expect(dbUserExists(username)).toBe(false);

    // Страховочная очистка (если вдруг что-то осталось)
    dbDeleteUser(username);
  });

  test("повторный запуск идемпотентен: не накапливает пользователей", async ({
    page,
  }) => {
    const username = testUsername();
    dbDeleteUser(username);

    await loginAndOpenUsers(page);

    await page.fill("#newUsername", username);
    await page.getByTestId("role-select").click();
    await page.getByRole("option", { name: "Просмотр" }).click();
    await page.click('button[type="submit"]');
    await expect(page.locator(`tr:has-text("${username}")`)).toBeVisible();

    // Удаляем через интерфейс
    const row = page.locator(`tr:has-text("${username}")`);
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByTestId(`btn-delete-${username}`).click();
    await expect(page.locator(`tr:has-text("${username}")`)).toHaveCount(0);

    // БД чистая
    expect(dbUserExists(username)).toBe(false);
    dbDeleteUser(username);
  });
});
