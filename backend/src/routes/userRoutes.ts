/**
 * Маршруты управления пользователями (только для супер-админа).
 * Пароли генерируются системой и показываются один раз.
 * Создание супер-админа через интерфейс ЗАПРЕЩЕНО (защита от эскалации прав).
 */
import { Router, type Request, type Response } from "express";
import { requireSuperAdmin } from "../middleware/authorize.js";
import { parseRole, type Role } from "../config/auth.js";
import * as repo from "../services/auth/userRepository.js";
import { hashPassword, generateStrongPassword } from "../services/auth/passwordService.js";
import { revokeAllUserTokens } from "../services/auth/userRepository.js";

const router = Router();

// Все маршруты ниже доступны только супер-админу
router.use(requireSuperAdmin());

/** Список пользователей. */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await repo.listUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "Ошибка получения списка пользователей" });
  }
});

/**
 * Создание пользователя.
 * Пароль генерируется и возвращается один раз (если не передан явно).
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body as {
      username?: string;
      password?: string;
      role?: string;
    };

    if (!username || typeof username !== "string") {
      res.status(400).json({ error: "Имя пользователя обязательно" });
      return;
    }

    const parsedRole = parseRole(role);
    if (!parsedRole) {
      res.status(400).json({ error: "Недопустимая роль" });
      return;
    }

    // Запрет создания супер-админа через интерфейс
    if (parsedRole === "super_admin") {
      res.status(400).json({ error: "Создание супер-админа через интерфейс запрещено" });
      return;
    }

    // Проверка уникальности имени
    const existing = await repo.findByUsername(username);
    if (existing) {
      res.status(409).json({ error: "Пользователь с таким именем уже существует" });
      return;
    }

    // Генерация сложного пароля, если не задан явно
    const plainPassword = password && password.length >= 8 ? password : generateStrongPassword();
    const passwordHash = await hashPassword(plainPassword);

    const user = await repo.createUser({ username, passwordHash, role: parsedRole });

    // Пароль возвращается ТОЛЬКО здесь (однократный показ)
    res.status(201).json({ user, generatedPassword: plainPassword });
  } catch (error) {
    res.status(500).json({ error: "Ошибка создания пользователя" });
  }
});

/** Смена роли (кроме роли на супер-админа). */
router.patch("/:id/role", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body as { role?: string };

    const parsedRole = parseRole(role);
    if (!parsedRole) {
      res.status(400).json({ error: "Недопустимая роль" });
      return;
    }
    if (parsedRole === "super_admin") {
      res.status(400).json({ error: "Назначение роли супер-админа через интерфейс запрещено" });
      return;
    }

    const user = await repo.updateRole(id, parsedRole);
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Ошибка смены роли" });
  }
});

/** Блокировка/разблокировка пользователя. */
router.patch("/:id/active", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body as { isActive?: boolean };

    if (typeof isActive !== "boolean") {
      res.status(400).json({ error: "Поле isActive обязательно" });
      return;
    }

    // Нельзя заблокировать самого себя
    if (req.user && req.user.id === id) {
      res.status(400).json({ error: "Нельзя заблокировать самого себя" });
      return;
    }

    const user = await repo.setActive(id, isActive);
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    // При блокировке отзываем все сессии пользователя
    if (!isActive) {
      await revokeAllUserTokens(id);
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Ошибка изменения статуса" });
  }
});

/** Удаление пользователя. */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    // Нельзя удалить самого себя
    if (req.user && req.user.id === id) {
      res.status(400).json({ error: "Нельзя удалить самого себя" });
      return;
    }

    const deleted = await repo.deleteUser(id);
    if (!deleted) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Ошибка удаления пользователя" });
  }
});

/** Сброс пароля: генерация нового, показ один раз. */
router.post("/:id/reset-password", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const existing = await repo.findById(id);
    if (!existing) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    const plainPassword = generateStrongPassword();
    const passwordHash = await hashPassword(plainPassword);

    await repo.setPassword(id, passwordHash);
    // После сброса пароля отзываем все активные сессии
    await revokeAllUserTokens(id);

    res.json({ generatedPassword: plainPassword });
  } catch (error) {
    res.status(500).json({ error: "Ошибка сброса пароля" });
  }
});

export default router;
