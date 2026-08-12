/**
 * Middleware защиты по принципу БЕЛОГО СПИСКА (deny-by-default).
 * Все пути под /api закрыты по умолчанию, открыты только явно разрешённые.
 * Остальные маршруты проходят через authenticate (обязателен access-токен).
 */
import type { Request, Response, NextFunction } from "express";
import { authenticate } from "./authenticate.js";

/** Явно открытые (публичные) пути. Ключ — "МЕТОД путь" относительно /api. */
const OPEN_PATHS = new Set<string>([
  "GET /health",
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/logout",
]);

/** Middleware белого списка. */
export function whitelistAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = `${req.method} ${req.path}`;
  if (OPEN_PATHS.has(key)) {
    next();
    return;
  }
  // Все остальные маршруты требуют аутентификации
  void authenticate(req, res, next);
}
