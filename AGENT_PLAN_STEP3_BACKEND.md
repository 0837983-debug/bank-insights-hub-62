# План: Шаг 3 — Backend

**Цель:** SQL builder v2 — поддержка `wrapJson` (оборачивать результат в jsonb_agg).
**Статус:** ✅ Завершено

## Задачи
- [x] Добавить в конфиг запросов поле `wrapJson` (если ещё не хранится).
- [x] Доработать builder:
  - Если `wrapJson = true` → оборачивать базовый SELECT в `SELECT jsonb_agg(row_to_json(t)) FROM (...) t` (или эквивалент).
  - Если `wrapJson = false` → возвращать исходный SELECT.
- [x] Обновить тесты на wrapJson (true/false).

## Файлы для изменения
- `backend/src/services/queryBuilder/builder.ts`
- `backend/src/services/queryBuilder/queryLoader.ts`
- `backend/src/services/queryBuilder/__tests__/builder.test.ts`
- `backend/src/services/queryBuilder/index.ts`

## Критерии завершения
- [x] При wrapJson возвращается JSON
- [x] При wrapJson=false возвращается обычный SQL
- [x] Тесты проходят
