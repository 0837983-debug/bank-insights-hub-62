/**
 * Расширенный тест Playwright с централизованной авторизацией.
 *
 * Добавляет фикстуры:
 * - `adminToken` — access-токен супер-администратора;
 * - `authedRequest` — API-контекст с автоматическим Bearer-заголовком.
 *
 * Токен берётся из файла, подготовленного `global-setup.ts` (один вход на
 * весь прогон). Если файл отсутствует (запуск файла вручную), выполняется
 * единичный логин. Это снижает нагрузку на rate-limit логина.
 */
import {
  test as base,
  type APIRequestContext,
} from "@playwright/test";
import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  adminToken as fetchAdminToken,
  API_BASE_URL,
} from "./helpers/auth.js";
import { AUTH_TOKEN_FILE } from "./global-setup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Кэш токена на уровне процесса теста. */
let cachedAdminToken: string | null = null;

/**
 * Получает access-токен: из кэша, затем из файла global-setup,
 * в крайнем случае — выполняет единичный вход.
 * @param request - контекст API-запросов Playwright
 * @returns access-токен супер-администратора
 */
async function resolveAdminToken(
  request: APIRequestContext
): Promise<string> {
  if (cachedAdminToken) {
    return cachedAdminToken;
  }

  // Пытаемся прочитать токен, подготовленный global-setup (один вход на прогон)
  try {
    const token = (await readFile(AUTH_TOKEN_FILE, "utf8")).trim();
    if (token) {
      cachedAdminToken = token;
      return token;
    }
  } catch {
    // Файла нет — запуск файла вручную, выполним единичный вход ниже
  }

  cachedAdminToken = await fetchAdminToken(request);
  return cachedAdminToken;
}

/**
 * Единый интерфейс расширенных фикстур.
 */
export interface AuthorizedFixtures {
  adminToken: string;
  authedRequest: APIRequestContext;
}

/**
 * Расширенный тест с фикстурами авторизации.
 * Подключение: import { test, expect } from "./fixtures.js";
 */
export const test = base.extend<AuthorizedFixtures>({
  // Фикстура выдаёт access-токен супер-администратора
  adminToken: async ({ request }: { request: APIRequestContext }, use) => {
    await use(await resolveAdminToken(request));
  },

  // API-контекст, который сам подставляет Bearer-заголовок во все запросы
  authedRequest: async ({ adminToken }, use) => {
    const authed = await (await import("@playwright/test")).request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
    });
    await use(authed);
    await authed.dispose();
  },
});

export { expect } from "@playwright/test";
