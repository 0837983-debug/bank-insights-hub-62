/**
 * Маршруты управления пользователями (только для супер-админа).
 * Пароли генерируются системой и показываются один раз.
 * Создание супер-админа через интерфейс ЗАПРЕЩЕНО (защита от эскалации прав).
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { requireSuperAdmin } from "../middleware/authorize.js";
import { parseRole, type Role } from "../config/auth.js";
import * as repo from "../services/auth/userRepository.js";
import { hashPassword, generateStrongPassword } from "../services/auth/passwordService.js";
import { revokeAllUserTokens } from "../services/auth/userRepository.js";
import { AppError, AppErrorCode } from "../types/errors.js";

const router = Router();

// Все маршруты ниже доступны только супер-админу
router.use(requireSuperAdmin());

/** Список пользователей. */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await repo.listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

/**
 * Создание пользователя.
 * Пароль генерируется и возвращается один раз (если не передан явно).
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, role } = req.body as {
      username?: string;
      password?: string;
      role?: string;
    };

    if (!username || typeof username !== "string") {
      throw new AppError(AppErrorCode.USER_REQUIRED_FIELD);
    }

    const parsedRole = parseRole(role);
    if (!parsedRole) {
      throw new AppError(AppErrorCode.USER_INVALID_ROLE);
    }

    // Запрет создания супер-админа через интерфейс
    if (parsedRole === "super_admin") {
      throw new AppError(AppErrorCode.USER_SUPER_ADMIN_FORBIDDEN);
    }

    // Проверка уникальности имени
    const existing = await repo.findByUsername(username);
    if (existing) {
      throw new AppError(AppErrorCode.USER_ALREADY_EXISTS);
    }

    // Генерация сложного пароля, если не задан явно
    const plainPassword = password && password.length >= 8 ? password : generateStrongPassword();
    const passwordHash = await hashPassword(plainPassword);

    const user = await repo.createUser({ username, passwordHash, role: parsedRole });

    // Пароль возвращается ТОЛЬКО здесь (однократный показ)
    res.status(201).json({ user, generatedPassword: plainPassword });
  } catch (error) {
    next(error);
  }
});

/** Смена роли (кроме роли на супер-админа). */
router.patch("/:id/role", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body as { role?: string };

    const parsedRole = parseRole(role);
    if (!parsedRole) {
      throw new AppError(AppErrorCode.USER_INVALID_ROLE);
    }
    if (parsedRole === "super_admin") {
      throw new AppError(AppErrorCode.USER_SUPER_ADMIN_FORBIDDEN);
    }

    const user = await repo.updateRole(id, parsedRole);
    if (!user) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND);
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/** Блокировка/разблокировка пользователя. */
router.patch("/:id/active", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body as { isActive?: boolean };

    if (typeof isActive !== "boolean") {
      throw new AppError(AppErrorCode.USER_ACTIVE_REQUIRED);
    }

    // Нельзя заблокировать самого себя
    if (req.user && req.user.id === id) {
      throw new AppError(AppErrorCode.USER_SELF_ACTION);
    }

    const user = await repo.setActive(id, isActive);
    if (!user) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND);
    }

    // При блокировке отзываем все сессии пользователя
    if (!isActive) {
      await revokeAllUserTokens(id);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/** Удаление пользователя. */
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    // Нельзя удалить самого себя
    if (req.user && req.user.id === id) {
      throw new AppError(AppErrorCode.USER_SELF_ACTION);
    }

    const deleted = await repo.deleteUser(id);
    if (!deleted) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** Сброс пароля: генерация нового, показ один раз. */
router.post("/:id/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    const existing = await repo.findById(id);
    if (!existing) {
      throw new AppError(AppErrorCode.USER_NOT_FOUND);
    }

    const plainPassword = generateStrongPassword();
    const passwordHash = await hashPassword(plainPassword);

    await repo.setPassword(id, passwordHash);
    // После сброса пароля отзываем все активные сессии
    await revokeAllUserTokens(id);

    res.json({ generatedPassword: plainPassword });
  } catch (error) {
    next(error);
  }
});

export default router;
