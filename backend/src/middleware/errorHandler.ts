/**
 * Единый центр обработки ошибок приложения.
 * Отвечает за то, чтобы на веб-интерфейс уходили только понятные сообщения
 * из карты ошибок (ERROR_CATALOG), а технические детали попадали только в логи.
 *
 * Поддерживает: AppError, ошибки валидации Zod, ошибки Multer (загрузка файлов),
 * ошибки Postgres и любые непредвиденные ошибки (маппятся в INTERNAL).
 */
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { DatabaseError } from "pg";
import { AppError, AppErrorCode, ERROR_CATALOG } from "../types/errors.js";

/**
 * Глобальный обработчик ошибок Express.
 * Вызывается последним в цепочке middleware при возникновении любой ошибки.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Определяем код ошибки по типу пойманной ошибки
  const appError = resolveError(err);

  // Технические детали (причина) пишем только в логи сервера
  console.error(`[error] ${appError.code}:`, err instanceof Error ? err.stack : err);

  // Клиенту отдаём только код и человекочитаемое сообщение
  const body: Record<string, unknown> = {
    code: appError.code,
    message: appError.message,
  };
  // В режиме разработки дополнительно показываем техническое сообщение (не отдаём в прод)
  if (process.env.NODE_ENV !== "production" && err instanceof Error && err.message) {
    body.details = err.message;
  }

  res.status(appError.status).json(body);
};

/**
 * Преобразует любую пойманную ошибку в AppError с корректным кодом.
 * Если ошибка уже AppError — возвращает её как есть.
 */
function resolveError(err: unknown): AppError {
  // Уже структурированная доменная ошибка
  if (err instanceof AppError) return err;

  // Ошибка валидации Zod (некорректные входные данные)
  if (err instanceof ZodError) {
    return new AppError(AppErrorCode.VALIDATION_FAILED, undefined, err);
  }

  // Ошибка загрузки файлов Multer
  if (err instanceof multer.MulterError) {
    const code =
      err.code === "LIMIT_FILE_SIZE"
        ? AppErrorCode.UPLOAD_SIZE_EXCEEDED
        : AppErrorCode.UPLOAD_PROCESSING;
    return new AppError(code, undefined, err);
  }

  // Ошибка базы данных Postgres
  if (err instanceof DatabaseError) {
    // Нарушение уникальности (дубликат ключа) — отдаём общее сообщение
    if (err.code === "23505") {
      return new AppError(AppErrorCode.USER_ALREADY_EXISTS, undefined, err);
    }
    return new AppError(AppErrorCode.INTERNAL, undefined, err);
  }

  // Всё остальное — общая внутренняя ошибка
  return new AppError(AppErrorCode.INTERNAL, undefined, err);
}

/** Проверка: существует ли код в карте ошибок (полезно в тестах и отладке). */
export function isKnownErrorCode(code: string): code is AppErrorCode {
  return code in ERROR_CATALOG;
}
