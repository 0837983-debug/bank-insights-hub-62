/**
 * Единый источник конфигурации E2E-тестов.
 *
 * Все URL и учётные данные тестов берутся ОТСЮДА. Меняя значения в одном
 * месте (или через переменные окружения), можно переключать весь тестовый
 * контур (например, на изолированный тестовый стенд) без правок в тестах.
 *
 * Секреты и учётные данные не хардкодятся в коде — они загружаются из файла
 * `.env` (не попадает в git) и из переменных окружения процесса. В коде
 * остаются только нейтральные заглушки (fallback) без реальных значений.
 *
 * Переменные окружения (приоритет):
 *   E2E_API_URL      — базовый URL backend-API (по умолчанию тестовый стенд)
 *   E2E_FRONTEND_URL — базовый URL фронтенда (по умолчанию тестовый стенд)
 *   E2E_DOCKER_MODE  — "true", если используется docker-контур
 */
import dotenv from "dotenv";

// Загрузка .env из корня проекта (секреты не лежат в git).
dotenv.config();

export const API_BASE_URL =
  process.env.E2E_API_URL ?? "http://localhost:3002/api";
export const FRONTEND_URL =
  process.env.E2E_FRONTEND_URL ?? "http://localhost:8081";
export const DOCKER_MODE = process.env.E2E_DOCKER_MODE === "true";

// ВРЕМЕННАЯ ОШИБКА ДЛЯ ПРОВЕРКИ ЗАЩИТЫ (eqeqeq) — будет удалена.
const testMode = process.env.E2E_DOCKER_MODE == "true";
void testMode;

/**
 * Учётные данные супер-администратора тестового контура.
 *
 * Приоритет имён переменных: сначала тестовые (TEST_SUPER_ADMIN_*),
 * затем общие (SUPER_ADMIN_*). Ни одно реальное значение в коде
 * не зашито — только нейтральная заглушка логина "admin".
 */
export const ADMIN_USERNAME =
  process.env.TEST_SUPER_ADMIN_USERNAME ??
  process.env.SUPER_ADMIN_USERNAME ??
  "admin";
export const ADMIN_PASSWORD =
  process.env.TEST_SUPER_ADMIN_PASSWORD ??
  process.env.SUPER_ADMIN_PASSWORD ??
  "";
