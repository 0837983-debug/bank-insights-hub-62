/**
 * Unit-тесты сервиса паролей.
 */
import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateStrongPassword,
} from "../passwordService.js";

describe("passwordService", () => {
  it("хеширует пароль и проверяет его верно", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("даёт разные хеши для одинаковых паролей (соль)", async () => {
    const h1 = await hashPassword("secret123");
    const h2 = await hashPassword("secret123");
    expect(h1).not.toBe(h2);
  });

  it("генерирует сложный пароль нужной длины", () => {
    const password = generateStrongPassword(20);
    expect(password.length).toBe(20);
    // Должен содержать буквы, цифры и спецсимволы
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%^&*()\-_=+]/);
  });
});
