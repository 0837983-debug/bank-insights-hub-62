-- 055_add_layout_id_to_v_kpi_all.sql
-- Добавляет layout_id в v_kpi_all через JOIN на layout_component_mapping
-- При наличии компонента в нескольких layout создаются отдельные строки

-- Пересоздаём view с layout_id
DROP VIEW IF EXISTS mart.v_kpi_all CASCADE;

CREATE VIEW mart.v_kpi_all AS
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
LEFT JOIN config.layout_component_mapping lcm
  ON lcm.component_id = c.id
  AND lcm.deleted_at IS NULL;

COMMENT ON VIEW mart.v_kpi_all IS 'Единая точка доступа для всех KPI с привязкой к карточкам (component_id) и layout (layout_id). При компоненте в нескольких layout создаются отдельные строки.';

-- Проверочные запросы (раскомментировать для тестирования):
-- SELECT * FROM mart.v_kpi_all WHERE layout_id = 'main_dashboard' LIMIT 10;
-- SELECT kpi_name, component_id, layout_id FROM mart.v_kpi_all WHERE component_id IS NOT NULL;
-- SELECT DISTINCT layout_id FROM mart.v_kpi_all WHERE layout_id IS NOT NULL;
