/**
 * Middleware авторизации по ролям.
 * Вызывается после authenticate. Ограничивает доступ по минимальной роли.
 */
import type { Request, Response, NextFunction } from "express";
import { hasRole, type Role } from "../config/auth.js";
import { AppError, AppErrorCode } from "../types/errors.js";

/**
 * Создаёт middleware, требующий роль не ниже заданной.
 * @param required - минимальная требуемая роль
 */
export function authorize(required: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new AppError(AppErrorCode.AUTH_UNAUTHORIZED));
      return;
    }
    if (!hasRole(user.role, required)) {
      next(new AppError(AppErrorCode.AUTH_FORBIDDEN));
      return;
    }
    next();
  };
}

/** Только супер-админ. */
export function requireSuperAdmin() {
  return authorize("super_admin");
}
