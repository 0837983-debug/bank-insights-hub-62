/**
 * Репозиторий пользователей и сессий (refresh-токенов).
 * Работает напрямую с pool. Не хранит открытые пароли.
 */
import { pool } from "../../config/database.js";
import { hashToken } from "./tokenService.js";
import type {
  AuthUser,
  AuthUserWithPassword,
  Role,
} from "../../types/auth.js";

/** Маппинг строки БД в объект пользователя. */
function mapUser(row: any): AuthUser {
  return {
    id: Number(row.id),
    username: row.username,
    role: row.role as Role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

/** Находит пользователя по имени (включая хеш пароля). */
export async function findByUsername(
  username: string
): Promise<AuthUserWithPassword | null> {
  const result = await pool.query(
    "SELECT * FROM auth.users WHERE username = $1",
    [username]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
  };
}

/** Находит пользователя по id (без хеша пароля). */
export async function findById(id: number): Promise<AuthUser | null> {
  const result = await pool.query(
    "SELECT * FROM auth.users WHERE id = $1",
    [id]
  );
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

/** Создаёт пользователя. Возвращает созданного пользователя. */
export async function createUser(params: {
  username: string;
  passwordHash: string;
  role: Role;
}): Promise<AuthUser> {
  const result = await pool.query(
    `INSERT INTO auth.users (username, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.username, params.passwordHash, params.role]
  );
  return mapUser(result.rows[0]);
}

/** Обновляет роль пользователя. Возвращает обновлённого пользователя. */
export async function updateRole(id: number, role: Role): Promise<AuthUser | null> {
  const result = await pool.query(
    `UPDATE auth.users SET role = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [role, id]
  );
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

/** Изменяет статус активности (блокировка/разблокировка). */
export async function setActive(id: number, isActive: boolean): Promise<AuthUser | null> {
  const result = await pool.query(
    `UPDATE auth.users SET is_active = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [isActive, id]
  );
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

/** Удаляет пользователя и его сессии. Возвращает true, если удалён. */
export async function deleteUser(id: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM auth.users WHERE id = $1", [id]);
  return result.rowCount !== null && result.rowCount > 0;
}

/** Смена хеша пароля. */
export async function setPassword(id: number, passwordHash: string): Promise<void> {
  await pool.query(
    "UPDATE auth.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [passwordHash, id]
  );
}

/** Список пользователей (без хешей паролей), сортировка по id. */
export async function listUsers(): Promise<AuthUser[]> {
  const result = await pool.query(
    "SELECT * FROM auth.users ORDER BY id ASC"
  );
  return result.rows.map(mapUser);
}

/** Сохраняет refresh-токен (сессию). */
export async function saveRefreshToken(params: {
  userId: number;
  token: string;
  expiresAt: Date;
}): Promise<void> {
  await pool.query(
    `INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [params.userId, hashToken(params.token), params.expiresAt]
  );
}

/** Проверяет наличие активного (не отозванного и не истёкшего) refresh-токена. */
export async function isRefreshTokenValid(
  userId: number,
  token: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM auth.refresh_tokens
     WHERE user_id = $1 AND token_hash = $2
       AND revoked_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP`,
    [userId, hashToken(token)]
  );
  return result.rows.length > 0;
}

/** Отзывает refresh-токен (выход). */
export async function revokeRefreshToken(token: string): Promise<void> {
  await pool.query(
    `UPDATE auth.refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1`,
    [hashToken(token)]
  );
}

/** Отзывает все сессии пользователя (смена пароля/блокировка). */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await pool.query(
    `UPDATE auth.refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

/** Удаляет устаревшие сессии (срок действия истёк или отозваны). */
export async function cleanupExpiredTokens(): Promise<void> {
  await pool.query(
    `DELETE FROM auth.refresh_tokens
     WHERE expires_at <= CURRENT_TIMESTAMP OR revoked_at IS NOT NULL`
  );
}
