/**
 * Middleware авторизации по ролям.
 * Вызывается после authenticate. Ограничивает доступ по минимальной роли.
 */
import type { Request, Response, NextFunction } from "express";
import { hasRole, type Role } from "../config/auth.js";

/**
 * Создаёт middleware, требующий роль не ниже заданной.
 * @param required - минимальная требуемая роль
 */
export function authorize(required: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Требуется авторизация" });
      return;
    }
    if (!hasRole(user.role, required)) {
      res.status(403).json({ error: "Недостаточно прав" });
      return;
    }
    next();
  };
}

/** Только супер-админ. */
export function requireSuperAdmin() {
  return authorize("super_admin");
}
