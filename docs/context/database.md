# Database Context

> **Последнее обновление**: 2026-02-05 (добавлены MVs: mv_kpi_balance, mv_kpi_fin_results)  
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

### dict — Справочники

| Таблица | Назначение |
|---------|------------|
| `upload_mappings` | Маппинг полей файла → БД |

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

### mart — Data Mart

| Таблица | Назначение |
|---------|------------|
| `balance` | Финальные данные для дашборда |
| `fin_results` | Финальные данные Financial Results для дашборда |

**Materialized Views:**

| View | Назначение |
|------|------------|
| `mv_kpi_balance` | Агрегаты баланса для KPI карточек (period_date + kpi_name). Уровни: class, class::section |
| `mv_kpi_fin_results` | Агрегаты финреза для KPI карточек (period_date + kpi_name). Уровни: class, class::category |

Refresh (пока вручную):
```sql
REFRESH MATERIALIZED VIEW mart.mv_kpi_balance;
REFRESH MATERIALIZED VIEW mart.mv_kpi_fin_results;
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
| `layout_sections_json_view` | config | Layout с sections, components, columns, sub_columns (включая displayGroup, isDefault) |
| `layout_formats_view` | config | Форматы для фронта |

## SQL Builder конфиги

Хранятся в `config.component_queries`:

| query_id | Назначение |
|----------|------------|
| `header_dates` | Даты для Header |
| `assets_table` | Таблица активов |
| `liabilities_table` | Таблица пассивов |
| `fin_results_table` | Таблица финансовых результатов |

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
