---
title: Get Data API
description: Единый endpoint для получения данных через SQL Builder
related:
  - /api/endpoints
  - /reference/sql-builder
  - /reference/component-queries
---

# Get Data API

Единый endpoint для получения данных через SQL Builder из конфигов в базе данных.

## Endpoint

### Получить данные

```http
GET /api/data/:query_id
```

**Параметры пути:**
- `query_id` (string, обязательно) - Идентификатор запроса из `config.component_queries.query_id`

**Query параметры:**
- `component_id` (string, обязательно для табличных запросов) - Идентификатор компонента
- Остальные параметры передаются как query params (например, `p1`, `p2`, `p3`, `class` и т.д.)

**Пример запроса:**
```bash
GET /api/data/assets_table?component_id=assets_table&p1=2025-08-01&p2=2025-07-01&p3=2024-08-01&class=assets
```

## Формат ответа

### Успешный ответ

```json
{
  "componentId": "assets_table",
  "type": "table",
  "rows": [
    {
      "id": "assets-loans",
      "class": "assets",
      "section": "loans",
      "value": 1000000,
      "previousValue": 950000,
      "ytdValue": 900000,
      "sortOrder": 1
    }
  ]
}
```

**Структура ответа:**
- `componentId` (string) - Идентификатор компонента
- `type` (string) - Тип данных, всегда `"table"` для табличных запросов
- `rows` (array) - Массив строк данных

## Контракт SQL Builder

### Входные данные

SQL Builder (функция `buildQueryFromId`) принимает:
- `queryId` (string) - идентификатор запроса из `config.component_queries.query_id`
- `paramsJson` (string) - JSON строка с параметрами для подстановки

**Важно:** Все параметры передаются как JSON строка, а не отдельные query параметры.

### Процесс работы

1. **Парсинг `paramsJson`** - валидация JSON формата
2. **Загрузка конфига из БД** - по `query_id` из `config.component_queries`
3. **Проверка `wrapJson`** - должен быть `true` для endpoint `/api/data`
4. **Сбор требуемых параметров** - из конфига (SELECT, WHERE)
5. **Проверка missing/excess параметров** - строгая валидация
6. **Построение SQL** - с подстановкой значений

## Ограничения

### wrapJson должен быть true

Endpoint требует, чтобы в конфиге запроса (`config.component_queries`) было установлено `wrap_json = true`.

**Если `wrapJson = false`:**
```json
{
  "error": "wrap_json=false: query must have wrapJson=true"
}
```

**HTTP статус:** `400 Bad Request`

### Строгая проверка параметров

SQL Builder проверяет соответствие переданных параметров конфигу:

- **Missing params** - если в конфиге есть параметр, но он не передан
- **Excess params** - если передан параметр, которого нет в конфиге

**Если есть ошибки:**
```json
{
  "error": "invalid params: missing params: p1, class; excess params: extraParam"
}
```

**HTTP статус:** `400 Bad Request`

## Параметры запроса

### Автоматическое определение типов

Параметры из query string автоматически преобразуются в соответствующие типы:

- **Даты** (`YYYY-MM-DD`) → `Date`
- **Булевы** (`true`/`false`) → `boolean`
- **Числа** → `number`
- **Остальное** → `string`

**Пример:**
```
GET /api/data/assets_table?component_id=assets_table&p1=2025-08-01&p2=2025-07-01&class=assets&active=true&limit=100
```

Преобразуется в:
```typescript
{
  p1: new Date('2025-08-01'),
  p2: new Date('2025-07-01'),
  class: 'assets',
  active: true,
  limit: 100
}
```

## Обработка ошибок

### 400 Bad Request

**Неверный JSON:**
```json
{
  "error": "invalid JSON: Unexpected token } in JSON at position 5"
}
```
Возникает при невалидном формате JSON в `paramsJson`.

**Неверный конфиг:**
```json
{
  "error": "invalid config"
}
```
Возникает, если `query_id` не найден в `config.component_queries` или запрос неактивен.

**Missing/Excess параметры:**
```json
{
  "error": "invalid params: missing params: p1, class; excess params: extraParam"
}
```
Возникает при несоответствии переданных параметров конфигу:
- `missing params` - параметры из конфига, которые не были переданы
- `excess params` - переданные параметры, которых нет в конфиге

**Пример missing params:**
```json
{
  "error": "invalid params: missing params: p1, p2, p3, class"
}
```

**Пример excess params:**
```json
{
  "error": "invalid params: excess params: extraParam, unusedParam"
}
```

**Пример обоих типов ошибок:**
```json
{
  "error": "invalid params: missing params: p3; excess params: extraParam"
}
```

**wrapJson=false:**
```json
{
  "error": "wrap_json=false: query must have wrapJson=true"
}
```
Возникает, если в конфиге `wrap_json = false`.

### 500 Internal Server Error

**Ошибка выполнения SQL:**
```json
{
  "error": "SQL execution error",
  "details": "error message"
}
```

**Неожиданный формат результата:**
```json
{
  "error": "Unexpected result format",
  "details": "Expected jsonb_agg result with wrapJson=true"
}
```

## Трансформация данных

Endpoint автоматически трансформирует данные для таблиц:

1. **Добавление `id`** - если отсутствует, формируется из иерархических полей (`class`, `section`, `item`, `sub_item`)
2. **Добавление `sortOrder`** - если отсутствует, вычисляется на основе `id`
3. **Преобразование типов** - строковые значения `value`, `previousValue`, `ytdValue` преобразуются в числа

## Критерии успешности

Запрос считается успешным, если:

1. ✅ **JSON валиден** - `paramsJson` является валидной JSON строкой
2. ✅ **Конфиг найден** - `query_id` существует в `config.component_queries` и активен
3. ✅ **wrapJson=true** - в конфиге установлено `wrap_json = true`
4. ✅ **Параметры соответствуют** - все требуемые параметры переданы, лишних параметров нет
5. ✅ **SQL выполнен** - запрос успешно выполнен в БД
6. ✅ **Результат в формате jsonb_agg** - при `wrapJson=true` результат обернут в `jsonb_agg`

**Успешный ответ:**
- HTTP статус: `200 OK`
- Формат: `{ componentId, type: "table", rows: [...] }`
- `rows` содержит массив данных из БД

## Примеры использования

### TypeScript

```typescript
async function fetchTableData(queryId: string, componentId: string, params: Record<string, any>) {
  const queryString = new URLSearchParams({
    component_id: componentId,
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString().split('T')[0] : String(value)
      ])
    )
  }).toString();
  
  const response = await fetch(`/api/data/${queryId}?${queryString}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }
  
  return response.json();
}

// Использование
const data = await fetchTableData('assets_table', 'assets_table', {
  p1: '2025-08-01',
  p2: '2025-07-01',
  p3: '2024-08-01',
  class: 'assets'
});

// data: { componentId: 'assets_table', type: 'table', rows: [...] }
```

### Примеры ошибок

**Missing params:**
```typescript
// Передано недостаточно параметров
const data = await fetchTableData('assets_table', 'assets_table', {
  p1: '2025-08-01',
  // отсутствуют p2, p3, class
});
// Ошибка: { error: "invalid params: missing params: p2, p3, class" }
```

**Excess params:**
```typescript
// Передан лишний параметр
const data = await fetchTableData('assets_table', 'assets_table', {
  p1: '2025-08-01',
  p2: '2025-07-01',
  p3: '2024-08-01',
  class: 'assets',
  extraParam: 'should not be here' // лишний параметр
});
// Ошибка: { error: "invalid params: excess params: extraParam" }
```

**Невалидный JSON:**
```typescript
// Если paramsJson невалидный (внутри endpoint)
// Ошибка: { error: "invalid JSON: Unexpected token } in JSON at position 5" }
```

**wrapJson=false:**
```typescript
// Если в конфиге wrap_json = false
// Ошибка: { error: "wrap_json=false: query must have wrapJson=true" }
```

### React Hook

```typescript
import { useQuery } from '@tanstack/react-query';

function useGetData(
  queryId: string,
  componentId: string,
  params: Record<string, any>
) {
  return useQuery({
    queryKey: ['getData', queryId, componentId, params],
    queryFn: async () => {
      const queryString = new URLSearchParams({
        component_id: componentId,
        ...Object.fromEntries(
          Object.entries(params).map(([key, value]) => [
            key,
            value instanceof Date ? value.toISOString().split('T')[0] : String(value)
          ])
        )
      }).toString();
      
      const response = await fetch(`/api/data/${queryId}?${queryString}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      return response.json();
    }
  });
}

// Использование
const { data, isLoading, error } = useGetData('assets_table', 'assets_table', {
  p1: '2025-08-01',
  class: 'assets'
});
```

## См. также

- [SQL Builder](/reference/sql-builder) - описание SQL Builder и wrapJson
- [Component Queries](/reference/component-queries) - описание конфигов запросов
- [Layout API](/api/layout-api) - получение layout с dataSourceKey
- [Endpoints](/api/endpoints) - список всех API endpoints
