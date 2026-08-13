/**
 * Клиент API авторизации и управления пользователями.
 */
import { APIError, API_BASE_URL } from "./api";
import { clearAccessToken, getAccessToken, setAccessToken } from "./auth-storage";

/** Роли системы на клиенте. */
export type Role = "super_admin" | "manager" | "viewer";

/** Пользователь из API. */
export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

/** Ответ на вход/обновление. */
export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

/** Ответ с сгенерированным паролем (показывается один раз). */
export interface GeneratedPasswordResponse {
  generatedPassword?: string;
  user?: AuthUser;
}

/** Базовый fetch с авторизацией. */
async function authFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  withAuth = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (withAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      code?: string;
      error?: string;
    };
    throw new APIError(
      errorData.code || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData,
      errorData.code
    );
  }

  return response.json() as Promise<T>;
}

/** Вход. */
export async function apiLogin(username: string, password: string): Promise<AuthResponse> {
  const data = await authFetch<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    false
  );
  setAccessToken(data.accessToken);
  return data;
}

/** Обновление сессии (refresh-токен берётся из httpOnly-cookie). */
export async function apiRefresh(): Promise<AuthResponse> {
  const data = await authFetch<AuthResponse>(
    "/auth/refresh",
    {
      method: "POST",
    },
    false
  );
  setAccessToken(data.accessToken);
  return data;
}

/** Выход. */
export async function apiLogout(): Promise<void> {
  try {
    await authFetch("/auth/logout", { method: "POST" }, false);
  } finally {
    clearAccessToken();
  }
}

/** Текущий пользователь. */
export async function apiMe(): Promise<{ user: AuthUser }> {
  return authFetch<{ user: AuthUser }>("/auth/me");
}

/** Список пользователей (только супер-админ). */
export async function apiListUsers(): Promise<{ users: AuthUser[] }> {
  return authFetch<{ users: AuthUser[] }>("/users");
}

/** Создание пользователя. Пароль возвращается один раз. */
export async function apiCreateUser(
  username: string,
  role: Role,
  password?: string
): Promise<GeneratedPasswordResponse> {
  return authFetch<GeneratedPasswordResponse>("/users", {
    method: "POST",
    body: JSON.stringify({ username, role, password }),
  });
}

/** Смена роли. */
export async function apiUpdateRole(id: number, role: Role): Promise<{ user: AuthUser }> {
  return authFetch<{ user: AuthUser }>(`/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

/** Блокировка/разблокировка. */
export async function apiSetActive(id: number, isActive: boolean): Promise<{ user: AuthUser }> {
  return authFetch<{ user: AuthUser }>(`/users/${id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

/** Удаление пользователя. */
export async function apiDeleteUser(id: number): Promise<{ success: boolean }> {
  return authFetch<{ success: boolean }>(`/users/${id}`, {
    method: "DELETE",
  });
}

/** Сброс пароля. Новый пароль возвращается один раз. */
export async function apiResetPassword(id: number): Promise<GeneratedPasswordResponse> {
  return authFetch<GeneratedPasswordResponse>(`/users/${id}/reset-password`, {
    method: "POST",
  });
}
