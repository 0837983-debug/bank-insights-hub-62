/**
 * Глобальная инициализация E2E-прогона.
 *
 * Выполняет один вход супер-администратора через API на весь прогон и
 * сохраняет access-токен в файл. Все API-тесты (через fixtures.ts) читают
 * токен из файла, не выполняя повторных входов. Это снижает нагрузку на
 * rate-limit логина и централизует авторизацию.
 */
import { request as playwrightRequest } from "@playwright/test";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  API_BASE_URL,
} from "./helpers/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Путь к файлу с сохранённым access-токеном. */
export const AUTH_TOKEN_FILE = join(__dirname, "..", ".auth", "access-token");

/**
 * Выполняется один раз перед всеми тестами.
 * Логинится администратором и сохраняет access-токен в файл.
 */
export default async function globalSetup(): Promise<void> {
  const dir = dirname(AUTH_TOKEN_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const apiContext = await playwrightRequest.newContext({
    baseURL: API_BASE_URL,
  });

  try {
    const res = await apiContext.post(`${API_BASE_URL}/auth/login`, {
      data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });

    if (!res.ok()) {
      const body = await res.text();
      throw new Error(
        `Глобальный вход администратора не удался (${res.status()}): ${body}`
      );
    }

    const body = (await res.json()) as { accessToken?: string };
    if (!body.accessToken) {
      throw new Error("Глобальный вход не вернул access-токен");
    }

    await writeFile(AUTH_TOKEN_FILE, body.accessToken, "utf8");
    console.log(`[global-setup] Токен администратора сохранён: ${AUTH_TOKEN_FILE}`);
  } finally {
    await apiContext.dispose();
  }
}
