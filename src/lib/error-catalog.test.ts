/**
 * Тесты фронтенд-карты ошибок:
 * - полнота и корректность ERROR_MESSAGES;
 * - поведение toErrorMessage для разных типов ошибок.
 */
import { describe, it, expect } from "vitest";
import {
  AppErrorCode,
  ERROR_MESSAGES,
  toErrorMessage,
  type ErrorWithCode,
} from "./error-catalog";

/** Класс, имитирующий APIError из lib/api.ts (для тестов без реальной сети). */
class MockAPIError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.code = code;
  }
}

describe("ERROR_MESSAGES (карта на клиенте)", () => {
  it("содержит запись для каждого кода из enum", () => {
    const allCodes = Object.values(AppErrorCode);
    for (const code of allCodes) {
      expect(ERROR_MESSAGES[code]).toBeDefined();
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
    expect(Object.keys(ERROR_MESSAGES)).toHaveLength(allCodes.length);
  });

  it("все сообщения на русском, без технических терминов", () => {
    for (const code of Object.values(AppErrorCode) as AppErrorCode[]) {
      const message = ERROR_MESSAGES[code];
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/\b(error|failed|invalid|exception|internal)\b/i);
    }
  });

  it("сообщения ключевых ошибок корректны", () => {
    expect(ERROR_MESSAGES[AppErrorCode.AUTH_INVALID_CREDENTIALS]).toBe(
      "Неверное имя пользователя или пароль"
    );
    expect(ERROR_MESSAGES[AppErrorCode.NETWORK]).toContain("сервер");
    expect(ERROR_MESSAGES[AppErrorCode.INTERNAL]).toContain("Попробуйте позже");
    expect(ERROR_MESSAGES[AppErrorCode.UNKNOWN]).toContain("непредвиденная");
  });
});

describe("toErrorMessage", () => {
  it("возвращает сообщение по известному коду", () => {
    const err: ErrorWithCode = { code: AppErrorCode.AUTH_INVALID_CREDENTIALS };
    expect(toErrorMessage(err)).toBe("Неверное имя пользователя или пароль");
  });

  it("преобразует APIError с кодом в русское сообщение", () => {
    const err = new MockAPIError(
      "AUTH_INVALID_CREDENTIALS",
      401,
      AppErrorCode.AUTH_INVALID_CREDENTIALS
    );
    expect(toErrorMessage(err)).toBe("Неверное имя пользователя или пароль");
  });

  it("маппит сетевую ошибку (TypeError) в NETWORK", () => {
    const netErr = new TypeError("Failed to fetch");
    expect(toErrorMessage(netErr)).toBe(
      "Не удаётся связаться с сервером. Проверьте интернет и попробуйте ещё раз"
    );
  });

  it("маппит 401 по статусу в AUTH_UNAUTHORIZED", () => {
    const err: ErrorWithCode = { status: 401 };
    expect(toErrorMessage(err)).toBe("Требуется авторизация");
  });

  it("маппит 403 по статусу в AUTH_FORBIDDEN", () => {
    const err: ErrorWithCode = { status: 403 };
    expect(toErrorMessage(err)).toBe("Недостаточно прав для выполнения действия");
  });

  it("маппит 404 по статусу в NOT_FOUND_DATA", () => {
    const err: ErrorWithCode = { status: 404 };
    expect(toErrorMessage(err)).toBe("Данные не найдены");
  });

  it("маппит 5xx по статусу в INTERNAL", () => {
    const err: ErrorWithCode = { status: 503 };
    expect(toErrorMessage(err)).toBe("Произошла ошибка на сервере. Попробуйте позже");
  });

  it("возвращает UNKNOWN для неизвестной ошибки, не показывая сырой текст", () => {
    const err: ErrorWithCode = { message: "какой-то сырой текст ошибки" };
    const result = toErrorMessage(err);
    expect(result).toBe("Произошла непредвиденная ошибка. Попробуйте позже");
    expect(result).not.toContain("какой-то сырой текст ошибки");
  });

  it("возвращает UNKNOWN для null/undefined/строк", () => {
    expect(toErrorMessage(null)).toBe("Произошла непредвиденная ошибка. Попробуйте позже");
    expect(toErrorMessage(undefined)).toBe("Произошла непредвиденная ошибка. Попробуйте позже");
    expect(toErrorMessage("string error")).toBe(
      "Произошла непредвиденная ошибка. Попробуйте позже"
    );
  });

  it("не утекает сырое сообщение даже при незнакомом коде", () => {
    const err: ErrorWithCode = { code: "SOME_UNKNOWN_CODE", message: "secret raw text" };
    const result = toErrorMessage(err);
    expect(result).toBe("Произошла непредвиденная ошибка. Попробуйте позже");
    expect(result).not.toContain("secret raw text");
  });
});
