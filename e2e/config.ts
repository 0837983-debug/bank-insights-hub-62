/**
 * Единый источник конфигурации E2E-тестов.
 *
 * Все URL и учётные данные тестов берутся ОТСЮДА. Меняя значения в одном
 * месте (или через переменные окружения), можно переключать весь тестовый
 * контур (например, на изолированный тестовый стенд) без правок в тестах.
 *
 * Переменные окружения (приоритет):
 *   E2E_API_URL      — базовый URL backend-API (по умолчанию тестовый стенд)
 *   E2E_FRONTEND_URL — базовый URL фронтенда (по умолчанию тестовый стенд)
 *   E2E_DOCKER_MODE  — "true", если используется docker-контур
 */
export const API_BASE_URL =
  process.env.E2E_API_URL ?? "http://localhost:3002/api";
export const FRONTEND_URL =
  process.env.E2E_FRONTEND_URL ?? "http://localhost:8081";
export const DOCKER_MODE = process.env.E2E_DOCKER_MODE === "true";
