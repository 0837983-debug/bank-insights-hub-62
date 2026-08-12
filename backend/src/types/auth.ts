/**
 * Типы и интерфейсы модуля авторизации.
 */
import type { Role } from "../config/auth.js";

export type { Role };

/** Пользователь, возвращаемый из БД (без пароля). */
export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

/** Пользователь с хешем пароля (для внутреннего использования). */
export interface AuthUserWithPassword extends AuthUser {
  passwordHash: string;
}

/** Полезная нагрузка access-токена. */
export interface AccessTokenPayload {
  sub: string; // id пользователя
  username: string;
  role: Role;
}

/** Полезная нагрузка refresh-токена. */
export interface RefreshTokenPayload {
  sub: string; // id пользователя
  jti: string; // уникальный идентификатор сессии
}

/** Пользователь, прикрепляемый к запросу после аутентификации. */
export interface RequestUser {
  id: number;
  username: string;
  role: Role;
}

/** Ответ на успешный вход. */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}
