# План: Шаг 1 — Backend

**Цель:** создать таблицу конфигов запросов и положить базовые конфиги (header_dates, assets_table).
**Статус:** ✅ Завершено

## Задачи
- [x] Спроектировать таблицу `config.component_queries`:
  - `id` (pk), `query_id` (unique), `component_id` (nullable), `title`
  - `config_json` (jsonb), `wrap_json` (bool), `is_active`
  - `created_at`, `updated_at`, `deleted_at`
- [x] Создать миграцию для таблицы.
- [x] Вставить 2 базовых конфига:
  - `header_dates`
  - `assets_table`
- [x] Добавить минимальный скрипт/SQL для seed (если нужно).

## Файлы для изменения
- `backend/src/migrations/019_create_component_queries.sql`
- `backend/src/scripts/run-migration-019.ts` (если используется)
- `backend/src/scripts/migrate-layout-data.ts` (если используем для seed)

## Критерии завершения
- [x] Таблица существует
- [x] Конфиги `header_dates` и `assets_table` доступны в БД
- [x] Нет ошибок миграций
