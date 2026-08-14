/**
 * SQL Builder - генерация SQL с подставленными значениями из JSON-конфига
 */

import type { QueryConfig, SelectItem, WhereItem, ParamValue } from "./types.js";
import { loadQueryConfig } from "./queryLoader.js";

/**
 * Класс для подстановки значений параметров в SQL
 */
class ValueSubstitutor {
  private params: Record<string, string | number | boolean | Date>;
  private paramTypes?: Record<string, "string" | "number" | "date" | "boolean">;

  constructor(
    params: Record<string, string | number | boolean | Date>,
    paramTypes?: Record<string, "string" | "number" | "date" | "boolean">
  ) {
    this.params = params;
    this.paramTypes = paramTypes;
  }

  /**
   * Получить отформатированное значение параметра для подстановки в SQL
   * @param paramName - имя параметра (например, ":p1") или прямое значение (например, "assets")
   * @returns отформатированное значение для SQL
   */
  getValue(paramName: ParamValue): string {
    // Если значение НЕ начинается с ":", это прямое значение — не параметр
    if (typeof paramName === "string" && !paramName.startsWith(":")) {
      // Это прямое значение, экранируем как строку
      return escapeStringValue(paramName);
    }

    const name = paramName.substring(1); // Убираем ":"
    const value = this.params[name];

    if (value === undefined) {
      throw new Error("invalid params");
    }

    const paramType = this.paramTypes?.[name];
    return formatValueForSQL(value, paramType);
  }

  /**
   * Проверить наличие всех требуемых параметров
   * @param requiredParams - массив имен требуемых параметров (без ":")
   */
  validateRequiredParams(requiredParams: string[]): void {
    for (const paramName of requiredParams) {
      if (this.params[paramName] === undefined) {
        throw new Error("invalid params");
      }
    }
  }

  /**
   * Проверить, передан ли параметр (по имени без ":")
   * Используется для опциональных периодов: если период не передан,
   * соответствующая агрегация пропускается.
   * @param name - имя параметра без префикса ":"
   */
  has(name: string): boolean {
    return this.params[name] !== undefined;
  }
}

/**
 * Определить, является ли имя параметра периодным (p1..p6).
 * Периодные параметры опциональны: если пользователь выбрал меньше периодов,
 * часть из них не передаётся, что не является ошибкой.
 * @param name - имя параметра без префикса ":"
 */
function isPeriodParam(name: string): boolean {
  return /^p\d+$/.test(name);
}

/**
 * Проверить, ссылается ли значение on периодного параметра, который НЕ передан.
 * Используется для гибкого числа периодов: если параметр периода отсутствует,
 * соответствующая агрегация или условие IN пропускаются.
 * @param value - значение параметра (строка ":name", массив или диапазон)
 * @param substitutor - подстановщик значений с доступом к переданным параметрам
 */
function isMissingParam(
  value: ParamValue | ParamValue[] | { from: ParamValue; to: ParamValue } | null | undefined,
  substitutor: ValueSubstitutor
): boolean {
  if (value === null || value === undefined) return false;

  if (Array.isArray(value)) {
    // Массив считается отсутствующим, если ВСЕ его элементы — непереданные параметры.
    const refs = value.filter((v): v is string => typeof v === "string" && v.startsWith(":"));
    return refs.length > 0 && refs.every((v) => !substitutor.has(v.substring(1)));
  }

  if (typeof value === "string") {
    if (value.startsWith(":")) {
      return !substitutor.has(value.substring(1));
    }
    return false;
  }

  if (typeof value === "object") {
    const from = value.from as ParamValue;
    const to = value.to as ParamValue;
    const fromMissing =
      typeof from === "string" && from.startsWith(":") && !substitutor.has(from.substring(1));
    const toMissing =
      typeof to === "string" && to.startsWith(":") && !substitutor.has(to.substring(1));
    return fromMissing || toMissing;
  }

  return false;
}

/**
 * Экранирование идентификатора (schema, table, column)
 */
function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Экранирование строкового значения для SQL (защита от SQL-инъекций)
 */
function escapeStringValue(value: string): string {
  // Экранируем одинарные кавычки и обратные слеши
  return `'${value.replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
}

/**
 * Форматирование значения для подстановки в SQL
 * @param value - значение параметра
 * @param paramType - тип параметра (для корректного форматирования)
 * @returns отформатированное значение для SQL
 */
function formatValueForSQL(
  value: string | number | boolean | Date,
  paramType?: "string" | "number" | "date" | "boolean"
): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  // Определяем тип, если не указан явно
  if (paramType === undefined) {
    if (typeof value === "string") {
      paramType = "string";
    } else if (typeof value === "number") {
      paramType = "number";
    } else if (typeof value === "boolean") {
      paramType = "boolean";
    } else if (value instanceof Date) {
      paramType = "date";
    } else {
      paramType = "string";
    }
  }

  switch (paramType) {
    case "string":
      return escapeStringValue(String(value));

    case "number": {
      // Проверяем, что это валидное число
      const numValue = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(numValue)) {
        throw new Error("invalid params");
      }
      return String(numValue);
    }

    case "boolean":
      return value === true ? "TRUE" : "FALSE";

    case "date": {
      // Форматируем дату в YYYY-MM-DD
      const date = value instanceof Date ? value : new Date(String(value));
      if (isNaN(date.getTime())) {
        throw new Error("invalid params");
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return escapeStringValue(`${year}-${month}-${day}`);
    }

    default:
      return escapeStringValue(String(value));
  }
}

/**
 * Построение SELECT выражения
 */
function buildSelect(items: SelectItem[], substitutor: ValueSubstitutor): string {
  const selectParts: string[] = [];

  for (const item of items) {
    switch (item.type) {
      case "column": {
        const field = escapeIdentifier(item.field);
        const alias = item.as ? ` AS ${escapeIdentifier(item.as)}` : "";
        selectParts.push(`${field}${alias}`);
        break;
      }

      case "agg": {
        const funcName = item.func.toUpperCase();
        const distinct = item.distinct ? "DISTINCT " : "";
        const field = escapeIdentifier(item.field);
        const alias = item.as ? ` AS ${escapeIdentifier(item.as)}` : "";
        selectParts.push(`${funcName}(${distinct}${field})${alias}`);
        break;
      }

      case "case_agg": {
        // Опциональные периоды: если периодный параметр (например :p3) не передан,
        // эта агрегация полностью пропускается. Это даёт гибкое число периодов.
        if (isMissingParam(item.when.value, substitutor)) {
          break;
        }

        const funcName = item.func.toUpperCase();
        const whenField = escapeIdentifier(item.when.field);

        // Построение WHEN условия
        let whenCondition: string;
        if (item.when.op === "is_null") {
          whenCondition = `${whenField} IS NULL`;
        } else if (item.when.op === "is_not_null") {
          whenCondition = `${whenField} IS NOT NULL`;
        } else if (item.when.op === "in") {
          const rawValues = item.when.value as ParamValue[];
          const filtered = rawValues.filter((v) => !isMissingParam(v, substitutor));
          const values = filtered.map((v) => substitutor.getValue(v));
          whenCondition = `${whenField} IN (${values.join(", ")})`;
        } else if (item.when.op === "between") {
          const betweenValue = item.when.value as { from: ParamValue; to: ParamValue };
          const fromValue = substitutor.getValue(betweenValue.from);
          const toValue = substitutor.getValue(betweenValue.to);
          whenCondition = `${whenField} BETWEEN ${fromValue} AND ${toValue}`;
        } else {
          // =, !=, >, >=, <, <=, like, ilike
          const paramValue = item.when.value as ParamValue;
          const sqlValue = substitutor.getValue(paramValue);
          const op = item.when.op.toUpperCase();
          whenCondition = `${whenField} ${op} ${sqlValue}`;
        }

        // THEN и ELSE
        const thenField = escapeIdentifier(item.then.field);
        const elsePart = item.else ? `ELSE ${escapeIdentifier(item.else.field)}` : "ELSE NULL";

        const alias = item.as ? ` AS ${escapeIdentifier(item.as)}` : "";
        selectParts.push(
          `${funcName}(CASE WHEN ${whenCondition} THEN ${thenField} ${elsePart} END)${alias}`
        );
        break;
      }

      default:
        throw new Error("invalid config");
    }
  }

  return selectParts.join(", ");
}

/**
 * Построение WHERE условия
 */
function buildWhere(
  where: { op: "and" | "or"; items: WhereItem[] },
  substitutor: ValueSubstitutor
): string {
  const whereParts: string[] = [];
  const logicOp = where.op.toUpperCase();

  for (const item of where.items) {
    const field = escapeIdentifier(item.field);

    if (item.op === "is_null") {
      whereParts.push(`${field} IS NULL`);
    } else if (item.op === "is_not_null") {
      whereParts.push(`${field} IS NOT NULL`);
    } else if (item.op === "in") {
      // Для IN-условия отбрасываем непереданные периодные параметры, чтобы
      // поддерживать гибкое число периодов (например p3 не выбран пользователем).
      const rawValues = item.value as ParamValue[];
      const filtered = rawValues.filter((v) => !isMissingParam(v, substitutor));
      // Если все элементы отфильтрованы — условие исключаем полностью.
      if (filtered.length === 0) {
        continue;
      }
      const values = filtered.map((v) => substitutor.getValue(v));
      whereParts.push(`${field} IN (${values.join(", ")})`);
    } else if (item.op === "between") {
      const betweenValue = item.value as { from: ParamValue; to: ParamValue };
      const fromValue = substitutor.getValue(betweenValue.from);
      const toValue = substitutor.getValue(betweenValue.to);
      whereParts.push(`${field} BETWEEN ${fromValue} AND ${toValue}`);
    } else {
      // =, !=, >, >=, <, <=, like, ilike
      const paramValue = item.value as ParamValue;
      const sqlValue = substitutor.getValue(paramValue);
      const op = item.op.toUpperCase();
      whereParts.push(`${field} ${op} ${sqlValue}`);
    }
  }

  return whereParts.join(` ${logicOp} `);
}

/**
 * Построение GROUP BY
 */
function buildGroupBy(groupBy: string[]): string {
  return groupBy.map((field) => escapeIdentifier(field)).join(", ");
}

/**
 * Построение ORDER BY
 */
function buildOrderBy(orderBy: Array<{ field: string; direction: "asc" | "desc" }>): string {
  return orderBy
    .map((item) => {
      const field = escapeIdentifier(item.field);
      const direction = item.direction.toUpperCase();
      return `${field} ${direction}`;
    })
    .join(", ");
}

/**
 * Построение SQL запроса из конфига с подстановкой значений
 * @param config - конфиг запроса
 * @param params - значения параметров для подстановки
 * @param wrapJson - нужно ли оборачивать результат в json_agg (по умолчанию false)
 * @returns готовый SQL запрос с подставленными значениями
 */
export function buildQuery(
  config: QueryConfig,
  params: Record<string, string | number | boolean | Date>,
  wrapJson: boolean = false
): string {
  const substitutor = new ValueSubstitutor(params, config.paramTypes);

  try {
    // Собираем список требуемых параметров из конфига.
    // Периодные параметры (p1..p6) опциональны и в обязательный список не входят,
    // т.к. пользователь может выбрать меньшее число периодов.
    const requiredParams = new Set<string>();
    const addParam = (paramValue: unknown): void => {
      if (typeof paramValue === "string" && paramValue.startsWith(":")) {
        const name = paramValue.substring(1);
        if (!isPeriodParam(name)) {
          requiredParams.add(name);
        }
      }
    };

    // Из SELECT (case_agg)
    for (const item of config.select) {
      if (item.type === "case_agg") {
        const whenValue = item.when.value;
        if (Array.isArray(whenValue)) {
          whenValue.forEach(addParam);
        } else if (typeof whenValue === "string") {
          addParam(whenValue);
        } else if (typeof whenValue === "object" && whenValue !== null) {
          addParam(whenValue.from);
          addParam(whenValue.to);
        }
      }
    }

    // Из WHERE
    if (config.where) {
      for (const item of config.where.items) {
        if (Array.isArray(item.value)) {
          item.value.forEach(addParam);
        } else if (typeof item.value === "string") {
          addParam(item.value);
        } else if (typeof item.value === "object" && item.value !== null) {
          addParam(item.value.from);
          addParam(item.value.to);
        }
      }
    }

    // Валидация наличия всех требуемых параметров
    substitutor.validateRequiredParams(Array.from(requiredParams));

    // 1. SELECT
    const selectClause = buildSelect(config.select, substitutor);

    // 2. FROM
    const schema = escapeIdentifier(config.from.schema);
    const table = escapeIdentifier(config.from.table);
    const fromClause = `FROM ${schema}.${table}`;

    // 3. WHERE
    let whereClause = "";
    if (config.where) {
      const whereCondition = buildWhere(config.where, substitutor);
      whereClause = `WHERE ${whereCondition}`;
    }

    // 4. GROUP BY
    let groupByClause = "";
    if (config.groupBy && config.groupBy.length > 0) {
      groupByClause = `GROUP BY ${buildGroupBy(config.groupBy)}`;
    }

    // 5. ORDER BY
    let orderByClause = "";
    if (config.orderBy && config.orderBy.length > 0) {
      orderByClause = `ORDER BY ${buildOrderBy(config.orderBy)}`;
    }

    // 6. LIMIT
    let limitClause = "";
    if (config.limit !== undefined) {
      limitClause = `LIMIT ${config.limit}`;
    }

    // 7. OFFSET
    let offsetClause = "";
    if (config.offset !== undefined) {
      offsetClause = `OFFSET ${config.offset}`;
    }

    // Сборка базового SQL
    const sqlParts = [
      `SELECT ${selectClause}`,
      fromClause,
      whereClause,
      groupByClause,
      orderByClause,
      limitClause,
      offsetClause,
    ].filter((part) => part !== "");

    const baseSql = sqlParts.join(" ");

    // Если wrapJson = true, оборачиваем в json_agg (сохраняет порядок ключей)
    if (wrapJson) {
      return `SELECT json_agg(row_to_json(t)) FROM (${baseSql}) t`;
    }

    return baseSql;
  } catch (error) {
    if (error instanceof Error && error.message === "invalid params") {
      throw error;
    }
    throw new Error("invalid config");
  }
}

/**
 * Валидация параметров: проверка missing/excess
 * @param requiredParams - набор требуемых параметров (без ":")
 * @param providedParams - объект переданных параметров
 * @throws Error с детальным описанием missing/excess параметров
 */
function validateParams(requiredParams: Set<string>, providedParams: Record<string, any>): void {
  const providedParamNames = new Set(Object.keys(providedParams));
  const missing: string[] = [];

  // Проверяем missing параметры (обязательные, но не переданные)
  for (const requiredParam of requiredParams) {
    if (!providedParamNames.has(requiredParam)) {
      missing.push(requiredParam);
    }
  }

  // Проверка excess параметров намеренно убрана: при гибком числе периодов
  // фронт передаёт параметры p1..p6, часть которых конфиг может не использовать.
  // Лишние параметры не являются ошибкой — они безопасно игнорируются.

  // Если есть ошибки, выбрасываем исключение с деталями
  if (missing.length > 0) {
    const errorParts: string[] = [];
    if (missing.length > 0) {
      errorParts.push(`missing params: ${missing.join(", ")}`);
    }
    throw new Error(`invalid params: ${errorParts.join("; ")}`);
  }
}

/**
 * Построение SQL запроса по query_id с загрузкой конфига из БД
 * @param queryId - идентификатор запроса из config.component_queries
 * @param paramsJson - JSON строка с параметрами для подстановки
 * @returns готовый SQL запрос с подставленными значениями
 * @throws Error с детальным описанием ошибок (invalid JSON, invalid config, invalid params, wrap_json=false)
 */
export async function buildQueryFromId(queryId: string, paramsJson: string): Promise<string> {
  // 1. Парсинг paramsJson с валидацией JSON
  let params: Record<string, string | number | boolean | Date>;
  try {
    params = JSON.parse(paramsJson);
    if (typeof params !== "object" || params === null || Array.isArray(params)) {
      throw new Error("paramsJson must be a JSON object");
    }
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(`invalid JSON: ${error.message}`);
    }
    throw error;
  }

  // 2. Загрузка конфига из БД
  const queryConfigWithWrap = await loadQueryConfig(queryId);
  if (!queryConfigWithWrap) {
    throw new Error("invalid config");
  }

  // 3. Проверка wrapJson (для getData должен быть true)
  if (!queryConfigWithWrap.wrapJson) {
    throw new Error("wrap_json=false: query must have wrapJson=true");
  }

  // 4. Получение списка требуемых параметров из конфига.
  // Периодные параметры (p1..p6) опциональны и в обязательный список не входят.
  const requiredParams = new Set<string>();
  const addParam = (paramValue: unknown): void => {
    if (typeof paramValue === "string" && paramValue.startsWith(":")) {
      const name = paramValue.substring(1);
      if (!isPeriodParam(name)) {
        requiredParams.add(name);
      }
    }
  };

  // Из SELECT (case_agg)
  for (const item of queryConfigWithWrap.config.select) {
    if (item.type === "case_agg") {
      const whenValue = item.when.value;
      if (Array.isArray(whenValue)) {
        whenValue.forEach(addParam);
      } else if (typeof whenValue === "string") {
        addParam(whenValue);
      } else if (typeof whenValue === "object" && whenValue !== null) {
        addParam(whenValue.from);
        addParam(whenValue.to);
      }
    }
  }

  // Из WHERE
  if (queryConfigWithWrap.config.where) {
    for (const item of queryConfigWithWrap.config.where.items) {
      if (Array.isArray(item.value)) {
        item.value.forEach(addParam);
      } else if (typeof item.value === "string") {
        addParam(item.value);
      } else if (typeof item.value === "object" && item.value !== null) {
        addParam(item.value.from);
        addParam(item.value.to);
      }
    }
  }

  // 5. Проверка missing/excess параметров
  validateParams(requiredParams, params);

  // 6. Построение SQL с подставленными значениями
  return buildQuery(queryConfigWithWrap.config, params, queryConfigWithWrap.wrapJson);
}
