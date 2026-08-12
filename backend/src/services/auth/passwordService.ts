/**
 * Сервис хеширования и проверки паролей.
 * Использует bcryptjs (чистая JS-реализация, без нативных сборок).
 */
import bcrypt from "bcryptjs";

/** Число раундов соли для bcrypt (рекомендуемое значение 10–12). */
const SALT_ROUNDS = 10;

/** Хеширует пароль. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Сравнивает пароль с хешем. Возвращает true при совпадении. */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Генерирует случайный сложный пароль.
 * Содержит буквы (верхний/нижний регистр), цифры и спецсимволы.
 */
export function generateStrongPassword(length = 20): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*()-_=+";

  // Гарантированно включаем по одному символу каждого набора
  const all = upper + lower + digits + special;
  const result = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    digits[randomIndex(digits.length)],
    special[randomIndex(special.length)],
  ];

  // Заполняем остаток случайными символами из общего набора
  for (let i = result.length; i < length; i += 1) {
    result.push(all[randomIndex(all.length)]);
  }

  // Перемешиваем, чтобы гарантированные символы не оказались в начале
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
}

/** Случайный индекс в диапазоне [0, max). */
function randomIndex(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}
