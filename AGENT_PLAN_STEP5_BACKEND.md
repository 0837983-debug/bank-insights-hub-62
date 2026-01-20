# План: Шаг 5 — Backend

**Цель:** Header как компонент + data_source_key = header_dates.
**Статус:** ✅ Завершено

## Задачи
- [x] Добавить компонент `header` в `config.components`.
- [x] Привязать header к layout через `layout_component_mapping`.
- [x] Установить `data_source_key = header_dates`.

## Файлы для изменения
- `backend/src/migrations/021_add_header_component.sql`
- `backend/src/scripts/run-migration-021.ts`

## Критерии завершения
- [x] Header есть в components
- [x] Header связан с layout
- [x] data_source_key задан
