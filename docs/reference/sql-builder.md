---
title: SQL Builder
description: Библиотека для построения SQL запросов из JSON-конфигурации с автоматической подстановкой значений
related:
  - /reference/component-queries
  - /api/get-data
  - /database/schemas
---

# SQL Builder

Библиотека для построения SQL запросов из JSON-конфигурации с автоматической подстановкой значений и защитой от SQL-инъекций.

## Обзор

SQL Builder принимает JSON-конфигурацию запроса и параметры, строит валидный SQL запрос с подставленными значениями и возвращает готовую SQL строку.

**Преимущества:**
- ✅ Защита от SQL-инъекций через экранирование значений
- ✅ Единый источник конфигов в БД (`config.component_queries`)
- ✅ Автоматическая подстановка значений по типам
- ✅ Строгая валидация параметров (missing/excess)
- ✅ Поддержка JSON агрегации через `wrapJson`
- ✅ Структурированный подход к построению запросов

**Ограничения:**
- ❌ **Без JOIN** - только одна таблица
- ❌ **Без raw SQL выражений** - только структурные блоки
- ❌ **WHERE без вложенных групп** - один уровень AND/OR
- ❌ **Именованные параметры в конфиге** - преобразуются в подставленные значения

## API

### buildQueryFromId(queryId, paramsJson)

Строит SQL запрос по `query_id` с загрузкой конфига из БД.

**Параметры:**
- `queryId` (string) - Идентификатор запроса из `config.component_queries.query_id`
- `paramsJson` (string) - JSON строка с параметрами для подстановки

**Возвращает:**
- `sql` (string) - Готовый SQL запрос с подставленными значениями

**Процесс работы:**
1. Парсинг `paramsJson` с валидацией JSON
2. Загрузка конфига из БД по `query_id`
3. Проверка `wrapJson` (должен быть `true` для `/api/data`)
4. Сбор требуемых параметров из конфига
5. Проверка missing/excess параметров
6. Построение SQL с подстановкой значений

**Пример:**
```typescript
import { buildQueryFromId } from '@/services/queryBuilder';

const paramsJson = JSON.stringify({
  p1: '2025-12-31',
  p2: '2025-11-30',
  p3: '2024-12-31',
  class: 'assets'
});

const sql = await buildQueryFromId('assets_table', paramsJson);
// sql: готовый SQL с подставленными значениями
```

### buildQuery(config, params, wrapJson?)

Строит SQL запрос из конфига с подстановкой значений.

**Параметры:**
- `config` (QueryConfig) - Конфигурация запроса
- `params` (Record<string, string | number | boolean | Date>) - Значения параметров
- `wrapJson` (boolean, опционально, по умолчанию false) - Оборачивать ли результат в jsonb_agg

**Возвращает:**
- `sql` (string) - Готовый SQL запрос с подставленными значениями

**Пример:**
```typescript
import { buildQuery } from '@/services/queryBuilder';

const config = {
  from: { schema: 'mart', table: 'balance' },
  select: [
    { type: 'column', field: 'class' },
    { type: 'agg', func: 'sum', field: 'value', as: 'total' }
  ],
  where: {
    op: 'and',
    items: [
      { field: 'class', op: '=', value: ':class' }
    ]
  },
  paramTypes: { class: 'string' },
  params: {} // Не используется, но обязателен
};

// Обычный SQL
const sql = buildQuery(config, { class: 'assets' }, false);

// SQL с jsonb_agg
const sqlJson = buildQuery(config, { class: 'assets' }, true);
```

## Формат JSON конфигурации

### Структура QueryConfig

```typescript
interface QueryConfig {
  from: FromConfig;              // Обязательно
  select: SelectItem[];          // Обязательно, не пустой массив
  where?: WhereConfig;           // Опционально
  groupBy?: string[];           // Опционально
  orderBy?: OrderByItem[];      // Опционально
  limit?: number;               // Опционально
  offset?: number;              // Опционально
  params: Record<string, any>;  // Обязательно (примеры значений)
  paramTypes?: Record<string, ParamType>; // Опционально
}
```

### Требования к конфигурации

#### 1. FROM (обязательно)

```json
{
  "from": {
    "schema": "mart",
    "table": "balance"
  }
}
```

**Требования:**
- `schema` и `table` должны быть валидными идентификаторами (regex: `^[a-zA-Z_][a-zA-Z0-9_]*$`)
- Не поддерживаются подзапросы или JOIN

#### 2. SELECT (обязательно, не пустой)

Массив элементов SELECT. Поддерживаются три типа:

**a) Column (простая колонка):**
```json
{
  "type": "column",
  "field": "class",
  "as": "class_name"  // опционально
}
```

**b) Agg (агрегация):**
```json
{
  "type": "agg",
  "func": "sum",           // "sum" | "avg" | "min" | "max" | "count"
  "field": "value",
  "as": "total",          // опционально
  "distinct": false       // опционально
}
```

**c) Case Agg (условная агрегация):**
```json
{
  "type": "case_agg",
  "func": "sum",
  "when": {
    "field": "period_date",
    "op": "=",
    "value": ":p1"
  },
  "then": {
    "field": "value"
  },
  "else": null,           // или { "field": "other_field" }
  "as": "value"
}
```

**Поддерживаемые операторы в `when`:**
- `=`, `!=`, `>`, `>=`, `<`, `<=`
- `in` - массив значений: `[":p1", ":p2"]`
- `between` - объект: `{ "from": ":dateFrom", "to": ":dateTo" }`
- `like`, `ilike`
- `is_null`, `is_not_null` - без `value`

#### 3. WHERE (опционально)

```json
{
  "where": {
    "op": "and",          // "and" | "or"
    "items": [
      {
        "field": "class",
        "op": "=",
        "value": ":class"
      },
      {
        "field": "period_date",
        "op": "in",
        "value": [":p1", ":p2", ":p3"]
      },
      {
        "field": "period_date",
        "op": "between",
        "value": {
          "from": ":dateFrom",
          "to": ":dateTo"
        }
      },
      {
        "field": "description",
        "op": "is_null"
      }
    ]
  }
}
```

**Ограничения:**
- Только один уровень AND/OR (без вложенных групп)
- Все операторы из списка выше

#### 4. GROUP BY (опционально)

```json
{
  "groupBy": ["class", "section", "item"]
}
```

**Требования:**
- Массив валидных идентификаторов полей
- Поля должны присутствовать в SELECT или быть агрегируемыми

#### 5. ORDER BY (опционально)

```json
{
  "orderBy": [
    { "field": "class", "direction": "asc" },
    { "field": "section", "direction": "desc" }
  ]
}
```

**Требования:**
- `direction`: `"asc"` | `"desc"`
- Поля должны быть валидными идентификаторами

#### 6. LIMIT / OFFSET (опционально)

```json
{
  "limit": 1000,
  "offset": 0
}
```

**Требования:**
- Неотрицательные числа

#### 7. params (обязательно)

```json
{
  "params": {
    "p1": "2025-08-01",
    "p2": "2025-07-01",
    "class": "assets"
  }
}
```

**Назначение:** Примеры значений параметров (используются только для документации, не для валидации)

#### 8. paramTypes (опционально)

```json
{
  "paramTypes": {
    "p1": "date",
    "p2": "date",
    "class": "string",
    "active": "boolean",
    "limit": "number"
  }
}
```

**Поддерживаемые типы:**
- `"string"` - строка
- `"number"` - число
- `"date"` - дата (формат YYYY-MM-DD)
- `"boolean"` - булево значение

**Назначение:** Указывает тип параметра для корректного форматирования в SQL

## Параметры

### Формат параметров

Параметры в конфиге указываются как строки с префиксом `:`:
- `:p1` - параметр `p1`
- `:class` - параметр `class`
- `:dateFrom` - параметр `dateFrom`

### Валидация параметров

SQL Builder выполняет строгую проверку параметров:

1. **Сбор требуемых параметров** - из SELECT (case_agg) и WHERE
2. **Проверка missing params** - все параметры из конфига должны быть переданы
3. **Проверка excess params** - все переданные параметры должны быть в конфиге

**Ошибка missing params:**
```
invalid params: missing params: p1, p2, class
```

**Ошибка excess params:**
```
invalid params: excess params: extraParam, unusedParam
```

**Ошибка обоих типов:**
```
invalid params: missing params: p3; excess params: extraParam
```

### Подстановка значений

Значения подставляются в SQL в зависимости от типа:

**Строки (`string`):**
- Оборачиваются в одинарные кавычки: `'value'`
- Экранируются одинарные кавычки: `'O\'Brien'` → `'O''Brien'`
- Экранируются обратные слеши: `'path\\to\\file'`

**Даты (`date`):**
- Форматируются в `YYYY-MM-DD`
- Оборачиваются в одинарные кавычки: `'2025-12-31'`

**Числа (`number`):**
- Подставляются как есть (без кавычек): `1000000`, `3.14`

**Булевы (`boolean`):**
- Преобразуются в SQL: `true` → `TRUE`, `false` → `FALSE`

**NULL:**
- Подставляется как `NULL` (без кавычек)

## Валидация конфигурации

### Правила валидации

1. **Идентификаторы** - должны соответствовать regex: `^[a-zA-Z_][a-zA-Z0-9_]*$`
2. **Параметры** - должны начинаться с `:` и иметь длину > 1
3. **Типы SELECT** - только `column`, `agg`, `case_agg`
4. **Функции агрегации** - только `sum`, `avg`, `min`, `max`, `count`
5. **Операторы WHERE** - только из списка поддерживаемых
6. **Логические операторы** - только `and`, `or`

### Ошибки валидации

При ошибке валидации выбрасывается:
```typescript
throw new Error("invalid config");
```

**Детализация ошибки не предоставляется** по соображениям безопасности.

## wrapJson

### Описание

Флаг `wrapJson` управляет тем, должен ли результат запроса быть агрегирован в JSON массив.

**Хранение:**
- В БД: поле `wrap_json` в таблице `config.component_queries`
- В API: параметр `wrapJson` функции `buildQuery()`

**Поведение:**

**`wrapJson = false` (по умолчанию):**
- Возвращается обычный SELECT запрос
- Результат: массив строк (каждая строка - объект с полями)

**`wrapJson = true`:**
- Базовый SELECT оборачивается в `jsonb_agg(row_to_json(t))`
- Результат: один JSON массив со всеми строками

### SQL структура

**Без wrapJson (wrapJson = false):**
```sql
SELECT "class", "section", SUM("value") AS "total"
FROM "mart"."balance"
WHERE "class" = 'assets'
GROUP BY "class", "section";
```

**С wrapJson (wrapJson = true):**
```sql
SELECT jsonb_agg(row_to_json(t))
FROM (
  SELECT "class", "section", SUM("value") AS "total"
  FROM "mart"."balance"
  WHERE "class" = 'assets'
  GROUP BY "class", "section"
) t;
```

### Ограничение для /api/data

Endpoint `/api/data` требует `wrapJson=true`:
```
wrap_json=false: query must have wrapJson=true
```

## Примеры конфигураций

### Пример 1: Простой запрос с агрегацией

```json
{
  "from": {
    "schema": "mart",
    "table": "kpi_metrics"
  },
  "select": [
    {
      "type": "agg",
      "func": "max",
      "field": "period_date",
      "as": "current"
    }
  ],
  "params": {},
  "paramTypes": {}
}
```

**SQL:**
```sql
SELECT MAX("period_date") AS "current"
FROM "mart"."kpi_metrics";
```

### Пример 2: Запрос с WHERE и GROUP BY

```json
{
  "from": {
    "schema": "mart",
    "table": "balance"
  },
  "select": [
    { "type": "column", "field": "class" },
    { "type": "column", "field": "section" },
    {
      "type": "agg",
      "func": "sum",
      "field": "value",
      "as": "total"
    }
  ],
  "where": {
    "op": "and",
    "items": [
      { "field": "class", "op": "=", "value": ":class" },
      { "field": "period_date", "op": ">=", "value": ":dateFrom" }
    ]
  },
  "groupBy": ["class", "section"],
  "orderBy": [
    { "field": "class", "direction": "asc" },
    { "field": "section", "direction": "asc" }
  ],
  "limit": 100,
  "params": {
    "class": "assets",
    "dateFrom": "2025-01-01"
  },
  "paramTypes": {
    "class": "string",
    "dateFrom": "date"
  }
}
```

**SQL (с параметрами `{ class: 'assets', dateFrom: '2025-01-01' }`):**
```sql
SELECT "class", "section", SUM("value") AS "total"
FROM "mart"."balance"
WHERE "class" = 'assets' AND "period_date" >= '2025-01-01'
GROUP BY "class", "section"
ORDER BY "class" ASC, "section" ASC
LIMIT 100;
```

### Пример 3: CASE агрегация (расчет по периодам)

```json
{
  "from": {
    "schema": "mart",
    "table": "balance"
  },
  "select": [
    { "type": "column", "field": "class" },
    { "type": "column", "field": "section" },
    {
      "type": "case_agg",
      "func": "sum",
      "when": { "field": "period_date", "op": "=", "value": ":p1" },
      "then": { "field": "value" },
      "else": null,
      "as": "value"
    },
    {
      "type": "case_agg",
      "func": "sum",
      "when": { "field": "period_date", "op": "=", "value": ":p2" },
      "then": { "field": "value" },
      "else": null,
      "as": "ppValue"
    }
  ],
  "where": {
    "op": "and",
    "items": [
      { "field": "class", "op": "=", "value": ":class" },
      { "field": "period_date", "op": "in", "value": [":p1", ":p2"] }
    ]
  },
  "groupBy": ["class", "section"],
  "params": {
    "p1": "2025-12-31",
    "p2": "2025-11-30",
    "class": "assets"
  },
  "paramTypes": {
    "p1": "date",
    "p2": "date",
    "class": "string"
  }
}
```

**SQL (с параметрами):**
```sql
SELECT
  "class",
  "section",
  SUM(CASE WHEN "period_date" = '2025-12-31' THEN "value" ELSE NULL END) AS "value",
  SUM(CASE WHEN "period_date" = '2025-11-30' THEN "value" ELSE NULL END) AS "ppValue"
FROM "mart"."balance"
WHERE "class" = 'assets' AND "period_date" IN ('2025-12-31', '2025-11-30')
GROUP BY "class", "section";
```

### Пример 4: WHERE с BETWEEN и IN

```json
{
  "from": {
    "schema": "mart",
    "table": "balance"
  },
  "select": [
    { "type": "column", "field": "class" },
    { "type": "agg", "func": "sum", "field": "value", "as": "total" }
  ],
  "where": {
    "op": "and",
    "items": [
      { "field": "class", "op": "in", "value": [":class1", ":class2"] },
      { "field": "period_date", "op": "between", "value": { "from": ":dateFrom", "to": ":dateTo" } }
    ]
  },
  "groupBy": ["class"],
  "params": {
    "class1": "assets",
    "class2": "liabilities",
    "dateFrom": "2025-01-01",
    "dateTo": "2025-12-31"
  },
  "paramTypes": {
    "class1": "string",
    "class2": "string",
    "dateFrom": "date",
    "dateTo": "date"
  }
}
```

**SQL:**
```sql
SELECT "class", SUM("value") AS "total"
FROM "mart"."balance"
WHERE "class" IN ('assets', 'liabilities')
  AND "period_date" BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY "class";
```

## Обработка ошибок

### Типы ошибок

**1. invalid JSON:**
```
invalid JSON: Unexpected token } in JSON at position 5
```
Возникает при невалидном формате JSON в `paramsJson`.

**2. invalid config:**
```
invalid config
```
Возникает при:
- Невалидной структуре конфига
- Невалидных идентификаторах
- Неподдерживаемых операторах/функциях
- Отсутствии конфига в БД

**3. invalid params:**
```
invalid params: missing params: p1, class; excess params: extraParam
```
Возникает при несоответствии параметров конфигу.

**4. wrap_json=false:**
```
wrap_json=false: query must have wrapJson=true
```
Возникает, если `wrap_json = false` в БД (для `/api/data`).

## Безопасность

### Защита от SQL-инъекций

1. **Экранирование строк** - все строковые значения экранируются (одинарные кавычки удваиваются)
2. **Экранирование идентификаторов** - имена схем, таблиц и полей экранируются через двойные кавычки
3. **Валидация идентификаторов** - проверка на формат `^[a-zA-Z_][a-zA-Z0-9_]*$`
4. **Валидация параметров** - строгая проверка missing/excess
5. **Нет raw-выражений** - запрещены произвольные SQL выражения
6. **Типизация параметров** - автоматическое определение и форматирование типов

### Ограничения безопасности

- Детализация ошибок не предоставляется (только `invalid config` или `invalid params`)
- Нет возможности выполнить произвольный SQL
- Все значения подставляются с экранированием

## Использование

### Загрузка конфига из БД

```typescript
import { buildQueryFromId } from '@/services/queryBuilder';

// Загрузка конфига из config.component_queries по query_id
const paramsJson = JSON.stringify({
  p1: '2025-12-31',
  p2: '2025-11-30',
  p3: '2024-12-31',
  class: 'assets'
});

const sql = await buildQueryFromId('assets_table', paramsJson);

// Выполнение SQL
const result = await pool.query(sql);

// При wrapJson=true результат в result.rows[0].jsonb_agg
// При wrapJson=false результат в result.rows
```

### Прямое использование конфига

```typescript
import { buildQuery } from '@/services/queryBuilder';

const config: QueryConfig = {
  from: { schema: 'mart', table: 'balance' },
  select: [
    { type: 'column', field: 'class' },
    { type: 'agg', func: 'sum', field: 'value', as: 'total' }
  ],
  where: {
    op: 'and',
    items: [
      { field: 'class', op: '=', value: ':class' }
    ]
  },
  paramTypes: { class: 'string' },
  params: {}
};

const sql = buildQuery(config, { class: 'assets' }, false);
const result = await pool.query(sql);
```

## См. также

- [Component Queries](/reference/component-queries) - описание таблицы конфигов и примеры
- [Get Data API](/api/get-data) - использование SQL Builder через `/api/data` endpoint
- [Database Schema](/database/schemas) - структура базы данных
