---
title: Добавление нового источника данных
description: Пошаговая инструкция по добавлению нового источника данных от БД до фронтенда
related:
  - /reference/sql-builder
  - /database/schemas
  - /architecture/data-flow
  - /api/get-data
---

# Добавление нового источника данных

Пошаговая инструкция по добавлению нового источника данных в систему, от базы данных до отображения на фронтенде.

## Обзор процесса

Добавление нового источника данных включает следующие этапы:

```
1. Подготовка данных в БД (STG → ODS → MART)
   ↓
2. Создание конфига SQL Builder (config.component_queries)
   ↓
3. Создание компонента UI (config.components)
   ↓
4. Создание полей компонента (config.component_fields) - для таблиц
   ↓
5. Привязка компонента к layout (config.layout_component_mapping)
   ↓
6. Проверка отображения на фронтенде
```

## Схема связей

```
┌─────────────────────────────────────────────────────────────────┐
│                    База данных                                  │
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐              │
│  │  mart.*          │      │  config.*         │              │
│  │  (данные)        │      │  (метаданные)     │              │
│  └────────┬─────────┘      └────────┬─────────┘              │
│           │                         │                         │
│           │ table_component_id      │                         │
│           └─────────────┬───────────┘                         │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              config.components                                  │
│                                                                 │
│  id = 'income_by_product_table'                                │
│  data_source_key = 'income_by_product_table' ───────────────┐ │
│                                                               │ │
└───────────────────────────────────────────────────────────────┘ │
                                                                   │
                                                                   │
┌─────────────────────────────────────────────────────────────────┐
│         config.component_queries                                │
│                                                                 │
│  query_id = 'income_by_product_table' ◄────────────────────────┘
│  config_json = { from: {...}, select: [...], ... }              │
│  wrap_json = TRUE                                               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ SQL Builder использует конфиг
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              /api/data endpoint                                 │
│                                                                 │
│  GET /api/data?query_id=income_by_product_table                │
│      &component_Id=income_by_product_table                      │
│      &parametrs={...}                                          │
│                                                                 │
│  → SQL Builder строит SQL из конфига                            │
│  → Выполняет запрос к mart.income_by_product                   │
│  → Возвращает данные в формате { componentId, type, rows }     │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Frontend запрашивает данные
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend (React)                                   │
│                                                                 │
│  1. Layout загружается через /api/data?query_id=layout          │
│  2. Компонент получает dataSourceKey из layout                 │
│  3. Компонент запрашивает данные через                         │
│     /api/data?query_id={dataSourceKey}                         │
│  4. Данные отображаются в UI                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Ключевые связи:**
- `mart.*.table_component_id` → `config.components.id`
- `config.components.data_source_key` → `config.component_queries.query_id`
- `config.components.id` → `config.component_fields.component_id`
- `config.components.id` → `config.layout_component_mapping.component_id`
- `config.component_fields.format_id` → `config.formats.id`

## Пример: Добавление таблицы "Доходы по продуктам"

Рассмотрим полный пример добавления новой таблицы "Доходы по продуктам" (`income_by_product`).

### Шаг 1: Подготовка данных в БД

#### 1.1. Создание таблицы в MART (если данных еще нет)

Создайте миграцию для таблицы в схеме `mart`:

```sql
-- Миграция: Создание таблицы mart.income_by_product
CREATE TABLE IF NOT EXISTS mart.income_by_product (
  id SERIAL PRIMARY KEY,
  table_component_id VARCHAR(200) NOT NULL,
  row_code VARCHAR(100) NOT NULL,
  period_date DATE NOT NULL,
  product_code VARCHAR(100),
  product_name VARCHAR(200),
  value NUMERIC(20, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Индексы
CREATE INDEX idx_income_by_product_component ON mart.income_by_product(table_component_id);
CREATE INDEX idx_income_by_product_date ON mart.income_by_product(period_date DESC);
CREATE INDEX idx_income_by_product_product ON mart.income_by_product(product_code, period_date);

COMMENT ON TABLE mart.income_by_product IS 'Доходы по продуктам для отображения в таблице';
COMMENT ON COLUMN mart.income_by_product.table_component_id IS 'Ссылка на config.components.id (component_type=table)';
COMMENT ON COLUMN mart.income_by_product.row_code IS 'Код строки для маппинга названий';
COMMENT ON COLUMN mart.income_by_product.period_date IS 'Дата периода';
COMMENT ON COLUMN mart.income_by_product.product_code IS 'Код продукта';
COMMENT ON COLUMN mart.income_by_product.value IS 'Значение дохода';
```

#### 1.2. Загрузка данных

Загрузите данные в таблицу `mart.income_by_product`:

```sql
INSERT INTO mart.income_by_product 
  (table_component_id, row_code, period_date, product_code, product_name, value)
VALUES
  ('income_by_product_table', 'p1', '2025-12-31', 'LOAN', 'Кредиты', 1000000),
  ('income_by_product_table', 'p2', '2025-12-31', 'DEPOSIT', 'Депозиты', 500000),
  ('income_by_product_table', 'p3', '2025-12-31', 'CARD', 'Карты', 200000);
```

**Важно:** `table_component_id` должен совпадать с `id` компонента, который будет создан на шаге 3.

### Шаг 2: Создание конфига SQL Builder

Создайте конфиг в таблице `config.component_queries`:

```sql
INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'income_by_product_table',
  'Доходы по продуктам',
  '{
    "from": {
      "schema": "mart",
      "table": "income_by_product"
    },
    "select": [
      { "type": "column", "field": "product_code" },
      { "type": "column", "field": "product_name" },
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
        { "field": "table_component_id", "op": "=", "value": ":component_id" },
        { "field": "period_date", "op": "in", "value": [":p1", ":p2"] }
      ]
    },
    "groupBy": ["product_code", "product_name"],
    "orderBy": [
      { "field": "product_code", "direction": "asc" }
    ],
    "params": {
      "component_id": "income_by_product_table",
      "p1": "2025-12-31",
      "p2": "2025-11-30"
    },
    "paramTypes": {
      "component_id": "string",
      "p1": "date",
      "p2": "date"
    }
  }'::jsonb,
  TRUE,  -- wrap_json = true (обязательно для /api/data)
  TRUE   -- is_active = true
) ON CONFLICT (query_id) DO UPDATE SET
  config_json = EXCLUDED.config_json,
  wrap_json = EXCLUDED.wrap_json,
  updated_at = CURRENT_TIMESTAMP;
```

**Ключевые моменты:**
- `query_id` должен быть уникальным (например, `income_by_product_table`)
- `wrap_json` должен быть `TRUE` для использования через `/api/data`
- В `params` укажите примеры значений параметров
- В `paramTypes` укажите типы параметров для корректного форматирования

**Проверка конфига:**
```sql
SELECT query_id, title, wrap_json, is_active 
FROM config.component_queries 
WHERE query_id = 'income_by_product_table';
```

### Шаг 3: Создание компонента UI

Создайте компонент в таблице `config.components`:

```sql
INSERT INTO config.components (
  id,
  component_type,
  title,
  label,
  tooltip,
  icon,
  data_source_key,
  category,
  is_active,
  created_by
)
VALUES (
  'income_by_product_table',
  'table',
  'Доходы по продуктам',
  'Доходы по продуктам',
  'Детализация доходов по продуктам банка',
  NULL,
  'income_by_product_table',  -- Связь с query_id из component_queries
  'income',
  TRUE,
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  data_source_key = EXCLUDED.data_source_key,
  updated_at = CURRENT_TIMESTAMP;
```

**Ключевые моменты:**
- `id` должен совпадать с `table_component_id` в данных MART
- `component_type` = `'table'` для таблиц, `'card'` для карточек, `'header'` для header
- `data_source_key` должен совпадать с `query_id` из `config.component_queries`
- `category` используется для группировки компонентов

**Проверка компонента:**
```sql
SELECT id, component_type, title, data_source_key, is_active 
FROM config.components 
WHERE id = 'income_by_product_table';
```

### Шаг 4: Создание полей компонента (для таблиц)

Для таблиц необходимо создать поля (колонки) в `config.component_fields`:

```sql
INSERT INTO config.component_fields (
  component_id,
  field_id,
  label,
  field_type,
  format_id,
  is_dimension,
  is_measure,
  display_order,
  is_active,
  created_by
)
VALUES
  -- Колонка "Код продукта" (dimension)
  (
    'income_by_product_table',
    'product_code',
    'Код продукта',
    'text',
    NULL,
    TRUE,   -- is_dimension
    FALSE,  -- is_measure
    1,
    TRUE,
    'admin'
  ),
  -- Колонка "Название продукта" (dimension)
  (
    'income_by_product_table',
    'product_name',
    'Название продукта',
    'text',
    NULL,
    TRUE,
    FALSE,
    2,
    TRUE,
    'admin'
  ),
  -- Колонка "Значение" (measure)
  (
    'income_by_product_table',
    'value',
    'Доход',
    'number',
    'currency_rub',  -- Формат валюты
    FALSE,
    TRUE,
    3,
    TRUE,
    'admin'
  ),
  -- Колонка "Предыдущий период" (measure)
  (
    'income_by_product_table',
    'ppValue',
    'Пред. период',
    'number',
    'currency_rub',
    FALSE,
    TRUE,
    4,
    TRUE,
    'admin'
  )
ON CONFLICT (component_id, field_id) DO UPDATE SET
  label = EXCLUDED.label,
  format_id = EXCLUDED.format_id,
  display_order = EXCLUDED.display_order,
  updated_at = CURRENT_TIMESTAMP;
```

**Ключевые моменты:**
- `field_id` должен совпадать с полями из SELECT в конфиге SQL Builder
- `is_dimension` = `TRUE` для текстовых полей (группировка, фильтрация)
- `is_measure` = `TRUE` для числовых полей (суммирование, форматирование)
- `format_id` ссылается на `config.formats.id` для форматирования значений

**Проверка полей:**
```sql
SELECT field_id, label, field_type, format_id, is_dimension, is_measure 
FROM config.component_fields 
WHERE component_id = 'income_by_product_table' 
  AND is_active = TRUE 
ORDER BY display_order;
```

### Шаг 5: Привязка компонента к layout

Привяжите компонент к layout через `config.layout_component_mapping`:

```sql
-- Найти ID секции (контейнера) в layout
SELECT component_id 
FROM config.layout_component_mapping 
WHERE layout_id = 'main_dashboard' 
  AND parent_component_id IS NULL 
  AND component_id IN (
    SELECT id FROM config.components WHERE component_type = 'container'
  )
LIMIT 1;

-- Предположим, что секция имеет id = 'section_income'
-- Привязываем компонент к секции
INSERT INTO config.layout_component_mapping (
  layout_id,
  component_id,
  parent_component_id,
  display_order,
  is_visible,
  created_by
)
VALUES (
  'main_dashboard',
  'income_by_product_table',
  'section_income',  -- ID секции (контейнера)
  1,                 -- Порядок отображения
  TRUE,
  'admin'
) ON CONFLICT (layout_id, component_id) DO UPDATE SET
  parent_component_id = EXCLUDED.parent_component_id,
  display_order = EXCLUDED.display_order,
  is_visible = EXCLUDED.is_visible,
  updated_at = CURRENT_TIMESTAMP;
```

**Ключевые моменты:**
- `layout_id` - ID layout (например, `'main_dashboard'`)
- `component_id` - ID компонента, который создали на шаге 3
- `parent_component_id` - ID секции (контейнера), в которую добавляется компонент
- `display_order` - порядок отображения компонента в секции

**Проверка привязки:**
```sql
SELECT 
  lcm.layout_id,
  lcm.component_id,
  c.title AS component_title,
  lcm.parent_component_id,
  lcm.display_order,
  lcm.is_visible
FROM config.layout_component_mapping lcm
JOIN config.components c ON lcm.component_id = c.id
WHERE lcm.component_id = 'income_by_product_table'
  AND lcm.deleted_at IS NULL;
```

### Шаг 6: Проверка отображения на фронтенде

#### 6.1. Проверка layout

Запросите layout и убедитесь, что компонент присутствует:

```bash
curl "http://localhost:3001/api/data?query_id=layout&component_Id=layout&parametrs=%7B%22layout_id%22%3A%22main_dashboard%22%7D" | jq '.sections[] | select(.id == "section_income") | .components[] | select(.componentId == "income_by_product_table")'
```

**Ожидаемый результат:**
```json
{
  "id": "main_dashboard::section_income::income_by_product_table",
  "componentId": "income_by_product_table",
  "type": "table",
  "title": "Доходы по продуктам",
  "dataSourceKey": "income_by_product_table",
  "columns": [
    {
      "id": "product_code",
      "label": "Код продукта",
      "type": "text",
      "isDimension": true
    },
    {
      "id": "product_name",
      "label": "Название продукта",
      "type": "text",
      "isDimension": true
    },
    {
      "id": "value",
      "label": "Доход",
      "type": "number",
      "isMeasure": true,
      "format": {
        "value": "currency_rub"
      }
    }
  ]
}
```

#### 6.2. Проверка данных

Запросите данные компонента:

```bash
curl "http://localhost:3001/api/data?query_id=income_by_product_table&component_Id=income_by_product_table&parametrs=%7B%22component_id%22%3A%22income_by_product_table%22%2C%22p1%22%3A%222025-12-31%22%2C%22p2%22%3A%222025-11-30%22%7D" | jq '.'
```

**Ожидаемый результат:**
```json
{
  "componentId": "income_by_product_table",
  "type": "table",
  "rows": [
    {
      "product_code": "LOAN",
      "product_name": "Кредиты",
      "value": 1000000,
      "ppValue": 950000
    },
    {
      "product_code": "DEPOSIT",
      "product_name": "Депозиты",
      "value": 500000,
      "ppValue": 480000
    }
  ]
}
```

#### 6.3. Проверка на фронтенде

Откройте дашборд в браузере и убедитесь, что:
- Компонент отображается в нужной секции
- Данные загружаются корректно
- Форматирование применяется правильно
- Таблица отображается с правильными колонками

## Пример: Добавление карточки (KPI)

Для добавления карточки процесс упрощается:

### Шаг 1: Данные в MART

Данные для карточек хранятся в `mart.kpi_metrics`:

```sql
INSERT INTO mart.kpi_metrics (component_id, period_date, value)
VALUES
  ('roa_card', '2025-12-31', 0.025),
  ('roa_card', '2025-11-30', 0.024),
  ('roa_card', '2024-12-31', 0.022);
```

### Шаг 2: Конфиг SQL Builder

Используйте существующий конфиг `kpis` или создайте новый:

```sql
-- Используется существующий конфиг 'kpis' через view mart.kpis_view
-- Конфиг уже создан в миграции 025_create_kpis_view.sql
```

### Шаг 3: Создание компонента

```sql
INSERT INTO config.components (
  id,
  component_type,
  title,
  label,
  tooltip,
  icon,
  data_source_key,
  category,
  is_active,
  created_by
)
VALUES (
  'roa_card',
  'card',
  'ROA',
  'ROA',
  'Рентабельность активов',
  'TrendingUp',
  'kpis',  -- Используется общий конфиг для всех KPI
  'finance',
  TRUE,
  'admin'
);
```

### Шаг 4: Поля компонента (для карточек)

Для карточек поля создаются с `parent_field_id` для формирования формата:

```sql
INSERT INTO config.component_fields (
  component_id,
  field_id,
  label,
  field_type,
  format_id,
  parent_field_id,
  display_order,
  is_active,
  created_by
)
VALUES
  -- Основное поле value
  (
    'roa_card',
    'value',
    'Значение',
    'number',
    'percent',  -- Формат процента
    NULL,
    1,
    TRUE,
    'admin'
  ),
  -- Поле для изменения относительно предыдущего периода
  (
    'roa_card',
    'PPTD',
    'Изменение к пред. периоду',
    'number',
    'percent',
    'value',  -- parent_field_id указывает на основное поле
    2,
    TRUE,
    'admin'
  ),
  -- Поле для изменения YTD
  (
    'roa_card',
    'YTD',
    'Изменение YTD',
    'number',
    'percent',
    'value',
    3,
    TRUE,
    'admin'
  );
```

**Важно:** Для карточек формат формируется из полей с `parent_field_id`:
```json
{
  "format": {
    "value": "percent",
    "PPTD": "percent",
    "YTD": "percent"
  }
}
```

### Шаг 5: Привязка к layout

Аналогично шагу 5 для таблиц.

## Чеклист добавления нового источника данных

- [ ] **Данные в БД:**
  - [ ] Таблица создана в схеме `mart` (или данные в существующей таблице)
  - [ ] Данные загружены в таблицу
  - [ ] Индексы созданы для оптимизации запросов

- [ ] **Конфиг SQL Builder:**
  - [ ] Конфиг создан в `config.component_queries`
  - [ ] `query_id` уникален и соответствует `data_source_key`
  - [ ] `wrap_json = TRUE` (обязательно для `/api/data`)
  - [ ] Конфиг протестирован (SQL запрос работает)

- [ ] **Компонент UI:**
  - [ ] Компонент создан в `config.components`
  - [ ] `id` совпадает с `table_component_id` в данных MART
  - [ ] `data_source_key` совпадает с `query_id` из `component_queries`
  - [ ] `component_type` правильный (`table`, `card`, `header`)

- [ ] **Поля компонента:**
  - [ ] Поля созданы в `config.component_fields`
  - [ ] `field_id` совпадает с полями из SELECT в конфиге
  - [ ] `is_dimension` / `is_measure` указаны правильно
  - [ ] `format_id` указан для числовых полей

- [ ] **Привязка к layout:**
  - [ ] Компонент привязан к layout через `layout_component_mapping`
  - [ ] `parent_component_id` указывает на секцию (контейнер)
  - [ ] `display_order` установлен правильно

- [ ] **Проверка:**
  - [ ] Layout возвращает компонент через `/api/data?query_id=layout`
  - [ ] Данные возвращаются через `/api/data?query_id={data_source_key}`
  - [ ] Компонент отображается на фронтенде
  - [ ] Данные загружаются и отображаются корректно
  - [ ] Форматирование применяется правильно

## Типичные проблемы и решения

### Проблема: Компонент не отображается в layout

**Причины:**
- Компонент не привязан к layout (`layout_component_mapping`)
- `is_active = FALSE` или `deleted_at IS NOT NULL`
- `is_visible = FALSE` в `layout_component_mapping`

**Решение:**
```sql
-- Проверить привязку
SELECT * FROM config.layout_component_mapping 
WHERE component_id = 'your_component_id';

-- Проверить активность
SELECT id, is_active, deleted_at FROM config.components 
WHERE id = 'your_component_id';
```

### Проблема: Данные не загружаются

**Причины:**
- `data_source_key` не совпадает с `query_id` в `component_queries`
- `wrap_json = FALSE` (должен быть `TRUE`)
- Конфиг SQL Builder невалиден
- Параметры не передаются или неверны

**Решение:**
```sql
-- Проверить связь
SELECT 
  c.id AS component_id,
  c.data_source_key,
  cq.query_id,
  cq.wrap_json,
  cq.is_active
FROM config.components c
LEFT JOIN config.component_queries cq ON c.data_source_key = cq.query_id
WHERE c.id = 'your_component_id';

-- Проверить конфиг
SELECT config_json FROM config.component_queries 
WHERE query_id = 'your_query_id';
```

### Проблема: Поля не отображаются в таблице

**Причины:**
- Поля не созданы в `config.component_fields`
- `is_active = FALSE` или `deleted_at IS NOT NULL`
- `field_id` не совпадает с полями из SELECT

**Решение:**
```sql
-- Проверить поля
SELECT field_id, label, is_active, deleted_at 
FROM config.component_fields 
WHERE component_id = 'your_component_id';

-- Сравнить с полями из конфига
SELECT config_json->'select' FROM config.component_queries 
WHERE query_id = 'your_query_id';
```

### Проблема: Форматирование не применяется

**Причины:**
- `format_id` не указан в `component_fields`
- Формат не существует в `config.formats`
- Формат неактивен (`is_active = FALSE`)

**Решение:**
```sql
-- Проверить формат
SELECT 
  cf.field_id,
  cf.format_id,
  f.id AS format_exists,
  f.is_active AS format_active
FROM config.component_fields cf
LEFT JOIN config.formats f ON cf.format_id = f.id
WHERE cf.component_id = 'your_component_id';
```

## См. также

- [SQL Builder](/reference/sql-builder) - документация по созданию конфигов SQL Builder
- [Схемы БД](/database/schemas) - описание структуры таблиц
- [Поток данных](/architecture/data-flow) - как данные проходят через систему
- [Get Data API](/api/get-data) - документация endpoint `/api/data`
