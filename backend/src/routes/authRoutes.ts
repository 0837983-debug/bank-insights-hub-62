/**
 * Маршруты аутентификации: login, refresh, logout, me.
 * Refresh-токен хранится в httpOnly cookie и в теле запроса.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as authService from "../services/auth/authService.js";
import { AppError, AppErrorCode } from "../types/errors.js";

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
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };
    if (!username || !password) {
      throw new AppError(AppErrorCode.USER_REQUIRED_FIELD);
    }

    const { auth, refreshToken } = await authService.login({ username, password });
    res.cookie("refresh_token", refreshToken, refreshCookieOptions());
    res.json(auth);
  } catch (error) {
    next(error);
  }
});

/** Обновление сессии. */
router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = extractRefreshToken(req);
    if (!refreshToken) {
      throw new AppError(AppErrorCode.AUTH_REFRESH_MISSING);
    }

    const { auth, refreshToken: newRefresh } = await authService.refresh(refreshToken);
    res.cookie("refresh_token", newRefresh, refreshCookieOptions());
    res.json(auth);
  } catch (error) {
    res.clearCookie("refresh_token", { path: "/api/auth" });
    next(error);
  }
});

/** Выход. */
router.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = extractRefreshToken(req);
    await authService.logout(refreshToken);
  } catch (error) {
    next(error);
    return;
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
