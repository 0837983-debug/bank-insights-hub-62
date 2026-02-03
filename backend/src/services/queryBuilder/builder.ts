/**
 * SQL Builder - генерация SQL с подставленными значениями из JSON-конфига
 */

import type {
  QueryConfig,
  SelectItem,
  WhereItem,
  ParamValue,
} from "./types.js";
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
    
    case "number":
      // Проверяем, что это валидное число
      const numValue = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(numValue)) {
        throw new Error("invalid params");
      }
      return String(numValue);
    
    case "boolean":
      return value === true ? "TRUE" : "FALSE";
    
    case "date":
      // Форматируем дату в YYYY-MM-DD
      const date = value instanceof Date ? value : new Date(String(value));
      if (isNaN(date.getTime())) {
        throw new Error("invalid params");
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return escapeStringValue(`${year}-${month}-${day}`);
    
    default:
      return escapeStringValue(String(value));
  }
}

/**
 * Построение SELECT выражения
 */
function buildSelect(
  items: SelectItem[],
  substitutor: ValueSubstitutor
): string {
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
        const funcName = item.func.toUpperCase();
        const whenField = escapeIdentifier(item.when.field);
        
        // Построение WHEN условия
        let whenCondition: string;
        if (item.when.op === "is_null") {
          whenCondition = `${whenField} IS NULL`;
        } else if (item.when.op === "is_not_null") {
          whenCondition = `${whenField} IS NOT NULL`;
        } else if (item.when.op === "in") {
          const values = (item.when.value as ParamValue[]).map((v) => substitutor.getValue(v));
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
        const elsePart = item.else
          ? `ELSE ${escapeIdentifier(item.else.field)}`
          : "ELSE NULL";
        
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
      const values = (item.value as ParamValue[]).map((v) => substitutor.getValue(v));
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
    // Собираем список всех требуемых параметров из конфига
    const requiredParams = new Set<string>();
    
    // Из SELECT (case_agg)
    for (const item of config.select) {
      if (item.type === "case_agg") {
        if (item.when.value) {
          if (Array.isArray(item.when.value)) {
            item.when.value.forEach((v) => {
              if (typeof v === "string" && v.startsWith(":")) {
                requiredParams.add(v.substring(1));
              }
            });
          } else if (typeof item.when.value === "string") {
            if (item.when.value.startsWith(":")) {
              requiredParams.add(item.when.value.substring(1));
            }
          } else if (typeof item.when.value === "object" && item.when.value !== null) {
            if (typeof item.when.value.from === "string" && item.when.value.from.startsWith(":")) {
              requiredParams.add(item.when.value.from.substring(1));
            }
            if (typeof item.when.value.to === "string" && item.when.value.to.startsWith(":")) {
              requiredParams.add(item.when.value.to.substring(1));
            }
          }
        }
      }
    }

    // Из WHERE
    if (config.where) {
      for (const item of config.where.items) {
        if (item.value) {
          if (Array.isArray(item.value)) {
            item.value.forEach((v) => {
              if (typeof v === "string" && v.startsWith(":")) {
                requiredParams.add(v.substring(1));
              }
            });
          } else if (typeof item.value === "string") {
            if (item.value.startsWith(":")) {
              requiredParams.add(item.value.substring(1));
            }
          } else if (typeof item.value === "object") {
            if (typeof item.value.from === "string" && item.value.from.startsWith(":")) {
              requiredParams.add(item.value.from.substring(1));
            }
            if (typeof item.value.to === "string" && item.value.to.startsWith(":")) {
              requiredParams.add(item.value.to.substring(1));
            }
          }
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
function validateParams(
  requiredParams: Set<string>,
  providedParams: Record<string, any>
): void {
  const providedParamNames = new Set(Object.keys(providedParams));
  const missing: string[] = [];
  const excess: string[] = [];

  // Проверяем missing параметры
  for (const requiredParam of requiredParams) {
    if (!providedParamNames.has(requiredParam)) {
      missing.push(requiredParam);
    }
  }

  // Проверяем excess параметры (все переданные должны быть в требуемых)
  for (const providedParam of providedParamNames) {
    if (!requiredParams.has(providedParam)) {
      excess.push(providedParam);
    }
  }

  // Если есть ошибки, выбрасываем исключение с деталями
  if (missing.length > 0 || excess.length > 0) {
    const errorParts: string[] = [];
    if (missing.length > 0) {
      errorParts.push(`missing params: ${missing.join(", ")}`);
    }
    if (excess.length > 0) {
      errorParts.push(`excess params: ${excess.join(", ")}`);
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
export async function buildQueryFromId(
  queryId: string,
  paramsJson: string
): Promise<string> {
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

  // 4. Получение списка требуемых параметров из конфига
  const requiredParams = new Set<string>();
  
  // Из SELECT (case_agg)
  for (const item of queryConfigWithWrap.config.select) {
    if (item.type === "case_agg") {
      if (item.when.value) {
        if (Array.isArray(item.when.value)) {
          item.when.value.forEach((v) => {
            if (typeof v === "string" && v.startsWith(":")) {
              requiredParams.add(v.substring(1));
            }
          });
        } else if (typeof item.when.value === "string") {
          if (item.when.value.startsWith(":")) {
            requiredParams.add(item.when.value.substring(1));
          }
        } else if (typeof item.when.value === "object" && item.when.value !== null) {
          if (typeof item.when.value.from === "string" && item.when.value.from.startsWith(":")) {
            requiredParams.add(item.when.value.from.substring(1));
          }
          if (typeof item.when.value.to === "string" && item.when.value.to.startsWith(":")) {
            requiredParams.add(item.when.value.to.substring(1));
          }
        }
      }
    }
  }

  // Из WHERE
  if (queryConfigWithWrap.config.where) {
    for (const item of queryConfigWithWrap.config.where.items) {
      if (item.value) {
        if (Array.isArray(item.value)) {
          item.value.forEach((v) => {
            if (typeof v === "string" && v.startsWith(":")) {
              requiredParams.add(v.substring(1));
            }
          });
        } else if (typeof item.value === "string") {
          if (item.value.startsWith(":")) {
            requiredParams.add(item.value.substring(1));
          }
        } else if (typeof item.value === "object") {
          if (typeof item.value.from === "string" && item.value.from.startsWith(":")) {
            requiredParams.add(item.value.from.substring(1));
          }
          if (typeof item.value.to === "string" && item.value.to.startsWith(":")) {
            requiredParams.add(item.value.to.substring(1));
          }
        }
      }
    }
  }

  // 5. Проверка missing/excess параметров
  validateParams(requiredParams, params);

  // 6. Построение SQL с подставленными значениями
  return buildQuery(queryConfigWithWrap.config, params, queryConfigWithWrap.wrapJson);
}
