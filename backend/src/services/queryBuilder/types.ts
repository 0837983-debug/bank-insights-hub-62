/**
 * Типы для JSON-конфига SQL Builder
 */

/**
 * Тип значения параметра
 */
export type ParamType = "string" | "number" | "date" | "boolean";

/**
 * Направление сортировки
 */
export type SortDirection = "asc" | "desc";

/**
 * Оператор сравнения в WHERE
 */
export type WhereOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "in"
  | "between"
  | "like"
  | "ilike"
  | "is_null"
  | "is_not_null";

/**
 * Логический оператор в WHERE
 */
export type WhereLogicOperator = "and" | "or";

/**
 * FROM блок
 */
export interface FromConfig {
  schema: string;
  table: string;
}

/**
 * Ссылка на поле
 */
export interface FieldRef {
  field: string;
}

/**
 * Значение параметра (строка вида ":paramName")
 */
export type ParamValue = string;

/**
 * SELECT: колонка
 */
export interface SelectColumn {
  type: "column";
  field: string;
  as?: string;
}

/**
 * SELECT: агрегация
 */
export interface SelectAgg {
  type: "agg";
  func: "sum" | "avg" | "min" | "max" | "count";
  field: string;
  as?: string;
  distinct?: boolean;
}

/**
 * SELECT: CASE агрегация
 */
export interface SelectCaseAgg {
  type: "case_agg";
  func: "sum" | "avg" | "min" | "max" | "count";
  when: {
    field: string;
    op: WhereOperator;
    value: ParamValue | ParamValue[] | { from: ParamValue; to: ParamValue } | null;
  };
  then: FieldRef;
  else: FieldRef | null;
  as?: string;
}

/**
 * Элемент SELECT
 */
export type SelectItem = SelectColumn | SelectAgg | SelectCaseAgg;

/**
 * Условие WHERE: простое
 */
export interface WhereItem {
  field: string;
  op: WhereOperator;
  value?: ParamValue | ParamValue[] | { from: ParamValue; to: ParamValue };
}

/**
 * WHERE блок
 */
export interface WhereConfig {
  op: WhereLogicOperator;
  items: WhereItem[];
}

/**
 * ORDER BY элемент
 */
export interface OrderByItem {
  field: string;
  direction: SortDirection;
}

/**
 * Полный конфиг запроса
 */
export interface QueryConfig {
  from: FromConfig;
  select: SelectItem[];
  where?: WhereConfig;
  groupBy?: string[];
  orderBy?: OrderByItem[];
  limit?: number;
  offset?: number;
  params: Record<string, string | number | boolean | Date>;
  paramTypes?: Record<string, ParamType>;
}

/**
 * Результат построения SQL
 */
export interface QueryResult {
  sql: string;
  params: Array<string | number | boolean | Date>;
}
