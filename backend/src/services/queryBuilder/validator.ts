/**
 * Валидация JSON-конфига для SQL Builder
 */

import type {
  QueryConfig,
  FromConfig,
  SelectItem,
  WhereConfig,
  ParamType,
} from "./types.js";

/**
 * Регулярное выражение для валидации идентификаторов
 * Должно соответствовать: ^[a-zA-Z_][a-zA-Z0-9_]*$
 */
const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Проверка валидности идентификатора
 */
function isValidIdentifier(value: string): boolean {
  return IDENTIFIER_REGEX.test(value);
}

/**
 * Проверка валидности параметра (строка вида ":paramName")
 */
function isValidParamValue(value: any): boolean {
  return typeof value === "string" && value.startsWith(":") && value.length > 1;
}

/**
 * Валидация FROM блока
 */
function validateFrom(from: FromConfig): void {
  if (!from || typeof from !== "object") {
    throw new Error("invalid config");
  }

  if (typeof from.schema !== "string" || !isValidIdentifier(from.schema)) {
    throw new Error("invalid config");
  }

  if (typeof from.table !== "string" || !isValidIdentifier(from.table)) {
    throw new Error("invalid config");
  }
}

/**
 * Валидация SELECT элемента
 */
function validateSelectItem(item: SelectItem): void {
  if (!item || typeof item !== "object") {
    throw new Error("invalid config");
  }

  switch (item.type) {
    case "column": {
      if (typeof item.field !== "string" || !isValidIdentifier(item.field)) {
        throw new Error("invalid config");
      }
      if (item.as !== undefined && (typeof item.as !== "string" || !isValidIdentifier(item.as))) {
        throw new Error("invalid config");
      }
      break;
    }

    case "agg": {
      const validFuncs = ["sum", "avg", "min", "max", "count"];
      if (typeof item.func !== "string" || !validFuncs.includes(item.func)) {
        throw new Error("invalid config");
      }
      if (typeof item.field !== "string" || !isValidIdentifier(item.field)) {
        throw new Error("invalid config");
      }
      if (item.as !== undefined && (typeof item.as !== "string" || !isValidIdentifier(item.as))) {
        throw new Error("invalid config");
      }
      if (item.distinct !== undefined && typeof item.distinct !== "boolean") {
        throw new Error("invalid config");
      }
      break;
    }

    case "case_agg": {
      const validFuncs = ["sum", "avg", "min", "max", "count"];
      if (typeof item.func !== "string" || !validFuncs.includes(item.func)) {
        throw new Error("invalid config");
      }
      if (!item.when || typeof item.when !== "object") {
        throw new Error("invalid config");
      }
      if (typeof item.when.field !== "string" || !isValidIdentifier(item.when.field)) {
        throw new Error("invalid config");
      }
      const validOps = ["=", "!=", ">", ">=", "<", "<=", "in", "between", "like", "ilike", "is_null", "is_not_null"];
      if (typeof item.when.op !== "string" || !validOps.includes(item.when.op)) {
        throw new Error("invalid config");
      }
      if (!item.then || typeof item.then !== "object" || typeof item.then.field !== "string" || !isValidIdentifier(item.then.field)) {
        throw new Error("invalid config");
      }
      if (item.else !== null && (typeof item.else !== "object" || typeof item.else.field !== "string" || !isValidIdentifier(item.else.field))) {
        throw new Error("invalid config");
      }
      if (item.as !== undefined && (typeof item.as !== "string" || !isValidIdentifier(item.as))) {
        throw new Error("invalid config");
      }
      break;
    }

    default:
      throw new Error("invalid config");
  }
}

/**
 * Валидация WHERE элемента
 */
function validateWhereItem(item: any): void {
  if (!item || typeof item !== "object") {
    throw new Error("invalid config");
  }

  if (typeof item.field !== "string" || !isValidIdentifier(item.field)) {
    throw new Error("invalid config");
  }

  const validOps = ["=", "!=", ">", ">=", "<", "<=", "in", "between", "like", "ilike", "is_null", "is_not_null"];
  if (typeof item.op !== "string" || !validOps.includes(item.op)) {
    throw new Error("invalid config");
  }

  // Для is_null и is_not_null value не требуется
  if (item.op === "is_null" || item.op === "is_not_null") {
    return;
  }

  // Для between value должен быть объект {from, to}
  if (item.op === "between") {
    if (!item.value || typeof item.value !== "object" || !isValidParamValue(item.value.from) || !isValidParamValue(item.value.to)) {
      throw new Error("invalid config");
    }
    return;
  }

  // Для in value должен быть массив параметров
  if (item.op === "in") {
    if (!Array.isArray(item.value) || item.value.length === 0 || !item.value.every((v: any) => isValidParamValue(v))) {
      throw new Error("invalid config");
    }
    return;
  }

  // Для остальных операций value должен быть параметром
  if (!isValidParamValue(item.value)) {
    throw new Error("invalid config");
  }
}

/**
 * Валидация WHERE блока
 */
function validateWhere(where: WhereConfig): void {
  if (!where || typeof where !== "object") {
    throw new Error("invalid config");
  }

  if (where.op !== "and" && where.op !== "or") {
    throw new Error("invalid config");
  }

  if (!Array.isArray(where.items) || where.items.length === 0) {
    throw new Error("invalid config");
  }

  for (const item of where.items) {
    validateWhereItem(item);
  }
}

/**
 * Валидация типов параметров
 */
function validateParamTypes(paramTypes: Record<string, ParamType>, params: Record<string, any>): void {
  const validTypes = ["string", "number", "date", "boolean"];

  for (const [paramName, paramType] of Object.entries(paramTypes)) {
    if (!validTypes.includes(paramType)) {
      throw new Error("invalid config");
    }

    const paramValue = params[paramName];
    if (paramValue === undefined) {
      continue; // Параметр может отсутствовать, если не используется
    }

    // Простая проверка типа значения
    if (paramType === "date" && !(paramValue instanceof Date) && typeof paramValue !== "string") {
      // Date может быть строкой "YYYY-MM-DD"
      const dateStr = String(paramValue);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error("invalid config");
      }
    } else if (paramType === "number" && typeof paramValue !== "number") {
      throw new Error("invalid config");
    } else if (paramType === "boolean" && typeof paramValue !== "boolean") {
      throw new Error("invalid config");
    } else if (paramType === "string" && typeof paramValue !== "string") {
      throw new Error("invalid config");
    }
  }
}

/**
 * Валидация полного конфига
 */
export function validateConfig(config: any): config is QueryConfig {
  try {
    if (!config || typeof config !== "object") {
      throw new Error("invalid config");
    }

    // Валидация FROM
    validateFrom(config.from);

    // Валидация SELECT
    if (!Array.isArray(config.select) || config.select.length === 0) {
      throw new Error("invalid config");
    }
    for (const item of config.select) {
      validateSelectItem(item);
    }

    // Валидация WHERE (опционально)
    if (config.where !== undefined) {
      validateWhere(config.where);
    }

    // Валидация groupBy (опционально)
    if (config.groupBy !== undefined) {
      if (!Array.isArray(config.groupBy)) {
        throw new Error("invalid config");
      }
      for (const field of config.groupBy) {
        if (typeof field !== "string" || !isValidIdentifier(field)) {
          throw new Error("invalid config");
        }
      }
    }

    // Валидация orderBy (опционально)
    if (config.orderBy !== undefined) {
      if (!Array.isArray(config.orderBy)) {
        throw new Error("invalid config");
      }
      for (const item of config.orderBy) {
        if (!item || typeof item !== "object") {
          throw new Error("invalid config");
        }
        if (typeof item.field !== "string" || !isValidIdentifier(item.field)) {
          throw new Error("invalid config");
        }
        if (item.direction !== "asc" && item.direction !== "desc") {
          throw new Error("invalid config");
        }
      }
    }

    // Валидация limit (опционально)
    if (config.limit !== undefined && (typeof config.limit !== "number" || config.limit < 0)) {
      throw new Error("invalid config");
    }

    // Валидация offset (опционально)
    if (config.offset !== undefined && (typeof config.offset !== "number" || config.offset < 0)) {
      throw new Error("invalid config");
    }

    // Валидация params
    if (!config.params || typeof config.params !== "object") {
      throw new Error("invalid config");
    }

    // Валидация paramTypes (опционально, но если есть - проверяем)
    if (config.paramTypes !== undefined) {
      if (typeof config.paramTypes !== "object") {
        throw new Error("invalid config");
      }
      validateParamTypes(config.paramTypes, config.params);
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.message === "invalid config") {
      throw error;
    }
    throw new Error("invalid config");
  }
}
