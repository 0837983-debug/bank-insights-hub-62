/**
 * Тесты серверной карты ошибок:
 * - корректность enum AppErrorCode и карты ERROR_CATALOG;
 * - поведение класса AppError;
 * - работу утилиты mapBuilderError;
 * - работу единого обработчика errorHandler.
 */
import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import { DatabaseError } from "pg";
import {
  AppError,
  AppErrorCode,
  ERROR_CATALOG,
  mapBuilderError,
} from "../errors.js";
import { errorHandler, isKnownErrorCode } from "../../middleware/errorHandler.js";
import type { Request } from "express";

/** Минимальная имитация ответа Express для проверки errorHandler. */
interface MockResponse {
  statusCode: number;
  body?: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

describe("AppErrorCode (enum)", () => {
  it("содержит все категории кодов", () => {
    const allCodes = Object.values(AppErrorCode);
    // Ожидаем коды по категориям
    expect(allCodes).toEqual(
      expect.arrayContaining([
        AppErrorCode.AUTH_INVALID_CREDENTIALS,
        AppErrorCode.AUTH_UNAUTHORIZED,
        AppErrorCode.AUTH_TOKEN_EXPIRED,
        AppErrorCode.USER_NOT_FOUND,
        AppErrorCode.UPLOAD_SIZE_EXCEEDED,
        AppErrorCode.QUERY_INVALID_PARAMS,
        AppErrorCode.VALIDATION_FAILED,
        AppErrorCode.NOT_FOUND_ROUTE,
        AppErrorCode.INTERNAL,
      ])
    );
  });

  it("все значения enum уникальны", () => {
    const values = Object.values(AppErrorCode);
    expect(new Set(values).size).toBe(values.length);
  });

  it("каждый элемент enum является валидным кодом в карте", () => {
    const allCodes = Object.values(AppErrorCode);
    for (const code of allCodes) {
      expect(isKnownErrorCode(code)).toBe(true);
      expect(ERROR_CATALOG[code]).toBeDefined();
    }
  });
});

describe("ERROR_CATALOG", () => {
  it("для каждого кода из enum есть корректная запись", () => {
    const allCodes = Object.values(AppErrorCode);
    expect(Object.keys(ERROR_CATALOG)).toHaveLength(allCodes.length);

    for (const code of allCodes) {
      const def = ERROR_CATALOG[code];
      expect(typeof def.httpStatus).toBe("number");
      expect(def.httpStatus).toBeGreaterThanOrEqual(400);
      expect(typeof def.message).toBe("string");
      expect(def.message.length).toBeGreaterThan(0);
      expect(typeof def.description).toBe("string");
    }
  });

  it("все сообщения написаны на русском и не содержат технических терминов", () => {
    for (const code of Object.values(AppErrorCode) as AppErrorCode[]) {
      const message = ERROR_CATALOG[code].message;
      expect(message.length).toBeGreaterThan(0);
      // Не допускаем англоязычных технических текстов
      expect(message).not.toMatch(/\b(error|failed|invalid|exception|internal)\b/i);
    }
  });

  it("у каждого кода корректный HTTP-статус", () => {
    expect(ERROR_CATALOG[AppErrorCode.AUTH_INVALID_CREDENTIALS].httpStatus).toBe(401);
    expect(ERROR_CATALOG[AppErrorCode.AUTH_FORBIDDEN].httpStatus).toBe(403);
    expect(ERROR_CATALOG[AppErrorCode.AUTH_RATE_LIMITED].httpStatus).toBe(429);
    expect(ERROR_CATALOG[AppErrorCode.USER_NOT_FOUND].httpStatus).toBe(404);
    expect(ERROR_CATALOG[AppErrorCode.UPLOAD_SIZE_EXCEEDED].httpStatus).toBe(400);
    expect(ERROR_CATALOG[AppErrorCode.INTERNAL].httpStatus).toBe(500);
  });
});

describe("AppError", () => {
  it("создаёт ошибку с корректным кодом, статусом и русским сообщением", () => {
    const err = new AppError(AppErrorCode.AUTH_INVALID_CREDENTIALS);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe(AppErrorCode.AUTH_INVALID_CREDENTIALS);
    expect(err.status).toBe(401);
    expect(err.message).toBe("Неверное имя пользователя или пароль");
  });

  it("сохраняет details и cause для логирования", () => {
    const cause = new Error("причина");
    const err = new AppError(AppErrorCode.INTERNAL, { uploadId: 5 }, cause);
    expect(err.details).toEqual({ uploadId: 5 });
    expect(err.cause).toBe(cause);
  });

  it("fromUnknown возвращает существующий AppError как есть", () => {
    const original = new AppError(AppErrorCode.AUTH_FORBIDDEN);
    expect(AppError.fromUnknown(original)).toBe(original);
  });

  it("fromUnknown преобразует обычную ошибку в INTERNAL", () => {
    const converted = AppError.fromUnknown(new Error("что-то сломалось"));
    expect(converted).toBeInstanceOf(AppError);
    expect(converted.code).toBe(AppErrorCode.INTERNAL);
    expect(converted.status).toBe(500);
    expect(converted.cause).toBeInstanceOf(Error);
  });
});

describe("mapBuilderError", () => {
  it("возвращает AppError как есть", () => {
    const original = new AppError(AppErrorCode.QUERY_INVALID_PARAMS);
    expect(mapBuilderError(original)).toBe(original);
  });

  it("маппит invalid JSON в VALIDATION_FAILED", () => {
    const result = mapBuilderError(new Error("invalid JSON in params"));
    expect(result.code).toBe(AppErrorCode.VALIDATION_FAILED);
  });

  it("маппит invalid params в QUERY_INVALID_PARAMS", () => {
    const result = mapBuilderError(new Error("invalid params: foo"));
    expect(result.code).toBe(AppErrorCode.QUERY_INVALID_PARAMS);
  });

  it("маппит invalid config в QUERY_INVALID_CONFIG", () => {
    const result = mapBuilderError(new Error("invalid config"));
    expect(result.code).toBe(AppErrorCode.QUERY_INVALID_CONFIG);
  });

  it("маппит wrap_json=false в QUERY_INVALID_CONFIG", () => {
    const result = mapBuilderError(new Error("wrap_json=false: query must have wrapJson=true"));
    expect(result.code).toBe(AppErrorCode.QUERY_INVALID_CONFIG);
  });

  it("маппит неизвестное сообщение в QUERY_INVALID_CONFIG (без падения)", () => {
    const result = mapBuilderError(new Error("какая-то ошибка"));
    expect(result).toBeInstanceOf(AppError);
  });
});

describe("errorHandler (единый центр)", () => {
  /** Вспомогательный объект-заглушка ответа Express. */
  function mockRes(): MockResponse {
    const res: MockResponse = {
      statusCode: 200,
      body: undefined,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };
    return res;
  }

  /** Вызывает errorHandler, приводя ответ к нужному типу. */
  function runErrorHandler(err: unknown, res: MockResponse): void {
    errorHandler(err, {} as Request, res as never, () => {});
  }

  it("отдаёт код и сообщение для AppError", () => {
    const res = mockRes();
    runErrorHandler(new AppError(AppErrorCode.AUTH_FORBIDDEN), res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      code: AppErrorCode.AUTH_FORBIDDEN,
      message: "Недостаточно прав для выполнения действия",
    });
  });

  it("преобразует ZodError в VALIDATION_FAILED (400)", () => {
    const res = mockRes();
    const zodErr = new ZodError([
      {
        code: "invalid_type",
        path: ["x"],
        expected: "string",
        received: "number",
        message: "Invalid input",
      },
    ]);
    runErrorHandler(zodErr, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: AppErrorCode.VALIDATION_FAILED });
  });

  it("преобразует ошибку БД (уникальность) в USER_ALREADY_EXISTS (409)", () => {
    const res = mockRes();
    const dbErr = new DatabaseError("duplicate key", 1, "error");
    dbErr.code = "23505";
    runErrorHandler(dbErr, res);
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: AppErrorCode.USER_ALREADY_EXISTS });
  });

  it("преобразует неизвестную ошибку в INTERNAL (500) с обобщённым сообщением", () => {
    const res = mockRes();
    runErrorHandler(new Error("сырой технический текст"), res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({ code: AppErrorCode.INTERNAL });
    // Главное поле message всегда дружелюбное (не содержит сырой текст)
    const body = res.body as { message: string };
    expect(body.message).toBe("Произошла ошибка на сервере. Попробуйте позже");
    // Сырой текст может попасть только в details (в dev-режиме), но не в message
    expect(body.message).not.toContain("сырой технический текст");
  });

  it("в production-режиме сырое сообщение не попадает в ответ вообще", () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const res = mockRes();
      runErrorHandler(new Error("секретный технический текст"), res);
      expect(res.statusCode).toBe(500);
      const body = res.body as { details?: string; message: string };
      expect(body.message).toBe("Произошла ошибка на сервере. Попробуйте позже");
      expect(body.details).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain("секретный технический текст");
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
