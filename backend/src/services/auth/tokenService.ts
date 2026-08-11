/**
 * Сервис работы с JWT-токенами.
 * Подпись/проверка access и refresh токенов через jsonwebtoken.
 */
import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { AUTH } from "../../config/auth.js";
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "../../types/auth.js";

/** Создаёт access-токен (короткоживущий). */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, AUTH.accessSecret, {
    expiresIn: AUTH.accessTtl,
  } as SignOptions);
}

/**
 * Создаёт refresh-токен.
 * @returns токен и его уникальный идентификатор (jti)
 */
export function signRefreshToken(userId: number): {
  token: string;
  jti: string;
} {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: String(userId), jti },
    AUTH.refreshSecret,
    { expiresIn: `${AUTH.refreshTtlDays}d` } as SignOptions
  );
  return { token, jti };
}

/** Проверяет и возвращает payload access-токена. Бросает исключение при невалидности. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, AUTH.accessSecret) as JwtPayload;
  return {
    sub: String(decoded.sub),
    username: String(decoded.username),
    role: decoded.role as AccessTokenPayload["role"],
  };
}

/** Проверяет и возвращает payload refresh-токена. Бросает исключение при невалидности. */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, AUTH.refreshSecret) as JwtPayload;
  return {
    sub: String(decoded.sub),
    jti: String(decoded.jti),
  };
}

/** Считает SHA-256 хеш токена (для хранения в БД). */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Возвращает срок жизни refresh-токена в днях. */
export function getRefreshTtlDays(): number {
  return AUTH.refreshTtlDays;
}
