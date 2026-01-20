# План: Шаг 8 — Backend — Header как top‑level элемент

**Цель:** вернуть header отдельным полем в layout (layout.header), не как секцию.
**Статус:** ✅ Завершено

## Задачи
- [x] Убедиться, что `component_type` у header = `header` (не `container`).
- [x] Изменить `layoutService`:
  - Не включать header в `sections`.
  - Добавить поле `layout.header`.
  - Сохранить `data_source_key` в header.

## Файлы для изменения
- `backend/src/services/config/layoutService.ts`

## Критерии завершения
- [x] `/api/layout` возвращает `layout.header`.
- [x] Header не появляется как секция.
