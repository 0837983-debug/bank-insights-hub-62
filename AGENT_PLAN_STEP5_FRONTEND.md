# План: Шаг 5 — Frontend

**Цель:** перевести Header на layout и загрузку дат через data_source_key.
**Статус:** ✅ Завершено

## Задачи
- [x] Перестать рендерить `Header` напрямую в `DynamicDashboard`.
- [x] Получать header-компонент из layout (по типу `header`).
- [x] Вызвать `getData` по `data_source_key` header и сохранить даты в state/контексте.
- [x] Прокидывать dates (periodDate/ppDate/pyDate) в API вызовы таблиц.

## Файлы для изменения
- `src/pages/DynamicDashboard.tsx`
- `src/components/Header.tsx`
- `src/lib/api.ts`
- `src/hooks/` (если нужен новый хук)

## Критерии завершения
- [x] Header берется из layout
- [x] Даты получаются из getData
- [x] Даты используются в запросах к таблицам
