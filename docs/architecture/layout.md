---
title: Layout Architecture
description: Архитектура системы layout и компонентов дашборда
related:
  - /api/get-data
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
│         │ GET /api/data?query_id=layout              │
│         │                      │ (query_id + params)         │
└─────────┼──────────────────────┼─────────────────────────────┘
          │                      │
          │                      │
┌─────────▼──────────────────────▼─────────────────────────────┐
│                    Backend (Express)                         │
│                                                              │
│  ┌──────────────┐                                             │
│  │  dataRoutes  │                                             │
│  │  (getData)   │                                             │
│  └──────┬───────┘                                             │
│         │                                                     │
│         │ SQL Builder                                         │
│         │ (buildQueryFromId)                                  │
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
- **Header** (опционально) - компонент header с датами периодов, возвращается как отдельное top-level поле `layout.header` (не в секциях)
- **Sections** - секции дашборда с компонентами

**Важно:** Header является отдельным top-level элементом в layout, рендерится над секциями и не является частью секций или контейнеров.

### Пример ответа Layout

```json
{
  "formats": {
    "currency_rub": {
      "kind": "currency",
      "prefixUnitSymbol": "₽",
      "shorten": true,
      "minimumFractionDigits": 1,
      "maximumFractionDigits": 1
    },
    "percent": {
      "kind": "percent",
      "suffixUnitSymbol": "%",
      "minimumFractionDigits": 1,
      "maximumFractionDigits": 2
    }
  },
  "header": {
    "id": "main::header",
    "componentId": "header",
    "type": "header",
    "title": "Header",
    "queryId": "header_dates"
  },
  "sections": [
    {
      "id": "balance",
      "title": "Баланс",
      "components": [
        {
          "id": "main::balance::capital_card",
          "componentId": "capital_card",
          "type": "card",
          "title": "Капитал",
          "icon": "Landmark",
          "dataSourceKey": "capital",
          "format": {
            "value": "currency_rub",
            "PPTD": "percent",
            "YTD": "percent"
          }
        },
        {
          "id": "main::balance::assets_table",
          "componentId": "assets_table",
          "type": "table",
          "title": "Активы",
          "queryId": "assets_table",
          "columns": [
            {
              "id": "class",
              "label": "Класс",
              "type": "text"
            },
            {
              "id": "value",
              "label": "Значение",
              "type": "number",
              "format": {
                "value": "currency_rub"
              }
            }
          ],
          "buttons": [
            {
              "id": "main::balance::assets_table::button_assets_table_cfo",
              "componentId": "button_assets_table_cfo",
              "type": "button",
              "title": "ЦФО",
              "queryId": "assets_table",
              "settings": {
                "fieldId": "cfo",
                "groupBy": "cfo"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

**Особенности структуры:**
- `header` - отдельное top-level поле (не в `sections`)
- `header.id` - составной ID: `{layoutId}::{componentId}`
- `header.queryId` - ссылка на `query_id` в `config.component_queries` (для получения данных)
- `sections` - массив секций с компонентами
- Header рендерится над всеми секциями на frontend

**Поля для получения данных:**
- `queryId` - для table, button, header (ID запроса в `config.component_queries`)
- `dataSourceKey` - для card (ключ KPI, `tech_kpi_name`)

### Типы компонентов

1. **Header** (`type: 'header'`)
   - Компонент для отображения дат периодов
   - Имеет `queryId` для получения данных через `/api/data`

2. **Card** (`type: 'card'`)
   - Карточки с KPI метриками
   - Имеет `dataSourceKey` — ключ для сопоставления с KPI данными (`tech_kpi_name`)
   - KPI данные загружаются через `getData(query_id='kpis')` и сопоставляются по `componentId`

3. **Table** (`type: 'table'`)
   - Таблицы с данными
   - Имеет `queryId` для получения данных через `/api/data`

4. **Chart** (`type: 'chart'`)
   - Графики
   - Может иметь `queryId` для получения данных через `/api/data`

5. **Button** (`type: 'button'`)
   - Кнопки для группировки данных в таблицах
   - Привязаны к таблице через `parent_component_id` в `layout_component_mapping`
   - Имеют `queryId` для получения данных через `/api/data` с параметром `groupBy`
   - Заменяют устаревшее поле `groupableFields` в таблицах

## queryId vs dataSourceKey

В системе используются два разных поля для связи компонентов с данными:

| Поле | Назначение | Используется для |
|------|------------|------------------|
| `queryId` | ID запроса для `/api/data` | table, button, header |
| `dataSourceKey` | Ключ для KPI mapping (`tech_kpi_name`) | card (KPI карточки) |

### queryId

Поле `queryId` определяет, какой запрос использовать для получения данных компонента через `/api/data`.

**Как это работает:**

1. **В базе данных:**
   - Компонент в `config.components` имеет поле `query_id`
   - Значение `query_id` соответствует `query_id` в `config.component_queries`
   - SQL Builder использует `query_id` для построения SQL запроса

2. **В Layout JSON:**
   - View `config.layout_sections_json_view` возвращает `queryId` из `config.components.query_id`
   - `queryId` включается в JSON для компонентов типа `table`, `button`, `header`

3. **На фронтенде:**
   - Компонент получает `queryId` из layout
   - Делается запрос к `/api/data?query_id={queryId}&component_Id={componentId}&parametrs={...}`

**Пример:**
```json
{
  "id": "main::balance::assets_table",
  "componentId": "assets_table",
  "type": "table",
  "title": "Активы",
  "queryId": "assets_table"
}
```

### dataSourceKey

Поле `dataSourceKey` используется для сопоставления KPI карточек с данными из `mart.v_kpi_all`.

**Как это работает:**

1. **В базе данных:**
   - KPI карточка в `config.components` имеет `data_source_key = tech_kpi_name`
   - View `mart.v_kpi_all` возвращает `component_id` через JOIN по `data_source_key = kpi_name`

2. **В Layout JSON:**
   - View `config.layout_sections_json_view` возвращает `dataSourceKey` для карточек
   - Используется как ключ для сопоставления данных KPI с компонентом

3. **На фронтенде:**
   - KPI данные загружаются через `getData(query_id='kpis')`
   - Каждая метрика имеет `componentId`, который соответствует ID карточки в layout
   - Сопоставление KPI с карточкой происходит по `componentId`

**Пример:**
```json
{
  "id": "main::balance::capital_card",
  "componentId": "capital_card",
  "type": "card",
  "title": "Капитал",
  "dataSourceKey": "capital"
}
```

### Deprecated: dataSourceKey для query

⚠️ **Deprecated:** Ранее `dataSourceKey` использовался как `query_id` для таблиц и header. Это поведение удалено. Используйте `queryId` для получения данных.

## data_source_key (для KPI)

### Назначение

Поле `data_source_key` в `config.components` связывает KPI карточку с техническим именем KPI (`tech_kpi_name`) в `mart.v_kpi_all`. Это позволяет сопоставлять данные KPI с компонентами по `componentId`.

### Как это работает

1. **В базе данных:**
   - KPI карточка в `config.components` имеет `data_source_key = tech_kpi_name`
   - View `mart.v_kpi_all` делает JOIN с `config.components` по `data_source_key = kpi_name`
   - Запрос `kpis` возвращает `componentId` для каждой метрики

2. **В SQL Builder (через `/api/data?query_id=kpis`):**
   - SQL Builder загружает конфиг из `config.component_queries` где `query_id='kpis'`
   - Результат содержит `componentId` для сопоставления с карточками

3. **На фронтенде:**
   - KPI данные загружаются через `fetchAllKPIs()`
   - Сопоставление происходит по `componentId` из данных
   - `dataSourceKey` используется только для backward compatibility в layout JSON

### Примеры

**Header компонент (top-level элемент):**
```json
{
  "id": "main::header",
  "componentId": "header",
  "type": "header",
  "title": "Header",
  "queryId": "header_dates"
}
```

**Важно:** Header возвращается как отдельное поле `layout.header`, а не внутри секций. Это позволяет рендерить header над всеми секциями дашборда.

## Выбор дат периодов

### DatePicker компонент

Компонент `DatePicker` позволяет пользователю выбрать до 3 дат из списка доступных периодов для сравнения данных.

**Как это работает:**

1. **Получение доступных дат:**
   - Frontend запрашивает `/api/data?query_id=header_dates&component_Id=header`
   - API возвращает список дат из `mart.v_p_dates` с флагами `isP1`, `isP2`, `isP3`
   - Даты отсортированы по убыванию (от новых к старым)

2. **Выбор дат:**
   - Пользователь открывает DatePicker и видит список доступных дат
   - Можно выбрать до 3 дат кликом (повторный клик снимает выбор)
   - По умолчанию выбраны даты с флагами `isP1`, `isP2`, `isP3` из ответа API

3. **Назначение p1/p2/p3:**
   - После нажатия кнопки "Применить" выбранные даты сортируются по убыванию
   - `p1` = самая новая выбранная дата
   - `p2` = вторая по новизне (если выбрана)
   - `p3` = самая старая выбранная дата (если выбрана)

4. **Применение выбора:**
   - После нажатия "Применить" обновляются параметры запросов для таблиц и KPI карточек
   - Все компоненты перезагружают данные с новыми параметрами `p1`, `p2`, `p3`

**Пример использования:**

```typescript
// Получение доступных дат
const headerData = await getData('header_dates', 'header');
const availableDates = headerData.rows; // PeriodDate[]

// Инициализация с дефолтными значениями
const defaultP1 = availableDates.find(d => d.isP1)?.periodDate;
const defaultP2 = availableDates.find(d => d.isP2)?.periodDate;
const defaultP3 = availableDates.find(d => d.isP3)?.periodDate;

// Применение выбранных дат
const handleApplyDates = (dates: { p1: string; p2: string | null; p3: string | null }) => {
  // Обновление параметров запросов
  setTableParams({ p1: dates.p1, p2: dates.p2, p3: dates.p3 });
  setKpiParams({ periodDate: dates.p1 });
  // Перезагрузка данных
  refetchTables();
  refetchKPIs();
};
```

**Компонент:** `src/components/DatePicker.tsx`

**Table компонент:**
```json
{
  "id": "assets_table",
  "type": "table",
  "title": "Активы",
  "queryId": "assets_table",
  "columns": [...],
  "buttons": [
    {
      "id": "button_assets_table_cfo",
      "type": "button",
      "title": "ЦФО",
      "queryId": "assets_table",
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
  "queryId": "assets_table",
  "settings": {
    "fieldId": "cfo",
    "groupBy": "cfo"
  }
}
```

**Card компонент (с dataSourceKey):**
```json
{
  "id": "capital_card",
  "type": "card",
  "title": "Капитал",
  "icon": "Landmark",
  "dataSourceKey": "capital"
}
```

**Примечание:** Для card компонентов `dataSourceKey` = `tech_kpi_name`. KPI данные загружаются через `getData(query_id='kpis')` и сопоставляются по `componentId`.

## Возврат data_source_key в Layout

### Реализация через SQL Builder

Layout получается через `/api/data?query_id=layout`. SQL Builder использует view `config.layout_sections_json_view`, который автоматически включает `data_source_key` из `config.components` в JSON структуру. `dataSourceKey` возвращается только если он заполнен в БД. Header обрабатывается отдельно как top-level элемент.

**Компоненты в секциях:**
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

// Header НЕ обрабатывается в секциях - он пропускается
if (type === "header") {
  // Header не должен быть в секциях - он обрабатывается отдельно как top-level компонент
  continue;
}

// Для table компонента - добавляем кнопки
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

**Header как top-level элемент:**
```typescript
// Header обрабатывается отдельно после секций
const headerResult = await pool.query(
  `SELECT 
    lcm.id, lcm.layout_id as "layoutId", lcm.component_id as "componentId",
    c.id as "component.id", c.component_type as "component.componentType",
    c.title as "component.title",
    c.data_source_key as "component.dataSourceKey"
  FROM config.layout_component_mapping lcm
  INNER JOIN config.components c ON lcm.component_id = c.id
  WHERE lcm.layout_id = $1
    AND lcm.parent_component_id IS NULL
    AND lcm.deleted_at IS NULL
    AND c.component_type = 'header'
  ORDER BY lcm.display_order ASC, lcm.id ASC
  LIMIT 1`,
  [layoutId]
);

let header: any = null;
if (headerResult.rows.length > 0) {
  const row = headerResult.rows[0];
  const componentId = row.componentId;
  const compositeId = `${layoutId}::${componentId}`;

  header = {
    id: compositeId,
    componentId: componentId,
    type: "header",
    title: row["component.title"] ?? componentId,
    ...(row["component.dataSourceKey"] ? { dataSourceKey: row["component.dataSourceKey"] } : {}),
  };
}

// Возвращаем layout с header отдельным полем
const result: any = { formats, sections };
if (header) {
  result.header = header;
}
```

### Условия возврата

- `dataSourceKey` возвращается только если он заполнен в `config.components.data_source_key`
- Если `data_source_key` пустой или NULL, поле не включается в JSON ответ
- Это позволяет компонентам работать как с новым `/api/data` endpoint, так и со старыми API (KPI, Table Data)

## Поток данных

### 1. Получение Layout

```
Frontend → GET /api/data?query_id=layout → SQL Builder → Database
                                                      ↓
                                              config.component_queries
                                              config.layout_sections_json_view
                                                      ↓
                                              JSON структура:
                                              { sections: [...] }
                                                      ↓
                                              - formats в секции id="formats"
                                              - header в секции id="header"
                                              - контентные секции
```

**Особенности:**
- Layout получается через единый endpoint `/api/data` с `query_id=layout`
- Используется SQL Builder для построения запроса
- Header находится внутри секции `id="header"` как компонент
- Formats находятся внутри секции `id="formats"`
- Header рендерится над всеми секциями на frontend

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

## Текущее состояние

Все компоненты используют разделение `queryId` и `dataSourceKey`:

- ✅ **Header** - использует `queryId: 'header_dates'` для получения данных
- ✅ **Table** - использует `queryId` для получения данных (например, `queryId: 'assets_table'`)
- ✅ **Button** - использует `queryId` таблицы с параметром `groupBy`
- ✅ **Card** - использует `dataSourceKey` как `tech_kpi_name`, данные загружаются через `getData(query_id='kpis')` и сопоставляются по `componentId`

### Удаление groupableFields

- ❌ **groupableFields** - удалено из layout JSON
- ✅ **Buttons** - заменяют groupableFields для группировки данных

## См. также

- [Get Data API](/api/get-data) - получение layout через `/api/data?query_id=layout`
- [Get Data API](/api/get-data) - описание `/api/data` endpoint
- [Component Queries](/reference/component-queries) - описание конфигов запросов
- [Database Schemas](/database/schemas) - структура таблиц config схемы
