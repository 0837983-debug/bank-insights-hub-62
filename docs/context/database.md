# Database Context

> **Последнее обновление**: 2026-02-09 (добавлен v_p_dates для дат периодов)  
> **Обновляет**: Backend Agent после изменения схемы

## Подключение

- **Тип**: PostgreSQL (AWS RDS)
- **SSL**: Required
- **Конфигурация**: `backend/src/config/database.ts`

## Схемы

### config — Конфигурация системы

| Таблица | Назначение |
|---------|------------|
| `layouts` | Layouts дашбордов |
| `components` | Описание компонентов UI |
| `component_fields` | Поля компонентов (field_type: dimension/measure/calculated/attribute) |
| `layout_component_mapping` | Привязка компонентов к layout |
| `component_queries` | JSON-конфиги для SQL Builder |
| `formats` | Форматы отображения данных |

**component_fields — ключевые поля:**
- `field_type` — тип поля: dimension, measure, calculated, attribute
- `calculation_config` — JSONB конфиг для calculated полей
- `aggregation` — тип агрегации для measure (sum, avg, etc.)
- `display_group` — группа отображения для calculated полей: `percent`, `absolute` (миграция 036)
- `is_default` — группа по умолчанию для отображения (миграция 036)
- ~~is_dimension, is_measure, compact_display, is_groupable~~ — **УДАЛЕНЫ**

**Display Groups (calculated поля):**
- `percent` — процентные изменения (p2Change, p3Change, ppChange, ytdChange)
- `absolute` — абсолютные изменения (p2ChangeAbsolute, p3ChangeAbsolute, ppChangeAbsolute, ytdChangeAbsolute)
- На фронте отображается одна группа (по умолчанию `is_default=true`), с возможностью переключения

**components — ключевые поля (миграция 053):**
- `query_id` — ID запроса для getData (для table/button/header). Отдаётся в layout JSON как `queryId`
- `data_source_key` — ключ источника данных. Для KPI-карточек = `tech_kpi_name`

**Разделение query_id и data_source_key:**
- `query_id` — используется фронтом для вызова `GET /api/data?query_id=X`
- `data_source_key` — используется для сопоставления KPI с компонентом

| component_type | query_id | data_source_key |
|----------------|----------|-----------------|
| table | balance, fin_results_table, etc. | то же что query_id |
| button | assets_table, liabilities_table, etc. | то же что query_id |
| header | header_dates | то же что query_id |
| card | NULL | tech_kpi_name (ASSETS, NII, ROA, etc.) |


**components — ключевые поля (миграция 053):**
- `query_id` — ID запроса для getData (для table/button/header). Отдаётся в layout JSON как `queryId`
- `data_source_key` — ключ источника данных. Для KPI-карточек = `tech_kpi_name`

**Разделение query_id и data_source_key:**
- `query_id` — используется фронтом для вызова `GET /api/data?query_id=X`
- `data_source_key` — используется для сопоставления KPI с компонентом

| component_type | query_id | data_source_key |
|----------------|----------|-----------------|
| table | balance, fin_results_table, etc. | то же что query_id |
| button | assets_table, liabilities_table, etc. | то же что query_id |
| header | header_dates | то же что query_id |
| card | NULL | tech_kpi_name (ASSETS, NII, ROA, etc.) |

### dict — Справочники

| Таблица | Назначение |
|---------|------------|
| `upload_mappings` | Маппинг полей файла → БД |
| `field_mappings` | Универсальный справочник подмен: raw_value → display_value для MART слоя |

**field_mappings — ключевые поля:**
- `source_table` — источник данных: 'fin_results', 'balance'
- `field_name` — имя поля: 'class', 'category', 'section'
- `raw_value` — оригинальное значение из ODS
- `display_value` — значение для отображения в MART
- `technical_name` — стабильный технический идентификатор для фильтрации KPI (NII, NCI, ASSETS, etc.)
- `is_active` — активен ли маппинг

**technical_name примеры:**
| raw_value | display_value | technical_name |
|-----------|---------------|----------------|
| 1) ЧПД | ЧПД | NII |
| 2) ЧКД | ЧКД | NCI |
| 3) ЧОД | ЧОД | NOI |
| Комиссии нетто | ЧКД | NCI |
| АКТИВЫ | Активы | ASSETS |
| КАПИТАЛ | Капитал | CAPITAL |

### stg — Staging

| Таблица | Назначение |
|---------|------------|
| `balance_upload` | Временные данные загрузки Balance |
| `fin_results_upload` | Временные данные загрузки Financial Results |

### ods — Operational Data Store

| Таблица | Назначение |
|---------|------------|
| `balance` | Данные Balance с аудит-полями |
| `fin_results` | Данные Financial Results с аудит-полями |

### mart — Data Mart (Materialized Views)

**Все MART объекты — это Materialized Views с JOIN на `dict.field_mappings` для трёх имён.**

| View | Назначение |
|------|------------|
| `balance` | MV из `ods.balance` с тремя именами (raw, display, tech) через field_mappings |
| `fin_results` | MV из `ods.fin_results` с тремя именами (raw, display, tech) через field_mappings |
| `mv_kpi_balance` | Агрегаты баланса для KPI. kpi_name = tech_class / tech_class::tech_section |
| `mv_kpi_fin_results` | Агрегаты финреза для KPI. kpi_name = tech_class / tech_class::tech_category + расчётные агрегаты |
| `mv_kpi_derived` | Производные KPI: ROA, ROE, CIR, OPERATING_MARGIN (миграция 047) |
| `v_kpi_all` | **VIEW** — единая точка для всех KPI (UNION ALL трёх MV). Обновляется автоматически при refresh базовых MV |
| `v_p_dates` | **VIEW** — список дат периодов из v_kpi_all с флагами is_p1/is_p2/is_p3 (миграция 056) |

**Три имени в MART MV (миграция 043):**

| Колонка | Назначение | Пример |
|---------|------------|--------|
| `raw_class` | Оригинальное значение из ODS | `1) ЧПД`, `АКТИВЫ` |
| `class` | Display значение для UI | `ЧПД`, `Активы` |
| `tech_class` | Технический идентификатор для фильтрации | `NII`, `ASSETS` |

```sql
-- Примеры запросов
SELECT raw_class, class, tech_class FROM mart.balance;
SELECT raw_class, class, tech_class, raw_category, category, tech_category FROM mart.fin_results;

-- KPI MV: фильтрация по kpi_name (теперь содержит tech_class)
SELECT * FROM mart.mv_kpi_balance WHERE kpi_name = 'ASSETS';
SELECT * FROM mart.mv_kpi_balance WHERE kpi_name = 'ASSETS::Кредиты';
SELECT * FROM mart.mv_kpi_fin_results WHERE kpi_name = 'ЧПД';
SELECT * FROM mart.mv_kpi_fin_results WHERE kpi_name = 'TOTAL_OPERATING_INCOME';
```

**Refresh (выполняется автоматически при загрузке данных):**
```sql
-- 1. MART базовые
REFRESH MATERIALIZED VIEW mart.balance;
REFRESH MATERIALIZED VIEW mart.fin_results;

-- 2. KPI базовые
REFRESH MATERIALIZED VIEW mart.mv_kpi_balance;
REFRESH MATERIALIZED VIEW mart.mv_kpi_fin_results;

-- 3. KPI производные (зависят от базовых!)
REFRESH MATERIALIZED VIEW mart.mv_kpi_derived;
```

**Архитектура MV:**
- `mart.balance` и `mart.fin_results` используют `LEFT JOIN dict.field_mappings` для получения трёх имён
- KPI MV содержат `kpi_name` (display) и `tech_name` (technical) для фильтрации
- При изменении маппингов в справочнике достаточно выполнить REFRESH (без изменения кода)
- Фильтрация `WHERE deleted_at IS NULL` обеспечивает soft-delete

**Расчётные агрегаты (миграция 045):**

| Агрегат | Описание | Формула |
|---------|----------|---------|
| `TOTAL_OPERATING_INCOME` | ЧОД (Чистый операционный доход) | ЧПД + ЧКД + FX + ЧТД |
| `OPERATING_PROFIT` | Операционная прибыль | ЧОД + ОПЕРАЦИОННЫЕ_РАСХОДЫ (расходы с минусом) |
| `NET_PROFIT` | Чистая прибыль | Сумма всего финреза |

```sql
-- Примеры запросов к расчётным агрегатам
SELECT * FROM mart.mv_kpi_fin_results WHERE kpi_name = 'TOTAL_OPERATING_INCOME';
SELECT * FROM mart.mv_kpi_fin_results WHERE kpi_name = 'OPERATING_PROFIT';
SELECT * FROM mart.mv_kpi_fin_results WHERE kpi_name = 'NET_PROFIT';
```

**Производные KPI (миграция 047, исправлено в 049):**

| KPI | Формула | Источники |
|-----|---------|-----------|
| `ROA` | NET_PROFIT / АКТИВЫ * -1 * 12 | mv_kpi_fin_results + mv_kpi_balance |
| `ROE` | NET_PROFIT / КАПИТАЛ * 12 | mv_kpi_fin_results + mv_kpi_balance |
| `CIR` | \|ОПЕРАЦИОННЫЕ_РАСХОДЫ\| / TOTAL_OPERATING_INCOME | mv_kpi_fin_results |
| `OPERATING_MARGIN` | OPERATING_PROFIT / TOTAL_OPERATING_INCOME | mv_kpi_fin_results |

**Примечания к формулам:**
- ROA: `* -1` компенсирует отрицательный знак АКТИВОВ в агрегации, `* 12` для годовых %
- ROE: КАПИТАЛ положительный, поэтому только `* 12` для годовых %

```sql
-- Примеры запросов к производным KPI
SELECT * FROM mart.mv_kpi_derived WHERE kpi_name = 'ROA';
SELECT * FROM mart.mv_kpi_derived WHERE kpi_name = 'ROE';
SELECT * FROM mart.mv_kpi_derived WHERE kpi_name = 'CIR';
SELECT * FROM mart.mv_kpi_derived WHERE kpi_name = 'OPERATING_MARGIN';
```

**Единая VIEW для всех KPI (миграция 048, обновлена в 052, 055, 058):**

`mart.v_kpi_all` — объединяет все три MV в одну точку доступа:
- `mv_kpi_balance` — базовые агрегаты баланса
- `mv_kpi_fin_results` — базовые + расчётные агрегаты финреза
- `mv_kpi_derived` — производные KPI
- **`component_id`** — ID карточки из config.components (JOIN по data_source_key = kpi_name)
- **`layout_id`** — ID layout из config.layout_component_mapping (миграция 055)

**Колонки v_kpi_all:**
| Колонка | Тип | Описание |
|---------|-----|----------|
| `period_date` | DATE | Дата периода |
| `kpi_name` | VARCHAR | Название KPI (АКТИВЫ, ROA, NET_PROFIT, etc.) |
| `value` | NUMERIC | Значение KPI |
| `component_id` | VARCHAR | ID карточки (assets_card, roa_card, etc.) или NULL |
| `layout_id` | VARCHAR | ID layout (main_dashboard, etc.) или NULL |

**Примечание:** При наличии компонента в нескольких layout создаются отдельные строки.

**Дедупликация (миграция 058):** View использует CTE `lcm_unique` с `DISTINCT layout_id, component_id` для устранения дубликатов из `layout_component_mapping`.

```sql
-- Все KPI из одной точки
SELECT * FROM mart.v_kpi_all WHERE kpi_name = 'АКТИВЫ';
SELECT * FROM mart.v_kpi_all WHERE kpi_name = 'NET_PROFIT';
SELECT * FROM mart.v_kpi_all WHERE kpi_name = 'ROA';

-- KPI с привязанными карточками
SELECT kpi_name, component_id FROM mart.v_kpi_all WHERE component_id IS NOT NULL;

-- KPI по layout
SELECT * FROM mart.v_kpi_all WHERE layout_id = 'main_dashboard';

-- Список всех KPI
SELECT DISTINCT kpi_name FROM mart.v_kpi_all ORDER BY kpi_name;
```

**Важно:** `v_kpi_all` — это обычная VIEW (не MV), refresh не требуется.

**VIEW для дат периодов (миграция 056):**

`mart.v_p_dates` — список уникальных дат из `v_kpi_all` с флагами:
- `period_date` — дата периода
- `is_p1` — последняя дата (p1)
- `is_p2` — предпоследняя дата (p2)
- `is_p3` — последняя дата предыдущего года (p3)

```sql
-- Все даты с флагами
SELECT * FROM mart.v_p_dates;

-- Выбранные даты (p1, p2, p3)
SELECT period_date FROM mart.v_p_dates WHERE is_p1 OR is_p2 OR is_p3;
```

### ing — Ingestion

| Таблица | Назначение |
|---------|------------|
| `uploads` | История загрузок |

### log — Логирование

| Таблица | Назначение |
|---------|------------|
| `events` | Лог событий |

## Ключевые Views

| View | Схема | Назначение |
|------|-------|------------|
| `layout_sections_json_view` | config | Layout с sections, components, columns, sub_columns (включая displayGroup, isDefault, queryId) |
| `layout_formats_view` | config | Форматы для фронта |

## SQL Builder конфиги

Хранятся в `config.component_queries`:

| query_id | Назначение |
|----------|------------|
| `header_dates` | Список дат из v_p_dates с флагами isP1/isP2/isP3 (миграция 057) |
| `assets_table` | Таблица активов |
| `liabilities_table` | Таблица пассивов |
| `fin_results_table` | Таблица финансовых результатов |
| `kpis` | KPI для карточек (из mart.v_kpi_all с component_id) |

**Query `kpis`:**
- Источник: `mart.v_kpi_all`
- Фильтр: `component_id IS NOT NULL` (только KPI с карточками)
- Группировка: по `component_id`
- Возвращает: `componentId`, `value`, `p2Value`, `p3Value`

## Миграции

- Расположение: `backend/src/migrations/`
- Формат: `NNN_description.sql`
- Запуск: `npm run migrate`

## Аудит-поля

Все ODS/MART таблицы содержат:
```sql
id SERIAL PRIMARY KEY,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP,
created_by VARCHAR(255),
is_deleted BOOLEAN DEFAULT FALSE
```
