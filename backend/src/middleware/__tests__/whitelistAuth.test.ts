/**
 * Тесты middleware белого списка (deny-by-default).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { whitelistAuth } from "../whitelistAuth.js";
import { authenticate } from "../authenticate.js";

// Мокаем authenticate — проверяем только логику белого списка
vi.mock("../authenticate.js", () => ({
  authenticate: vi.fn((_req: unknown, _res: unknown, next: () => void) => {
    next();
  }),
}));

const mockedAuthenticate = vi.mocked(authenticate);

function makeCtx(method: string, path: string) {
  const req = { method, path } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe("whitelistAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("пропускает открытый путь без аутентификации", () => {
    const { req, res, next } = makeCtx("GET", "/health");
    whitelistAuth(req, res, next);
    expect(mockedAuthenticate).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("пропускает POST /auth/login без аутентификации", () => {
    const { req, res, next } = makeCtx("POST", "/auth/login");
    whitelistAuth(req, res, next);
    expect(mockedAuthenticate).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("пропускает POST /auth/refresh без аутентификации", () => {
    const { req, res, next } = makeCtx("POST", "/auth/refresh");
    whitelistAuth(req, res, next);
    expect(mockedAuthenticate).not.toHaveBeenCalled();
  });

  it("требует аутентификацию для защищённого пути", () => {
    const { req, res, next } = makeCtx("GET", "/data");
    whitelistAuth(req, res, next);
    expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
  });

  it("требует аутентификацию для /users", () => {
    const { req, res, next } = makeCtx("GET", "/users");
    whitelistAuth(req, res, next);
    expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
  });

  it("требует аутентификацию для POST /upload", () => {
    const { req, res, next } = makeCtx("POST", "/upload");
    whitelistAuth(req, res, next);
    expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
  });
});
