/**
 * Маршруты аутентификации: login, refresh, logout, me.
 * Refresh-токен хранится в httpOnly cookie и в теле запроса.
 */
import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as authService from "../services/auth/authService.js";

const router = Router();

/** Параметры httpOnly-cookie для refresh-токена. */
function refreshCookieOptions(): Record<string, unknown> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: authService.getRefreshTtlDaysMilliseconds(),
  };
}

/** Извлекает refresh-токен из cookie или тела запроса. */
function extractRefreshToken(req: Request): string | undefined {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.refresh_token;
  if (fromCookie) return fromCookie;
  const body = req.body as { refreshToken?: string };
  if (typeof body.refreshToken === "string") return body.refreshToken;
  return undefined;
}

/** Вход. */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };
    if (!username || !password) {
      res.status(400).json({ error: "Имя пользователя и пароль обязательны" });
      return;
    }

    const { auth, refreshToken } = await authService.login({ username, password });
    res.cookie("refresh_token", refreshToken, refreshCookieOptions());
    res.json(auth);
  } catch (error) {
    const status = error instanceof authService.AuthError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : "Ошибка входа" });
  }
});

/** Обновление сессии. */
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const refreshToken = extractRefreshToken(req);
    if (!refreshToken) {
      res.status(401).json({ error: "Отсутствует refresh-токен" });
      return;
    }

    const { auth, refreshToken: newRefresh } = await authService.refresh(refreshToken);
    res.cookie("refresh_token", newRefresh, refreshCookieOptions());
    res.json(auth);
  } catch (error) {
    res.clearCookie("refresh_token", { path: "/api/auth" });
    const status = error instanceof authService.AuthError ? error.status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : "Ошибка обновления" });
  }
});

/** Выход. */
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const refreshToken = extractRefreshToken(req);
    await authService.logout(refreshToken);
  } finally {
    res.clearCookie("refresh_token", { path: "/api/auth" });
  }
  res.json({ success: true });
});

/** Текущий пользователь (требуется аутентификация). */
router.get("/me", authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
