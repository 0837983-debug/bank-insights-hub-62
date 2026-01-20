# План: Шаг 7 — Frontend

**Цель:** заменить groupableFields UI на кнопки-компоненты.
**Статус:** ✅ Завершено

## Задачи
- [x] В `DynamicDashboard` получать кнопки из layout (дочерние компоненты таблицы).
- [x] В `FinancialTable` заменить `groupableFields` на `buttons`.
- [x] По клику кнопки отправлять `query_id` (data_source_key кнопки) в getData.
- [x] Если активной кнопки нет → использовать data_source_key таблицы.

## Файлы для изменения
- `src/pages/DynamicDashboard.tsx`
- `src/components/FinancialTable.tsx`
- `src/lib/api.ts`

## Критерии завершения
- [x] Кнопки работают
- [x] groupableFields больше не используются (deprecated, но оставлены для обратной совместимости)
- [x] Запросы идут через data_source_key
