---
title: Layout Architecture
description: Архитектура системы layout и компонентов дашборда
related:
  - /api/layout-api
  - /database/schemas
  - /architecture/overview
---

# Layout Architecture

Архитектура системы layout для динамического построения дашборда из конфигурации базы данных.

## Обзор

Layout система позволяет динамически строить структуру дашборда из конфигурации, хранящейся в базе данных. Компоненты получают данные через единый endpoint `/api/data` используя `data_source_key`.

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Layout     │──────│  Components │                    │
│  │   Service    │      │  (Dynamic)   │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                      │                             │
│         │ GET /api/layout      │ GET /api/data              │
│         │                      │ (query_id + params)         │
└─────────┼──────────────────────┼─────────────────────────────┘
          │                      │
          │                      │
┌─────────▼──────────────────────▼─────────────────────────────┐
│                    Backend (Express)                         │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ layoutService│      │  dataRoutes  │                    │
│  │              │      │  (getData)   │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                      │                             │
│         │                      │ SQL Builder                 │
│         │                      │ (buildQueryFromId)          │
└─────────┼──────────────────────┼─────────────────────────────┘
          │                      │
          │                      │
┌─────────▼──────────────────────▼─────────────────────────────┐
│                  Database (PostgreSQL)                       │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   config.*   │      │  mart.*      │                    │
│  │  (metadata)  │      │  (data)      │                    │
│  └──────────────┘      └──────────────┘                    │
│                                                              │
│  - config.layouts                                           │
│  - config.components (с data_source_key)                    │
│  - config.component_queries (query_id)                     │
│  - config.layout_component_mapping                         │
└─────────────────────────────────────────────────────────────┘
```

## Компоненты Layout

### Структура Layout

Layout состоит из:
- **Formats** - определения форматов для форматирования значений
- **Header** (опционально) - компонент header с датами периодов
- **Sections** - секции дашборда с компонентами

### Типы компонентов

1. **Header** (`type: 'header'`)
   - Компонент для отображения дат периодов
   - Имеет `dataSourceKey` для получения данных через `/api/data`

2. **Card** (`type: 'card'`)
   - Карточки с KPI метриками
   - Может иметь `dataSourceKey` для получения данных через `/api/data`
   - Или использует KPI API для получения данных

3. **Table** (`type: 'table'`)
   - Таблицы с данными
   - Может иметь `dataSourceKey` для получения данных через `/api/data`
   - Или использует Table Data API для получения данных

4. **Chart** (`type: 'chart'`)
   - Графики
   - Может иметь `dataSourceKey` для получения данных через `/api/data`

5. **Button** (`type: 'button'`)
   - Кнопки для группировки данных в таблицах
   - Привязаны к таблице через `parent_component_id` в `layout_component_mapping`
   - Имеют `dataSourceKey` для получения данных через `/api/data` с параметром `groupBy`
   - Заменяют устаревшее поле `groupableFields` в таблицах

## data_source_key

### Назначение

Поле `data_source_key` в `config.components` связывает компонент с запросом в `config.component_queries`. Это позволяет компонентам получать данные через единый endpoint `/api/data`.

### Как это работает

1. **В базе данных:**
   - Компонент в `config.components` имеет поле `data_source_key`
   - Значение `data_source_key` соответствует `query_id` в `config.component_queries`
   - SQL Builder использует `query_id` для построения SQL запроса

2. **В layoutService:**
   - `layoutService` читает `data_source_key` из `config.components`
   - Добавляет `dataSourceKey` в JSON ответ layout для всех компонентов, где он заполнен
   - `dataSourceKey` возвращается только если он заполнен в БД

3. **На фронтенде:**
   - Компонент получает `dataSourceKey` из layout
   - Если `dataSourceKey` присутствует, делается запрос к `/api/data` с `query_id = dataSourceKey`
   - Параметры запроса передаются через `params` в `/api/data`

### Примеры

**Header компонент:**
```json
{
  "id": "header",
  "type": "header",
  "title": "Header",
  "dataSourceKey": "header_dates"
}
```

**Table компонент:**
```json
{
  "id": "assets_table",
  "type": "table",
  "title": "Активы",
  "dataSourceKey": "assets_table",
  "columns": [...],
  "buttons": [
    {
      "id": "button_assets_table_cfo",
      "type": "button",
      "title": "ЦФО",
      "dataSourceKey": "assets_table",
      "settings": {
        "fieldId": "cfo",
        "groupBy": "cfo"
      }
    }
  ]
}
```

**Button компонент:**
```json
{
  "id": "button_assets_table_cfo",
  "type": "button",
  "title": "ЦФО",
  "label": "ЦФО",
  "dataSourceKey": "assets_table",
  "settings": {
    "fieldId": "cfo",
    "groupBy": "cfo"
  }
}
```

**Card компонент (без dataSourceKey):**
```json
{
  "id": "capital_card",
  "type": "card",
  "title": "Капитал",
  "icon": "Landmark"
  // Нет dataSourceKey - использует KPI API
}
```

## Возврат data_source_key в Layout

### Реализация в layoutService

`layoutService` возвращает `dataSourceKey` для всех типов компонентов, где он заполнен в БД:

```typescript
// Для card компонента
const card: any = {
  id: compositeId,
  componentId: mapping.componentId,
  type: "card",
  title: mapping.component.title ?? mapping.componentId,
  ...(mapping.component.dataSourceKey ? { dataSourceKey: mapping.component.dataSourceKey } : {}),
};

// Для table компонента
const table: any = {
  id: compositeId,
  componentId: mapping.componentId,
  type: "table",
  title: mapping.component.title ?? mapping.componentId,
  columns,
  ...(mapping.component.dataSourceKey ? { dataSourceKey: mapping.component.dataSourceKey } : {}),
};

// Для chart компонента
const chart: any = {
  id: compositeId,
  componentId: mapping.componentId,
  type: "chart",
  title: mapping.component.title ?? mapping.componentId,
  ...(mapping.component.dataSourceKey ? { dataSourceKey: mapping.component.dataSourceKey } : {}),
};

// Для header компонента
const header: any = {
  id: compositeId,
  componentId: mapping.componentId,
  type: "header",
  title: mapping.component.title ?? mapping.componentId,
  ...(mapping.component.dataSourceKey ? { dataSourceKey: mapping.component.dataSourceKey } : {}),
};

// Для table компонента - добавляем кнопки
const table: any = {
  id: compositeId,
  componentId: mapping.componentId,
  type: "table",
  title: mapping.component.title ?? mapping.componentId,
  columns,
  ...(mapping.component.dataSourceKey ? { dataSourceKey: mapping.component.dataSourceKey } : {}),
};

// Получаем дочерние компоненты таблицы (кнопки)
const tableButtonsResult = await pool.query(
  `SELECT ... FROM config.layout_component_mapping lcm
   INNER JOIN config.components c ON lcm.component_id = c.id
   WHERE lcm.layout_id = $1
     AND lcm.parent_component_id = $2
     AND c.component_type = 'button'`,
  [layoutId, mapping.componentId]
);

const buttons: any[] = [];
for (const buttonRow of tableButtonsResult.rows) {
  const button: any = {
    id: buttonCompositeId,
    componentId: buttonRow.componentId,
    type: "button",
    title: buttonRow["component.title"] ?? buttonRow.componentId,
    ...(buttonRow["component.dataSourceKey"] ? { dataSourceKey: buttonRow["component.dataSourceKey"] } : {}),
    ...(buttonRow["component.settings"] ? { settings: buttonRow["component.settings"] } : {}),
  };
  buttons.push(button);
}

if (buttons.length > 0) {
  table.buttons = buttons;
}
```

### Условия возврата

- `dataSourceKey` возвращается только если он заполнен в `config.components.data_source_key`
- Если `data_source_key` пустой или NULL, поле не включается в JSON ответ
- Это позволяет компонентам работать как с новым `/api/data` endpoint, так и со старыми API (KPI, Table Data)

## Поток данных

### 1. Получение Layout

```
Frontend → GET /api/layout → layoutService → Database
                                    ↓
                            config.layouts
                            config.components (с data_source_key)
                            config.layout_component_mapping
                                    ↓
                            JSON с dataSourceKey для компонентов
```

### 2. Получение данных компонента

```
Frontend → GET /api/data (query_id, params) → dataRoutes → SQL Builder
                                                                    ↓
                                                            config.component_queries
                                                                    ↓
                                                            SQL запрос → Database
                                                                    ↓
                                                            JSON данные
```

## Преимущества

1. **Единая точка данных:** Все компоненты с `dataSourceKey` используют `/api/data`
2. **Гибкость:** Компоненты могут использовать как новый `/api/data`, так и старые API
3. **Конфигурируемость:** Изменение `data_source_key` в БД не требует изменения кода
4. **Типобезопасность:** TypeScript интерфейсы для всех типов компонентов

## Кнопки как компоненты

### Замена groupableFields

Кнопки заменяют устаревшее поле `groupableFields` в таблицах. Вместо массива полей для группировки, каждая кнопка является отдельным компонентом.

### Структура кнопок

1. **В базе данных:**
   - Кнопки создаются в `config.components` с типом `button`
   - ID кнопки: `button_{table_id}_{field_id}` (например, `button_assets_table_cfo`)
   - `data_source_key` содержит `query_id` таблицы (например, `assets_table`)
   - `settings` содержит `fieldId` и `groupBy` для группировки

2. **Привязка к таблице:**
   - Кнопки привязаны к таблице через `parent_component_id` в `layout_component_mapping`
   - Таблица является родителем кнопки
   - Кнопки возвращаются в массиве `buttons` внутри компонента таблицы

3. **Использование:**
   - При клике на кнопку делается запрос к `/api/data` с `query_id = dataSourceKey` и параметром `groupBy` из `settings`
   - Данные таблицы перегружаются с новой группировкой

### Пример структуры

**Таблица с кнопками:**
```json
{
  "id": "assets_table",
  "type": "table",
  "title": "Активы",
  "dataSourceKey": "assets_table",
  "columns": [...],
  "buttons": [
    {
      "id": "button_assets_table_cfo",
      "type": "button",
      "title": "ЦФО",
      "dataSourceKey": "assets_table",
      "settings": {
        "fieldId": "cfo",
        "groupBy": "cfo"
      }
    },
    {
      "id": "button_assets_table_client_segment",
      "type": "button",
      "title": "Сегмент клиента",
      "dataSourceKey": "assets_table",
      "settings": {
        "fieldId": "client_segment",
        "groupBy": "client_segment"
      }
    }
  ]
}
```

## Миграция

Компоненты постепенно мигрируют на использование `dataSourceKey`:

- ✅ **Header** - использует `dataSourceKey: 'header_dates'`
- ✅ **Table (assets_table)** - использует `dataSourceKey: 'assets_table'`
- ✅ **Button** - использует `dataSourceKey` таблицы с параметром `groupBy`
- ⏳ **Card** - пока использует KPI API, миграция планируется
- ⏳ **Table (другие)** - пока используют Table Data API, миграция планируется

### Удаление groupableFields

- ❌ **groupableFields** - удалено из layout JSON
- ✅ **Buttons** - заменяют groupableFields для группировки данных

## См. также

- [Layout API](/api/layout-api) - детальное описание API endpoint
- [Get Data API](/api/get-data) - описание `/api/data` endpoint
- [Component Queries](/reference/component-queries) - описание конфигов запросов
- [Database Schemas](/database/schemas) - структура таблиц config схемы
