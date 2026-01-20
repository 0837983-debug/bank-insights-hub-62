# План: Шаг 6 — Backend

**Цель:** layout возвращает data_source_key для всех компонентов, где он заполнен.
**Статус:** ✅ Завершено

## Задачи
- [x] В `layoutService` добавить передачу `data_source_key` в layout JSON.
- [x] Убедиться, что это работает для: table, header, button (когда появится).

## Файлы для изменения
- `backend/src/services/config/layoutService.ts`

## Критерии завершения
- [x] В layout JSON присутствует data_source_key в компонентах
