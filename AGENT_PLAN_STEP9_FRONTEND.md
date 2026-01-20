# План: Шаг 9 — Frontend — Подготовка к KPI через Data API

**Цель:** переключить KPI на использование Data API (после готовности backend).
**Статус:** ⏳ Ожидает начала

## Задачи
- [ ] Добавить вызов getData для `kpis_by_layout` (params: p1,p2,p3, layoutId)
- [ ] Заменить `useAllKPIs()` на `useGetData()`
- [ ] Преобразовать `rows` из Data API в формат KPI карточек

## Файлы для изменения
- `src/hooks/useAPI.ts`
- `src/components/KPICard.tsx`
- `src/pages/DynamicDashboard.tsx` (если нужно)

## Критерии завершения
- [ ] KPI карточки отображаются через Data API
- [ ] Старый `api/kpis` больше не используется
