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

### GET /api/data

Получение данных через query string.

**Query параметры (обязательные):**
- `query_id` (string) - Идентификатор запроса из `config.component_queries.query_id`
- `component_Id` (string) - Идентификатор компонента (обратите внимание на заглавную I)

**Query параметры (опциональные):**
- `parametrs` (string) - JSON строка с параметрами для подстановки в SQL (обратите внимание на опечатку в названии)

**Пример запроса:**
```bash
GET /api/data?query_id=assets_table&component_Id=assets_table&parametrs={"p1":"2025-08-01","p2":"2025-07-01","p3":"2024-08-01","class":"assets"}
```

**Пример без параметров:**
```bash
GET /api/data?query_id=header_dates&component_Id=header
```

**Пример с curl:**
```bash
curl "http://localhost:3001/api/data?query_id=assets_table&component_Id=assets_table&parametrs=%7B%22p1%22%3A%222025-08-01%22%2C%22p2%22%3A%222025-07-01%22%2C%22p3%22%3A%222024-08-01%22%2C%22class%22%3A%22assets%22%7D"
```

**Примечание:** Параметры используют опечатки в названиях (`component_Id` вместо `component_id`, `parametrs` вместо `params`) для обратной совместимости.

## Формат ответа

### Успешный ответ (табличные данные)

```json
{
  "componentId": "assets_table",
  "type": "table",
  "rows": [
    {
      "id": "assets-loans",
      "class": "assets",
      "section": "loans",
      "item": "corporate_loans",
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

### Успешный ответ (layout)

Для `query_id = "layout"` возвращается структура sections:

```json
{
  "sections": [
    {
      "id": "balance",
      "title": "Баланс",
      "components": [...]
    }
  ]
}
```

### Успешный ответ (header_dates)

Для `query_id = "header_dates"` возвращаются даты периодов:

```json
{
  "componentId": "header",
  "type": "table",
  "rows": [
    {
      "periodDate": "2025-08-31",
      "ppDate": "2025-07-31",
      "pyDate": "2024-08-31"
    }
  ]
}
```

## Как работает endpoint

### Процесс работы

1. **Валидация входных данных**
   - Проверка наличия `query_id` и `component_id`
   - Проверка формата `params` (для POST) или `parametrs` (для GET)

2. **Специальная обработка для header_dates**
   - Если `query_id === "header_dates"`, endpoint обходит SQL Builder
   - Вызывает `periodService.getHeaderDates()` напрямую
   - Возвращает даты периодов без выполнения SQL запроса

3. **Специальная обработка для layout**
   - Если `query_id === "layout"`, выполняется SQL через SQL Builder
   - Результат извлекается из `jsonb_agg` и возвращается структура `sections`
   - Используется view `config.layout_sections_json_view`

4. **Построение SQL через SQL Builder**
   - Преобразование `params` в JSON строку (`paramsJson`)
   - Вызов `buildQueryFromId(query_id, paramsJson)`
   - SQL Builder:
     - Парсит `paramsJson` и валидирует JSON
     - Загружает конфиг из `config.component_queries` по `query_id`
     - Проверяет `wrapJson === true` (обязательно для `/api/data`)
     - Собирает требуемые параметры из конфига (SELECT, WHERE)
     - Проверяет missing/excess параметры
     - Строит SQL с подстановкой значений

5. **Выполнение SQL**
   - SQL выполняется в БД через connection pool
   - При `wrapJson=true` результат обернут в `jsonb_agg(row_to_json(t))`
   - Результат: `result.rows[0].jsonb_agg` - массив объектов

6. **Трансформация данных**
   - Вызывается `transformTableData(data)` для табличных данных
   - Добавление `id` если отсутствует (формируется из `class-section-item-sub_item`)
   - Добавление `sortOrder` если отсутствует (через `rowNameMapper.getSortOrder()`)
   - Преобразование строк в числа для `value`, `previousValue`, `ytdValue`

7. **Формирование ответа**
   - Для табличных данных: `{ componentId, type: "table", rows }`
   - Для layout: `{ sections }`
   - Для header_dates: `{ componentId, type: "table", rows: [{ periodDate, ppDate, pyDate }] }`

### Схема работы

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Request                          │
│  GET /api/data?query_id=...&component_Id=...&parametrs=...   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              dataRoutes.ts (Endpoint Handler)               │
│                                                              │
│  1. Валидация query_id, component_id, params               │
│  2. Специальная обработка?                                  │
│     ├─ header_dates → periodService.getHeaderDates()       │
│     └─ layout → SQL Builder → extract sections             │
│  3. buildQueryFromId(query_id, paramsJson)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SQL Builder (buildQueryFromId)                 │
│                                                              │
│  1. Парсинг paramsJson (валидация JSON)                    │
│  2. Загрузка конфига из config.component_queries           │
│  3. Проверка wrapJson === true                              │
│  4. Сбор требуемых параметров из конфига                   │
│  5. Валидация missing/excess параметров                     │
│  6. Построение SQL с подстановкой значений                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                           │
│                                                              │
│  Выполнение SQL запроса                                      │
│  Результат: result.rows[0].jsonb_agg (массив объектов)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Трансформация данных                            │
│                                                              │
│  transformTableData(data):                                  │
│  - Добавление id (если отсутствует)                         │
│  - Добавление sortOrder (если отсутствует)                  │
│  - Преобразование строк в числа (value, previousValue, ...) │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Response                                 │
│  { componentId, type: "table", rows: [...] }                 │
└─────────────────────────────────────────────────────────────┘
```

## Специальные случаи

### header_dates

Для `query_id = "header_dates"` endpoint обходит SQL Builder и использует `periodService.getHeaderDates()` напрямую.

**Почему:** Даты периодов рассчитываются относительно `NOW()`, а не из данных БД.

**Процесс:**
1. Вызов `getHeaderDates()` из `periodService`
2. Возврат дат в формате:
   ```json
   {
     "componentId": "header",
     "type": "table",
     "rows": [{
       "periodDate": "2025-08-31",
       "ppDate": "2025-07-31",
       "pyDate": "2024-08-31"
     }]
   }
   ```

**Конфиг в БД:** Конфиг `header_dates` в `config.component_queries` существует, но не используется для этого endpoint.

### layout

Для `query_id = "layout"` endpoint использует SQL Builder, но возвращает структуру `sections` вместо `rows`.

**Процесс:**
1. Построение SQL через SQL Builder (использует view `config.layout_sections_json_view`)
2. Выполнение SQL запроса
3. Извлечение `sections` из результата `jsonb_agg`
4. Возврат в формате:
   ```json
   {
     "sections": [...]
   }
   ```

**Конфиг:** Использует конфиг `layout` из `config.component_queries` с параметром `layout_id`.

## Контракт SQL Builder

### Входные данные

SQL Builder (функция `buildQueryFromId`) принимает:
- `queryId` (string) - идентификатор запроса из `config.component_queries.query_id`
- `paramsJson` (string) - JSON строка с параметрами для подстановки

**Важно:** Все параметры передаются как JSON строка, а не отдельные query параметры.

### Процесс работы SQL Builder

1. **Парсинг `paramsJson`** - валидация JSON формата
2. **Загрузка конфига из БД** - по `query_id` из `config.component_queries`
3. **Проверка `wrapJson`** - должен быть `true` для endpoint `/api/data`
4. **Сбор требуемых параметров** - из конфига (SELECT case_agg, WHERE)
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

### Преобразование типов

В GET методе параметры передаются как query string в JSON строке (`parametrs`) и автоматически преобразуются:
- **Даты** (`YYYY-MM-DD`) → `Date`
- **Булевы** (`true`/`false`) → `boolean`
- **Числа** → `number`
- **Остальное** → `string`

**Пример:**
```
GET /api/data?query_id=assets_table&component_Id=assets_table&parametrs={"p1":"2025-08-01","class":"assets","active":true,"limit":100}
```

## Трансформация данных

Endpoint автоматически трансформирует данные для таблиц через функцию `transformTableData()`:

### 1. Добавление `id`

Если поле `id` отсутствует в данных, оно формируется из иерархических полей:
```typescript
const idParts = [row.class, row.section, row.item, row.sub_item].filter(Boolean);
row.id = idParts.join('-') || 'unknown';
```

**Пример:**
- `class: "assets"`, `section: "loans"`, `item: "corporate"` → `id: "assets-loans-corporate"`

### 2. Добавление `sortOrder`

Если поле `sortOrder` отсутствует, оно вычисляется через `rowNameMapper.getSortOrder(row.id)`:
- Извлекает числовой префикс из `id` (например, `a1` → `1000`, `a2-1` → `2001`)
- Используется для сортировки строк в таблице

### 3. Преобразование типов

Строковые значения числовых полей преобразуются в числа:
- `value` (string) → `value` (number)
- `previousValue` (string) → `previousValue` (number)
- `ytdValue` (string) → `ytdValue` (number)

**Примечание:** Преобразование происходит только если значение является строкой. Если значение уже число, оно остается без изменений.

## Обработка ошибок

### 400 Bad Request

**Отсутствует query_id:**
```json
{
  "error": "query_id is required and must be a string"
}
```

**Отсутствует query_id:**
```json
{
  "error": "query_id is required"
}
```

**Отсутствует component_Id:**
```json
{
  "error": "component_Id is required"
}
```

**Неверный JSON в parametrs:**
```json
{
  "error": "invalid JSON in parametrs"
}
```

**Неверный JSON (SQL Builder):**
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

**Ошибка построения запроса:**
```json
{
  "error": "Failed to build query",
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
Возникает, если результат SQL не содержит `jsonb_agg` (при `wrapJson=true`).

**Для layout:**
```json
{
  "error": "Unexpected result format",
  "details": "Expected sections array in result"
}
```

**Внутренняя ошибка:**
```json
{
  "error": "Internal server error"
}
```

## Критерии успешности

Запрос считается успешным, если:

1. ✅ **Входные данные валидны** - `query_id`, `component_id`, `params` присутствуют и имеют правильный формат
2. ✅ **JSON валиден** - `paramsJson` является валидной JSON строкой (для SQL Builder)
3. ✅ **Конфиг найден** - `query_id` существует в `config.component_queries` и активен
4. ✅ **wrapJson=true** - в конфиге установлено `wrap_json = true` (кроме header_dates)
5. ✅ **Параметры соответствуют** - все требуемые параметры переданы, лишних параметров нет
6. ✅ **SQL выполнен** - запрос успешно выполнен в БД
7. ✅ **Результат в формате jsonb_agg** - при `wrapJson=true` результат обернут в `jsonb_agg`

**Успешный ответ:**
- HTTP статус: `200 OK`
- Формат: `{ componentId, type: "table", rows: [...] }` или `{ sections: [...] }` для layout
- `rows` содержит массив данных из БД после трансформации

## Примеры использования

### TypeScript

```typescript
async function fetchTableData(
  queryId: string, 
  componentId: string, 
  params?: Record<string, any>
) {
  const paramsJson = params ? JSON.stringify(params) : '{}';
  const queryString = new URLSearchParams({
    query_id: queryId,
    component_Id: componentId, // Обратите внимание на заглавную I
    ...(params ? { parametrs: paramsJson } : {}) // Обратите внимание на опечатку
  }).toString();
  
  const response = await fetch(`/api/data?${queryString}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to fetch data: ${response.statusText}`);
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

// Использование без параметров
const headerData = await fetchTableData('header_dates', 'header');
```

### React Hook

```typescript
import { useQuery } from '@tanstack/react-query';

function useGetData(
  queryId: string,
  componentId: string,
  params?: Record<string, any>
) {
  return useQuery({
    queryKey: ['getData', queryId, componentId, params],
    queryFn: async () => {
      const paramsJson = params ? JSON.stringify(params) : '{}';
      const queryString = new URLSearchParams({
        query_id: queryId,
        component_Id: componentId, // Обратите внимание на заглавную I
        ...(params ? { parametrs: paramsJson } : {}) // Обратите внимание на опечатку
      }).toString();
      
      const response = await fetch(`/api/data?${queryString}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch data: ${response.statusText}`);
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

// Использование без параметров
const { data: headerData } = useGetData('header_dates', 'header');
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

### Пример с header_dates

```typescript
// Получение дат периодов для header
const headerData = await fetchTableData('header_dates', 'header', {});
// Результат: { componentId: 'header', type: 'table', rows: [{ periodDate, ppDate, pyDate }] }
```

### Пример с layout

```typescript
// Получение структуры sections для layout
const layoutData = await fetchTableData('layout', 'layout', {
  layout_id: 'main_dashboard'
});
// Результат: { sections: [...] }
```

## Внутренние вызовы

### SQL Builder

- `buildQueryFromId(queryId, paramsJson)` - построение SQL из конфига
- Загружает конфиг из `config.component_queries` по `query_id`
- Валидирует параметры (missing/excess)
- Строит SQL с подстановкой значений

### Period Service

- `getHeaderDates()` - расчет дат периодов для header
- Используется напрямую для `query_id = "header_dates"`
- Обходит SQL Builder

### Row Name Mapper

- `getSortOrder(rowId)` - вычисление порядка сортировки
- Используется в `transformTableData()` для добавления `sortOrder`

## См. также

- [SQL Builder](/reference/sql-builder) - описание SQL Builder и wrapJson
- [Component Queries](/reference/component-queries) - описание конфигов запросов
- [Layout API](/api/layout-api) - получение layout с dataSourceKey
- [Endpoints](/api/endpoints) - список всех API endpoints
