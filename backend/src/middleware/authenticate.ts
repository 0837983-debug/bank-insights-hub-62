/**
 * Middleware аутентификации по access-токену (Bearer в заголовке Authorization).
 * При успехе загружает актуального пользователя из БД и кладёт в req.user.
 */
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/auth/tokenService.js";
import { findById } from "../services/auth/userRepository.js";
import type { RequestUser } from "../types/auth.js";
import { AppError, AppErrorCode } from "../types/errors.js";

/** Расширение объекта Request полем user (глобально для всего приложения). */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

/** Извлекает Bearer-токен из заголовка Authorization. */
function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/** Middleware аутентификации. */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      next(new AppError(AppErrorCode.AUTH_UNAUTHORIZED));
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await findById(Number(payload.sub));

    // Пользователь не найден или заблокирован — отклоняем
    if (!user || !user.isActive) {
      next(new AppError(AppErrorCode.AUTH_USER_BLOCKED));
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    next();
  } catch {
    next(new AppError(AppErrorCode.AUTH_TOKEN_EXPIRED));
  }
}
