# План: Шаг 1 — QA

**Цель:** проверить миграцию и наличие конфигов.
**Статус:** ✅ Завершено

## Задачи
- [x] Проверить, что миграция 019 применяется без ошибок.
- [x] Проверить, что в `config.component_queries` есть записи:
  - `header_dates`
  - `assets_table`
- [x] Зафиксировать SQL-запросы для проверки и результат.

## Файлы для изменения
- `backend/src/scripts/test-query-directly.ts` (если нужно)
- `docs/` (если фиксируем результаты)

## Критерии завершения
- [x] Таблица создана ✅
- [x] 2 конфига доступны ✅

## Результаты проверки

### Таблица config.component_queries
- ✅ Таблица существует
- ✅ Структура соответствует требованиям

### Конфиги
1. **header_dates**
   - ✅ Найден в БД
   - ✅ component_id: NULL
   - ✅ title: "Даты периодов для header"
   - ✅ is_active: true
   - ✅ config_json валиден
   - ✅ from: mart.kpi_metrics
   - ✅ wrap_json: false

2. **assets_table**
   - ✅ Найден в БД
   - ✅ component_id: assets_table
   - ✅ title: "Данные таблицы активов"
   - ✅ is_active: true
   - ✅ config_json валиден
   - ✅ from: mart.balance
   - ✅ select items: 7 (включая case_agg)
   - ✅ has where, groupBy, orderBy
   - ✅ wrap_json: false

### Скрипт проверки
Создан скрипт `backend/src/scripts/test-component-queries.ts` для автоматической проверки.
