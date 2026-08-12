/**
 * Хранилище access-токена.
 * Хранится в памяти (безопаснее, чем localStorage). Refresh-токен живёт
 * в httpOnly-cookie и автоматически уходит на /api/auth/*.
 */

let accessToken: string | null = null;

/** Устанавливает access-токен. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Возвращает access-токен или null. */
export function getAccessToken(): string | null {
  return accessToken;
}

/** Очищает access-токен (выход). */
export function clearAccessToken(): void {
  accessToken = null;
}
