/**
 * Middleware аутентификации по access-токену (Bearer в заголовке Authorization).
 * При успехе загружает актуального пользователя из БД и кладёт в req.user.
 */
import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/auth/tokenService.js";
import { findById } from "../services/auth/userRepository.js";
import type { RequestUser } from "../types/auth.js";

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
      res.status(401).json({ error: "Требуется авторизация" });
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await findById(Number(payload.sub));

    // Пользователь не найден или заблокирован — отклоняем
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Пользователь не найден или заблокирован" });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    next();
  } catch {
    res.status(401).json({ error: "Токен недействителен или истёк" });
  }
}
