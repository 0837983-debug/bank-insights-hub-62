/**
 * Сервис авторизации: логин, обновление сессии, выход, создание супер-админа.
 */
import { AUTH } from "../../config/auth.js";
import type { AuthUser, AuthResponse } from "../../types/auth.js";
import { AppError, AppErrorCode } from "../../types/errors.js";
import { hashPassword, verifyPassword } from "./passwordService.js";
import {
  getRefreshTtlDays,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./tokenService.js";
import * as repo from "./userRepository.js";

/**
 * Гарантирует наличие супер-админа при первом запуске.
 * Если супер-админ отсутствует — создаёт его из конфигурации (env).
 */
export async function ensureSuperAdmin(): Promise<void> {
  const existing = await repo.findByUsername(AUTH.superAdmin.username);
  if (existing) return;

  const passwordHash = await hashPassword(AUTH.superAdmin.password);
  await repo.createUser({
    username: AUTH.superAdmin.username,
    passwordHash,
    role: "super_admin",
  });
}

/** Вход: проверка имени и пароля, выдача пары токенов. */
export async function login(params: {
  username: string;
  password: string;
}): Promise<{ auth: AuthResponse; refreshToken: string }> {
  const user = await repo.findByUsername(params.username);
  if (!user || !user.isActive) {
    throw new AppError(AppErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  const valid = await verifyPassword(params.password, user.passwordHash);
  if (!valid) {
    throw new AppError(AppErrorCode.AUTH_INVALID_CREDENTIALS);
  }

  const accessToken = signAccessToken({
    sub: String(user.id),
    username: user.username,
    role: user.role,
  });

  const { token: refreshToken, jti } = signRefreshToken(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + getRefreshTtlDays());
  await repo.saveRefreshToken({ userId: user.id, token: refreshToken, expiresAt });

  return {
    auth: {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      accessToken,
    },
    refreshToken,
  };
}

/** Обновление сессии: проверка refresh, выдача новой пары. */
export async function refresh(refreshToken: string): Promise<{
  auth: AuthResponse;
  refreshToken: string;
}> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(AppErrorCode.AUTH_TOKEN_EXPIRED);
  }

  const userId = Number(payload.sub);
  const user = await repo.findById(userId);
  if (!user || !user.isActive) {
    throw new AppError(AppErrorCode.AUTH_USER_BLOCKED);
  }

  const valid = await repo.isRefreshTokenValid(userId, refreshToken);
  if (!valid) {
    throw new AppError(AppErrorCode.AUTH_TOKEN_EXPIRED);
  }

  // Отзываем старый refresh (ротация токенов), выдаём новую пару
  await repo.revokeRefreshToken(refreshToken);

  const accessToken = signAccessToken({
    sub: String(user.id),
    username: user.username,
    role: user.role,
  });

  const newRefresh = signRefreshToken(user.id);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + getRefreshTtlDays());
  await repo.saveRefreshToken({
    userId: user.id,
    token: newRefresh.token,
    expiresAt,
  });

  return {
    auth: { user, accessToken },
    refreshToken: newRefresh.token,
  };
}

/** Выход: отзыв refresh-токена. */
export async function logout(refreshToken?: string): Promise<void> {
  if (!refreshToken) return;
  await repo.revokeRefreshToken(refreshToken);
}

/** Срок жизни refresh-токена в миллисекундах (для cookie maxAge). */
export function getRefreshTtlDaysMilliseconds(): number {
  return getRefreshTtlDays() * 24 * 60 * 60 * 1000;
}
