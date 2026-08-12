/**
 * Конфигурация авторизации.
 * Все секреты и настройки читаются из переменных окружения (best practices),
 * в коде допускаются только dev-заглушки.
 */
import dotenv from "dotenv";

dotenv.config();

export const AUTH = {
  // Секреты для подписи JWT-токенов (обязательны в проде)
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me",

  // Срок жизни токенов
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? "30"),

  // Параметры супер-админа, создаваемого при первом запуске
  superAdmin: {
    username: process.env.SUPER_ADMIN_USERNAME ?? "admin",
    password: process.env.SUPER_ADMIN_PASSWORD ?? "change-me-strong-password",
  },
} as const;

/** Роли системы (сортировка от больших прав к меньшим). */
export const ROLES = ["super_admin", "manager", "viewer"] as const;
export type Role = (typeof ROLES)[number];

/** Уровень прав для роли (больше = больше доступа). */
export const ROLE_LEVEL: Record<Role, number> = {
  super_admin: 3,
  manager: 2,
  viewer: 1,
};

/**
 * Проверяет, что роль обладает правом не ниже указанной.
 * @param current - роль текущего пользователя
 * @param required - минимальная требуемая роль
 */
export function hasRole(current: string, required: Role): boolean {
  const currentLevel = ROLE_LEVEL[current as Role] ?? 0;
  const requiredLevel = ROLE_LEVEL[required];
  return currentLevel >= requiredLevel;
}

/** Допустимая роль из строки (или null, если значение невалидно). */
export function parseRole(value: string | undefined): Role | null {
  if (!value) return null;
  return ROLES.includes(value as Role) ? (value as Role) : null;
}
