# План: Шаг 9 — Backend — KPI через view + Data API

**Цель:** подготовить view `mart.kpi_metrics_enriched` и конфиг для KPI через Data API.
**Статус:** ⏳ Ожидает начала

## Задачи
- [ ] Создать/обновить VIEW `mart.kpi_metrics_enriched`:
  - JOIN с `config.components`
  - JOIN/LEFT JOIN с `config.layout_component_mapping`
  - Фильтры на удаленные компоненты и удаленные связи
- [ ] Создать конфиг `kpis_by_layout` в `config.component_queries`:
  - SELECT `component_id`, `value`, `prev_period`, `prev_year`
  - WHERE: `period_date IN (p1,p2,p3)`, `layout_id = :layoutId`, `mapping_is_visible = TRUE`
  - groupBy `component_id`
  - wrap_json = true
- [ ] Проверить, что Data API возвращает KPI для layout_id

## Файлы для изменения
- `backend/src/migrations/` (новая миграция для VIEW)
- `backend/src/migrations/` (миграция для `config.component_queries`)

## Критерии завершения
- [ ] VIEW создана и фильтрует удаленные компоненты/связи
- [ ] Конфиг `kpis_by_layout` работает
- [ ] `/api/data/kpis_by_layout?...` возвращает данные
