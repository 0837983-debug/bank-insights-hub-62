/**
 * Единая система ошибок приложения (карта ошибок).
 *
 * Принципы:
 *  1. На веб-интерфейс НИКОГДА не попадают сырые ошибки с сервера.
 *  2. Каждая ошибка имеет машиночитаемый код (AppErrorCode).
 *  3. Коду соответствует человекочитаемое сообщение на русском языке (ERROR_CATALOG).
 *  4. Все ошибки создаются через класс AppError и обрабатываются единым errorHandler.
 *
 * Документация по кодам ошибок: docs/error-catalog.md
 */

/**
 * Перечисление кодов ошибок приложения.
 * Префикс категории: AUTH (авторизация), USER (пользователи), UPLOAD (загрузка файлов),
 * QUERY (построение запросов/данные), VALIDATION (проверка входных данных),
 * RATE (ограничение частоты), NOT_FOUND (не найдено), INTERNAL (внутренняя ошибка).
 */
export enum AppErrorCode {
  // --- Авторизация ---
  /** Неверное имя пользователя или пароль. */
  AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  /** Отсутствует/недействителен access-токен. */
  AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED",
  /** Токен истёк или недействителен. */
  AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
  /** Пользователь не найден или заблокирован. */
  AUTH_USER_BLOCKED = "AUTH_USER_BLOCKED",
  /** Отсутствует refresh-токен. */
  AUTH_REFRESH_MISSING = "AUTH_REFRESH_MISSING",
  /** Недостаточно прав для операции. */
  AUTH_FORBIDDEN = "AUTH_FORBIDDEN",
  /** Слишком много попыток входа. */
  AUTH_RATE_LIMITED = "AUTH_RATE_LIMITED",

  // --- Пользователи ---
  /** Обязательные поля не заполнены. */
  USER_REQUIRED_FIELD = "USER_REQUIRED_FIELD",
  /** Недопустимая роль. */
  USER_INVALID_ROLE = "USER_INVALID_ROLE",
  /** Запрещено создавать/назначать супер-админа через интерфейс. */
  USER_SUPER_ADMIN_FORBIDDEN = "USER_SUPER_ADMIN_FORBIDDEN",
  /** Пользователь с таким именем уже существует. */
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
  /** Пользователь не найден. */
  USER_NOT_FOUND = "USER_NOT_FOUND",
  /** Запрещено действие над самим собой. */
  USER_SELF_ACTION = "USER_SELF_ACTION",
  /** Поле isActive обязательно. */
  USER_ACTIVE_REQUIRED = "USER_ACTIVE_REQUIRED",

  // --- Загрузка файлов ---
  /** Файл не был загружен. */
  UPLOAD_NO_FILE = "UPLOAD_NO_FILE",
  /** Файл пустой. */
  UPLOAD_EMPTY = "UPLOAD_EMPTY",
  /** Превышен максимальный размер файла. */
  UPLOAD_SIZE_EXCEEDED = "UPLOAD_SIZE_EXCEEDED",
  /** Неверное количество файлов. */
  UPLOAD_COUNT_INVALID = "UPLOAD_COUNT_INVALID",
  /** Неверный формат файла (не XLSX). */
  UPLOAD_BAD_FORMAT = "UPLOAD_BAD_FORMAT",
  /** Ошибка обработки/сохранения файла. */
  UPLOAD_PROCESSING = "UPLOAD_PROCESSING",
  /** Загрузка с указанным ID не найдена. */
  UPLOAD_NOT_FOUND = "UPLOAD_NOT_FOUND",
  /** Обязательный параметр не передан. */
  UPLOAD_PARAM_REQUIRED = "UPLOAD_PARAM_REQUIRED",

  // --- Данные и построение запросов ---
  /** Неверные параметры запроса. */
  QUERY_INVALID_PARAMS = "QUERY_INVALID_PARAMS",
  /** Неверная конфигурация запроса. */
  QUERY_INVALID_CONFIG = "QUERY_INVALID_CONFIG",
  /** Обязательные поля в маппинге отсутствуют. */
  QUERY_MAPPING_INCOMPLETE = "QUERY_MAPPING_INCOMPLETE",

  // --- Проверка входных данных ---
  /** Данные не прошли валидацию. */
  VALIDATION_FAILED = "VALIDATION_FAILED",

  // --- Не найдено ---
  /** Запрошенный маршрут не существует. */
  NOT_FOUND_ROUTE = "NOT_FOUND_ROUTE",
  /** Запрошенные данные не найдены. */
  NOT_FOUND_DATA = "NOT_FOUND_DATA",

  // --- Внутренние ошибки ---
  /** Непредвиденная ошибка сервера. */
  INTERNAL = "INTERNAL",
}

/** Метаданные ошибки: HTTP-статус и человекочитаемое сообщение. */
export interface ErrorDefinition {
  /** HTTP-статус ответа. */
  httpStatus: number;
  /** Понятное пользователю сообщение на русском языке. */
  message: string;
  /** Описание ошибки для документации. */
  description: string;
}

/**
 * Карта ошибок: код -> определение (HTTP-статус и сообщение).
 * Это единственный источник сообщений, которые уходят на веб-интерфейс.
 */
export const ERROR_CATALOG: Record<AppErrorCode, ErrorDefinition> = {
  // --- Авторизация ---
  [AppErrorCode.AUTH_INVALID_CREDENTIALS]: {
    httpStatus: 401,
    message: "Неверное имя пользователя или пароль",
    description: "Указаны неверный логин или пароль.",
  },
  [AppErrorCode.AUTH_UNAUTHORIZED]: {
    httpStatus: 401,
    message: "Требуется авторизация",
    description: "Запрос выполнен без токена доступа.",
  },
  [AppErrorCode.AUTH_TOKEN_EXPIRED]: {
    httpStatus: 401,
    message: "Сессия истекла. Войдите заново",
    description: "Токен доступа недействителен или истёк.",
  },
  [AppErrorCode.AUTH_USER_BLOCKED]: {
    httpStatus: 401,
    message: "Учётная запись не найдена или заблокирована",
    description: "Пользователь отсутствует либо заблокирован.",
  },
  [AppErrorCode.AUTH_REFRESH_MISSING]: {
    httpStatus: 401,
    message: "Отсутствует токен обновления сессии",
    description: "В запросе не передан refresh-токен.",
  },
  [AppErrorCode.AUTH_FORBIDDEN]: {
    httpStatus: 403,
    message: "Недостаточно прав для выполнения действия",
    description: "У пользователя нет требуемой роли.",
  },
  [AppErrorCode.AUTH_RATE_LIMITED]: {
    httpStatus: 429,
    message: "Слишком много попыток. Попробуйте позже",
    description: "Превышено число попыток входа за период времени.",
  },

  // --- Пользователи ---
  [AppErrorCode.USER_REQUIRED_FIELD]: {
    httpStatus: 400,
    message: "Не все обязательные поля заполнены",
    description: "Не передан обязательный параметр.",
  },
  [AppErrorCode.USER_INVALID_ROLE]: {
    httpStatus: 400,
    message: "Указана недопустимая роль",
    description: "Роль не входит в список разрешённых.",
  },
  [AppErrorCode.USER_SUPER_ADMIN_FORBIDDEN]: {
    httpStatus: 400,
    message: "Создание супер-администратора через интерфейс запрещено",
    description: "Защита от эскалации прав.",
  },
  [AppErrorCode.USER_ALREADY_EXISTS]: {
    httpStatus: 409,
    message: "Пользователь с таким именем уже существует",
    description: "Имя пользователя занято.",
  },
  [AppErrorCode.USER_NOT_FOUND]: {
    httpStatus: 404,
    message: "Пользователь не найден",
    description: "Пользователь с указанным ID отсутствует.",
  },
  [AppErrorCode.USER_SELF_ACTION]: {
    httpStatus: 400,
    message: "Нельзя выполнить это действие над самим собой",
    description: "Запрет блокировки/удаления собственной учётной записи.",
  },
  [AppErrorCode.USER_ACTIVE_REQUIRED]: {
    httpStatus: 400,
    message: "Не передан статус учётной записи",
    description: "Поле isActive обязательно.",
  },

  // --- Загрузка файлов ---
  [AppErrorCode.UPLOAD_NO_FILE]: {
    httpStatus: 400,
    message: "Файл не был загружен",
    description: "В запросе отсутствует файл.",
  },
  [AppErrorCode.UPLOAD_EMPTY]: {
    httpStatus: 400,
    message: "Загруженный файл пустой",
    description: "Файл не содержит данных.",
  },
  [AppErrorCode.UPLOAD_SIZE_EXCEEDED]: {
    httpStatus: 400,
    message: "Размер файла превышает максимально допустимый",
    description: "Файл больше лимита (50 МБ).",
  },
  [AppErrorCode.UPLOAD_COUNT_INVALID]: {
    httpStatus: 400,
    message: "Неверное количество файлов",
    description: "Ожидается один файл.",
  },
  [AppErrorCode.UPLOAD_BAD_FORMAT]: {
    httpStatus: 400,
    message: "Файл должен быть в формате XLSX",
    description: "Неподдерживаемый формат файла.",
  },
  [AppErrorCode.UPLOAD_PROCESSING]: {
    httpStatus: 400,
    message: "Не удалось обработать файл",
    description: "Ошибка разбора или сохранения файла.",
  },
  [AppErrorCode.UPLOAD_NOT_FOUND]: {
    httpStatus: 404,
    message: "Загрузка не найдена",
    description: "Загрузка с указанным ID отсутствует.",
  },
  [AppErrorCode.UPLOAD_PARAM_REQUIRED]: {
    httpStatus: 400,
    message: "Не передан обязательный параметр",
    description: "Отсутствует обязательный параметр запроса.",
  },

  // --- Данные и построение запросов ---
  [AppErrorCode.QUERY_INVALID_PARAMS]: {
    httpStatus: 400,
    message: "Неверные параметры запроса",
    description: "Параметры запроса не прошли проверку.",
  },
  [AppErrorCode.QUERY_INVALID_CONFIG]: {
    httpStatus: 400,
    message: "Некорректная конфигурация запроса",
    description: "Конфигурация запроса недействительна.",
  },
  [AppErrorCode.QUERY_MAPPING_INCOMPLETE]: {
    httpStatus: 400,
    message: "Отсутствуют обязательные поля в маппинге",
    description: "Маппинг неполный.",
  },

  // --- Проверка входных данных ---
  [AppErrorCode.VALIDATION_FAILED]: {
    httpStatus: 400,
    message: "Проверьте введённые данные",
    description: "Входные данные не прошли валидацию.",
  },

  // --- Не найдено ---
  [AppErrorCode.NOT_FOUND_ROUTE]: {
    httpStatus: 404,
    message: "Запрашиваемая страница или адрес не найдены",
    description: "Маршрут не существует.",
  },
  [AppErrorCode.NOT_FOUND_DATA]: {
    httpStatus: 404,
    message: "Данные не найдены",
    description: "Запрошенные данные отсутствуют.",
  },

  // --- Внутренние ошибки ---
  [AppErrorCode.INTERNAL]: {
    httpStatus: 500,
    message: "Произошла ошибка на сервере. Попробуйте позже",
    description: "Непредвиденная внутренняя ошибка.",
  },
};

/**
 * Класс доменной ошибки приложения.
 * Создаётся по коду из карты ошибок; статус и сообщение берутся из ERROR_CATALOG.
 * Если передан details/cause — они сохраняются для логирования, но НЕ попадают на интерфейс.
 */
export class AppError extends Error {
  /** Код ошибки из карты. */
  readonly code: AppErrorCode;
  /** HTTP-статус ответа. */
  readonly status: number;
  /** Дополнительные данные для логирования (не отдаются клиенту). */
  readonly details?: unknown;
  /** Исходная ошибка (причина). */
  readonly cause?: unknown;

  constructor(code: AppErrorCode, details?: unknown, cause?: unknown) {
    const definition = ERROR_CATALOG[code];
    super(definition.message);
    this.name = "AppError";
    this.code = code;
    this.status = definition.httpStatus;
    this.details = details;
    this.cause = cause;
  }

  /** Создаёт ошибку из любой пойманной ошибки (маппинг в INTERNAL). */
  static fromUnknown(error: unknown): AppError {
    if (error instanceof AppError) return error;
    return new AppError(AppErrorCode.INTERNAL, undefined, error);
  }
}

/**
 * Преобразует типовые сообщения SQL Builder в коды карты ошибок.
 * Используется в роутах данных, где builder бросает обычные Error.
 */
export function mapBuilderError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const message = error instanceof Error ? error.message : "";
  if (message.includes("invalid JSON")) {
    return new AppError(AppErrorCode.VALIDATION_FAILED, undefined, error);
  }
  if (message.includes("invalid params")) {
    return new AppError(AppErrorCode.QUERY_INVALID_PARAMS, undefined, error);
  }
  if (message.includes("invalid config") || message.includes("wrap_json=false")) {
    return new AppError(AppErrorCode.QUERY_INVALID_CONFIG, undefined, error);
  }
  return new AppError(AppErrorCode.QUERY_INVALID_CONFIG, undefined, error);
}
