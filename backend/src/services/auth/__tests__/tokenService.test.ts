/**
 * Unit-тесты сервиса JWT-токенов.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
} from "../tokenService.js";

describe("tokenService", () => {
  it("подписывает и проверяет access-токен", () => {
    const token = signAccessToken({
      sub: "1",
      username: "admin",
      role: "super_admin",
    });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("1");
    expect(payload.username).toBe("admin");
    expect(payload.role).toBe("super_admin");
  });

  it("отклоняет невалидный access-токен", () => {
    expect(() => verifyAccessToken("not-a-token")).toThrow();
  });

  it("создаёт refresh-токен с уникальным jti", () => {
    const a = signRefreshToken(1);
    const b = signRefreshToken(1);
    expect(a.jti).not.toBe(b.jti);
    expect(a.token).not.toBe(b.token);
    const payload = verifyRefreshToken(a.token);
    expect(payload.sub).toBe("1");
    expect(payload.jti).toBe(a.jti);
  });

  it("считает стабильный хеш токена", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});
