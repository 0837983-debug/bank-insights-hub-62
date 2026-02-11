-- 058_dedup_v_kpi_all.sql
-- Дедупликация v_kpi_all: убираем дубликаты из layout_component_mapping
-- Проблема: в layout_component_mapping могут быть повторы (layout_id, component_id),
-- что создаёт дубликаты строк при JOIN.
-- Решение: CTE lcm_unique с DISTINCT layout_id, component_id
-- Дата: 2026-02-09

-- Пересоздаём view с дедупликацией (CREATE OR REPLACE сохраняет зависимые views)
CREATE OR REPLACE VIEW mart.v_kpi_all AS
WITH lcm_unique AS (
  SELECT DISTINCT layout_id, component_id
  FROM config.layout_component_mapping
  WHERE deleted_at IS NULL
)
SELECT
  kpi.period_date,
  kpi.kpi_name,
  kpi.value,
  c.id AS component_id,
  lcm.layout_id
FROM (
  SELECT period_date, kpi_name, value FROM mart.mv_kpi_balance
  UNION ALL
  SELECT period_date, kpi_name, value FROM mart.mv_kpi_fin_results
  UNION ALL
  SELECT period_date, kpi_name, value FROM mart.mv_kpi_derived
) kpi
LEFT JOIN config.components c
  ON c.data_source_key = kpi.kpi_name
  AND c.component_type = 'card'
  AND c.is_active = TRUE
  AND c.deleted_at IS NULL
LEFT JOIN lcm_unique lcm
  ON lcm.component_id = c.id;

COMMENT ON VIEW mart.v_kpi_all IS 'Единая точка доступа для всех KPI с привязкой к карточкам (component_id) и layout (layout_id). Использует CTE для дедупликации layout_component_mapping.';

-- Проверочный запрос (раскомментировать для тестирования):
-- SELECT kpi_name, component_id, layout_id, COUNT(*) 
-- FROM mart.v_kpi_all 
-- WHERE component_id IS NOT NULL 
-- GROUP BY kpi_name, component_id, layout_id, period_date 
-- HAVING COUNT(*) > 1;
