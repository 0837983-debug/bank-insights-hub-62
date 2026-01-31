# Database Context

> **Последнее обновление**: 2026-01-30 (добавлены ods.fin_results, mart.fin_results)  
> **Обновляет**: Backend Agent после изменения схемы

## Подключение

- **Тип**: PostgreSQL (AWS RDS)
- **SSL**: Required
- **Конфигурация**: `backend/src/config/database.ts`

## Схемы

### config — Конфигурация системы

| Таблица | Назначение |
|---------|------------|
| `components` | Описание компонентов UI |
| `layout_component_mapping` | Привязка компонентов к layout |
| `component_queries` | JSON-конфиги для SQL Builder |
| `formats` | Форматы отображения данных |

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
| `layout_sections_view` | config | Layout для фронта |
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
