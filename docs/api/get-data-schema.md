---
title: Схема работы /api/data
description: Краткая схема работы endpoint /api/data со ссылками на используемые сервисы
related:
  - /api/get-data
  - /architecture/backend/
---

# Схема работы /api/data

## Общая схема

```
GET /api/data?query_id=...&component_Id=...&parametrs=...
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  dataRoutes.ts (GET /)                                  │
│  - Валидация query_id, component_Id, parametrs          │
│  - Парсинг JSON из parametrs                            │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    Специальные              Обычные
    случаи                   запросы
         │                       │
         │                       │
    ┌────┴────┐                  │
    │         │                  │
    ▼         ▼                  ▼
header_dates kpis            layout
    │         │                  │
    │         │                  │
    ▼         ▼                  ▼
```

## Специальные случаи

### 1. `query_id = "header_dates"`

```
header_dates
    │
    ▼
[buildQueryFromId("header_dates", paramsJson)]
    │
    ├─ backend/src/services/queryBuilder/builder.ts
    │  - buildQueryFromId(queryId, paramsJson): string
    │  - Загружает конфиг из config.component_queries
    │  - Валидирует параметры
    │  - Строит SQL с подстановкой значений
    │
    ▼
[SQL выполнение через pool.query()]
    │
    ├─ Использует view: mart.v_p_dates
    │  - Получает даты из mart.v_kpi_all (distinct period_date)
    │
    ▼
{ componentId, type: "header", rows: [{ periodDate, isP1, isP2, isP3 }] }
```

**Сервис:** [`builder.ts`](/backend/src/services/queryBuilder/builder.ts#L457)

---

### 2. `query_id = "kpis"`

```
kpis
    │
    ▼
[buildQueryFromId("kpis", paramsJson)]
    │
    ├─ backend/src/services/queryBuilder/builder.ts
    │  - buildQueryFromId(queryId, paramsJson): string
    │  - Загружает конфиг из config.component_queries
    │  - Валидирует параметры
    │  - Строит SQL с подстановкой значений
    │
    ▼
[SQL выполнение через pool.query()]
    │
    ├─ backend/src/config/database.ts
    │  - pool: pg.Pool
    │
    ▼
[transformKPIData(data, periodDate)]
    │
    ├─ backend/src/routes/dataRoutes.ts (локальная функция)
    │  - Использует calculateChange() из calculationService
    │  - Рассчитывает ppChange, ytdChange, ppChangeAbsolute, ytdChangeAbsolute
    │
    ├─ backend/src/services/mart/base/calculationService.ts
    │  - calculateChange(current, previous): number
    │
    ▼
KPIMetric[] (массив напрямую, без обертки)
```

**Сервисы:**
- [`builder.ts`](/backend/src/services/queryBuilder/builder.ts#L457) - SQL Builder
- [`calculationService.ts`](/backend/src/services/mart/base/calculationService.ts#L5) - Расчет изменений

---

### 3. `query_id = "layout"`

```
layout
    │
    ▼
[buildQueryFromId("layout", paramsJson)]
    │
    ├─ backend/src/services/queryBuilder/builder.ts
    │
    ▼
[SQL выполнение через pool.query()]
    │
    ├─ Использует view: config.layout_sections_json_view
    │
    ▼
[Извлечение sections из jsonb_agg]
    │
    ▼
{ sections: [...] }
```

**Сервис:** [`builder.ts`](/backend/src/services/queryBuilder/builder.ts#L457)

---

## Обычные запросы (табличные данные)

```
query_id (например, "assets_table")
    │
    ▼
[buildQueryFromId(query_id, paramsJson)]
    │
    ├─ backend/src/services/queryBuilder/builder.ts
    │  - buildQueryFromId(queryId, paramsJson): string
    │  - Загружает конфиг из config.component_queries
    │  - Валидирует параметры (missing/excess)
    │  - Проверяет wrapJson === true
    │  - Строит SQL с подстановкой значений
    │
    ├─ backend/src/services/queryBuilder/queryLoader.ts
    │  - loadQueryConfig(queryId): QueryConfig
    │
    ├─ backend/src/services/queryBuilder/validator.ts
    │  - validateParams(params, config): void
    │
    ▼
[SQL выполнение через pool.query()]
    │
    ├─ backend/src/config/database.ts
    │  - pool: pg.Pool
    │
    ▼
[transformTableData(data)]
    │
    ├─ backend/src/routes/dataRoutes.ts (локальная функция)
    │  - Добавление id (если отсутствует)
    │  - Добавление sortOrder (если отсутствует)
    │  - Преобразование строк в числа (value, previousValue, ytdValue)
    │
    ├─ backend/src/services/mart/base/rowNameMapper.ts
    │  - getSortOrder(rowId): number
    │
    ▼
{ componentId, type: "table", rows: [...] }
```

**Сервисы:**
- [`builder.ts`](/backend/src/services/queryBuilder/builder.ts#L457) - SQL Builder
- [`queryLoader.ts`](/backend/src/services/queryBuilder/queryLoader.ts) - Загрузка конфигов
- [`validator.ts`](/backend/src/services/queryBuilder/validator.ts) - Валидация параметров
- [`rowNameMapper.ts`](/backend/src/services/mart/base/rowNameMapper.ts) - Маппинг row_code → sortOrder

---

## Используемые сервисы

### SQL Builder
- **Файл:** `backend/src/services/queryBuilder/builder.ts`
- **Функция:** `buildQueryFromId(queryId, paramsJson): Promise<string>`
- **Описание:** Строит SQL запрос из конфига в БД (`config.component_queries`)

### Query Loader
- **Файл:** `backend/src/services/queryBuilder/queryLoader.ts`
- **Функция:** `loadQueryConfig(queryId): Promise<QueryConfig>`
- **Описание:** Загружает конфиг запроса из БД

### Validator
- **Файл:** `backend/src/services/queryBuilder/validator.ts`
- **Функция:** `validateParams(params, config): void`
- **Описание:** Валидирует параметры (missing/excess)

### Database Views
- **VIEW:** `mart.v_p_dates`
- **Описание:** Получает даты периодов из `mart.v_kpi_all` (distinct `period_date`) с флагами `isP1`, `isP2`, `isP3`

### Calculation Service
- **Файл:** `backend/src/services/mart/base/calculationService.ts`
- **Функция:** `calculateChange(current, previous): number`
- **Описание:** Рассчитывает процентное изменение

### Row Name Mapper
- **Файл:** `backend/src/services/mart/base/rowNameMapper.ts`
- **Функция:** `getSortOrder(rowId): number`
- **Описание:** Вычисляет порядок сортировки для строк таблицы

### Database Pool
- **Файл:** `backend/src/config/database.ts`
- **Переменная:** `pool: pg.Pool`
- **Описание:** Connection pool для выполнения SQL запросов

---

## Локальные функции в dataRoutes.ts

### `transformTableData(rows: any[]): any[]`
- Добавляет `id` если отсутствует (формируется из `class-section-item-sub_item`)
- Добавляет `sortOrder` если отсутствует (через `rowNameMapper.getSortOrder()`)
- Преобразует строки в числа для `value`, `previousValue`, `ytdValue`

### `transformKPIData(rows: any[], periodDate: string): any[]`
- Рассчитывает `ppChange`, `ytdChange` (в долях)
- Рассчитывает `ppChangeAbsolute`, `ytdChangeAbsolute`
- Форматирует данные в формат `KPIMetric[]`

---

## См. также

- [Get Data API](/api/get-data) - полная документация endpoint'а
- [SQL Builder](/reference/sql-builder) - описание SQL Builder
- [Backend Architecture](/architecture/backend/) - архитектура backend сервисов
