# План: Шаг 7 — Backend

**Цель:** заменить groupableFields на кнопки-компоненты.
**Статус:** ✅ Завершено

## Задачи
- [x] Создать компонент типа `button` в `config.components`.
- [x] Перенести groupableFields в кнопки:
  - Для каждой таблицы создать дочерние кнопки через `layout_component_mapping`.
  - В `data_source_key` кнопки хранить query_id.
- [x] Убрать groupableFields из layoutService (не возвращать в layout JSON).

## Файлы для изменения
- `backend/src/migrations/022_add_button_components.sql`
- `backend/src/scripts/run-migration-022.ts`
- `backend/src/services/config/layoutService.ts`

## Критерии завершения
- [x] Кнопки есть в БД и связаны с таблицей
- [x] Layout больше не возвращает groupableFields
- [x] Layout возвращает кнопки как дочерние компоненты
