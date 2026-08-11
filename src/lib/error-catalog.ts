/**
 * Карта ошибок на фронтенде.
 *
 * Принципы:
 *  1. Никогда не показываем пользователю сырой текст ошибки с сервера.
 *  2. Сервер возвращает код ошибки (поле "code"), а здесь — человекочитаемое
 *     сообщение на русском языке для этого кода.
 *  3. Все компоненты используют функцию toErrorMessage() для показа ошибок.
 *
 * Серверная документация по кодам: backend/docs/error-catalog.md (см. docs/error-catalog.md).
 */

/**
 * Коды ошибок, возвращаемые сервером (поле "code" в ответе об ошибке).
 * Дублирует enum с бэкенда (backend/src/types/errors.ts).
 */
export enum AppErrorCode {
  // --- Авторизация ---
  AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED",
  AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
  AUTH_USER_BLOCKED = "AUTH_USER_BLOCKED",
  AUTH_REFRESH_MISSING = "AUTH_REFRESH_MISSING",
  AUTH_FORBIDDEN = "AUTH_FORBIDDEN",
  AUTH_RATE_LIMITED = "AUTH_RATE_LIMITED",

  // --- Пользователи ---
  USER_REQUIRED_FIELD = "USER_REQUIRED_FIELD",
  USER_INVALID_ROLE = "USER_INVALID_ROLE",
  USER_SUPER_ADMIN_FORBIDDEN = "USER_SUPER_ADMIN_FORBIDDEN",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_SELF_ACTION = "USER_SELF_ACTION",
  USER_ACTIVE_REQUIRED = "USER_ACTIVE_REQUIRED",

  // --- Загрузка файлов ---
  UPLOAD_NO_FILE = "UPLOAD_NO_FILE",
  UPLOAD_EMPTY = "UPLOAD_EMPTY",
  UPLOAD_SIZE_EXCEEDED = "UPLOAD_SIZE_EXCEEDED",
  UPLOAD_COUNT_INVALID = "UPLOAD_COUNT_INVALID",
  UPLOAD_BAD_FORMAT = "UPLOAD_BAD_FORMAT",
  UPLOAD_PROCESSING = "UPLOAD_PROCESSING",
  UPLOAD_NOT_FOUND = "UPLOAD_NOT_FOUND",
  UPLOAD_PARAM_REQUIRED = "UPLOAD_PARAM_REQUIRED",

  // --- Данные и запросы ---
  QUERY_INVALID_PARAMS = "QUERY_INVALID_PARAMS",
  QUERY_INVALID_CONFIG = "QUERY_INVALID_CONFIG",
  QUERY_MAPPING_INCOMPLETE = "QUERY_MAPPING_INCOMPLETE",

  // --- Прочее ---
  VALIDATION_FAILED = "VALIDATION_FAILED",
  NOT_FOUND_ROUTE = "NOT_FOUND_ROUTE",
  NOT_FOUND_DATA = "NOT_FOUND_DATA",
  INTERNAL = "INTERNAL",

  // --- Специальные коды, которые может сгенерировать сам фронтенд ---
  /** Нет соединения с сервером. */
  NETWORK = "NETWORK",
  /** Неизвестная ошибка. */
  UNKNOWN = "UNKNOWN",
}

/**
 * Карта кодов -> человекочитаемое сообщение на русском языке.
 * Сообщения дублируют серверный каталог (backend/src/types/errors.ts),
 * чтобы фронтенд не зависел от текстов, приходящих с сервера.
 */
export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  // --- Авторизация ---
  [AppErrorCode.AUTH_INVALID_CREDENTIALS]: "Неверное имя пользователя или пароль",
  [AppErrorCode.AUTH_UNAUTHORIZED]: "Требуется авторизация",
  [AppErrorCode.AUTH_TOKEN_EXPIRED]: "Сессия истекла. Войдите заново",
  [AppErrorCode.AUTH_USER_BLOCKED]: "Учётная запись не найдена или заблокирована",
  [AppErrorCode.AUTH_REFRESH_MISSING]: "Не удалось обновить сессию",
  [AppErrorCode.AUTH_FORBIDDEN]: "Недостаточно прав для выполнения действия",
  [AppErrorCode.AUTH_RATE_LIMITED]: "Слишком много попыток. Попробуйте позже",

  // --- Пользователи ---
  [AppErrorCode.USER_REQUIRED_FIELD]: "Не все обязательные поля заполнены",
  [AppErrorCode.USER_INVALID_ROLE]: "Указана недопустимая роль",
  [AppErrorCode.USER_SUPER_ADMIN_FORBIDDEN]:
    "Создание супер-администратора через интерфейс запрещено",
  [AppErrorCode.USER_ALREADY_EXISTS]: "Пользователь с таким именем уже существует",
  [AppErrorCode.USER_NOT_FOUND]: "Пользователь не найден",
  [AppErrorCode.USER_SELF_ACTION]: "Нельзя выполнить это действие над самим собой",
  [AppErrorCode.USER_ACTIVE_REQUIRED]: "Не передан статус учётной записи",

  // --- Загрузка файлов ---
  [AppErrorCode.UPLOAD_NO_FILE]: "Файл не был загружен",
  [AppErrorCode.UPLOAD_EMPTY]: "Загруженный файл пустой",
  [AppErrorCode.UPLOAD_SIZE_EXCEEDED]: "Размер файла превышает максимально допустимый",
  [AppErrorCode.UPLOAD_COUNT_INVALID]: "Неверное количество файлов",
  [AppErrorCode.UPLOAD_BAD_FORMAT]: "Файл должен быть в формате XLSX",
  [AppErrorCode.UPLOAD_PROCESSING]: "Не удалось обработать файл",
  [AppErrorCode.UPLOAD_NOT_FOUND]: "Загрузка не найдена",
  [AppErrorCode.UPLOAD_PARAM_REQUIRED]: "Не передан обязательный параметр",

  // --- Данные и запросы ---
  [AppErrorCode.QUERY_INVALID_PARAMS]: "Неверные параметры запроса",
  [AppErrorCode.QUERY_INVALID_CONFIG]: "Некорректная конфигурация запроса",
  [AppErrorCode.QUERY_MAPPING_INCOMPLETE]: "Отсутствуют обязательные поля в маппинге",

  // --- Прочее ---
  [AppErrorCode.VALIDATION_FAILED]: "Проверьте введённые данные",
  [AppErrorCode.NOT_FOUND_ROUTE]: "Запрашиваемая страница или адрес не найдены",
  [AppErrorCode.NOT_FOUND_DATA]: "Данные не найдены",
  [AppErrorCode.INTERNAL]: "Произошла ошибка на сервере. Попробуйте позже",

  // --- Специальные ---
  [AppErrorCode.NETWORK]: "Не удаётся связаться с сервером. Проверьте интернет и попробуйте ещё раз",
  [AppErrorCode.UNKNOWN]: "Произошла непредвиденная ошибка. Попробуйте позже",
};

/**
 * Интерфейс ошибки API, расширенный кодом из карты.
 * Базовый класс APIError находится в lib/api.ts.
 */
export interface ErrorWithCode {
  /** Код ошибки из карты (если известен). */
  code?: string;
  /** Сырое сообщение (не показывается пользователю напрямую). */
  message?: string;
  /** HTTP-статус (если есть). */
  status?: number;
}

/**
 * Преобразует любую пойманную ошибку в понятное русское сообщение.
 * Используется во всех компонентах вместо отображения err.message.
 *
 * @param error - пойманная ошибка (APIError, TypeError, Error и т.д.)
 * @returns человекочитаемое сообщение на русском языке
 */
export function toErrorMessage(error: unknown): string {
  // Ошибка сети (не удалось достучаться до сервера)
  if (error instanceof TypeError) {
    return ERROR_MESSAGES[AppErrorCode.NETWORK];
  }

  // Ошибка от API с известным кодом
  if (error && typeof error === "object" && "code" in error) {
    const err = error as ErrorWithCode;
    if (err.code && err.code in ERROR_MESSAGES) {
      return ERROR_MESSAGES[err.code as AppErrorCode];
    }
  }

  // Ошибка от API по HTTP-статусу (код неизвестен) — обобщаем
  if (error && typeof error === "object" && "status" in error) {
    const err = error as ErrorWithCode;
    if (typeof err.status === "number") {
      if (err.status === 401) return ERROR_MESSAGES[AppErrorCode.AUTH_UNAUTHORIZED];
      if (err.status === 403) return ERROR_MESSAGES[AppErrorCode.AUTH_FORBIDDEN];
      if (err.status === 404) return ERROR_MESSAGES[AppErrorCode.NOT_FOUND_DATA];
      if (err.status >= 500) return ERROR_MESSAGES[AppErrorCode.INTERNAL];
    }
  }

  // Неизвестная ошибка — обобщённое сообщение (сырой текст не показываем)
  return ERROR_MESSAGES[AppErrorCode.UNKNOWN];
}
