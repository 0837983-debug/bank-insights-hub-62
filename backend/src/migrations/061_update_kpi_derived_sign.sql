-- 061_update_kpi_derived_sign.sql
-- После инверсии АКТИВОВ в mart.balance ROA больше не требует множитель * -1.

DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_derived;

CREATE MATERIALIZED VIEW mart.mv_kpi_derived AS

-- ROA = NET_PROFIT / АКТИВЫ * 12 (годовые %)
SELECT
  fr.period_date,
  'ROA' AS kpi_name,
  CASE WHEN COALESCE(b.value, 0) != 0
    THEN fr.value / b.value * 12
    ELSE 0
  END AS value
FROM mart.mv_kpi_fin_results fr
JOIN mart.mv_kpi_balance b
  ON fr.period_date = b.period_date AND b.kpi_name = 'АКТИВЫ'
WHERE fr.kpi_name = 'NET_PROFIT'

UNION ALL

-- ROE = NET_PROFIT / КАПИТАЛ * 12 (годовые %)
SELECT
  fr.period_date,
  'ROE' AS kpi_name,
  CASE WHEN COALESCE(b.value, 0) != 0
    THEN fr.value / b.value * 12
    ELSE 0
  END AS value
FROM mart.mv_kpi_fin_results fr
JOIN mart.mv_kpi_balance b
  ON fr.period_date = b.period_date AND b.kpi_name = 'КАПИТАЛ'
WHERE fr.kpi_name = 'NET_PROFIT'

UNION ALL

-- CIR = |ОПЕРАЦИОННЫЕ_РАСХОДЫ| / TOTAL_OPERATING_INCOME
SELECT
  opex.period_date,
  'CIR' AS kpi_name,
  CASE WHEN COALESCE(toi.value, 0) != 0
    THEN ABS(opex.value) / toi.value
    ELSE 0
  END AS value
FROM mart.mv_kpi_fin_results opex
JOIN mart.mv_kpi_fin_results toi
  ON opex.period_date = toi.period_date AND toi.kpi_name = 'TOTAL_OPERATING_INCOME'
WHERE opex.kpi_name = 'ОПЕРАЦИОННЫЕ_РАСХОДЫ'

UNION ALL

-- Operating Margin = OPERATING_PROFIT / TOTAL_OPERATING_INCOME
SELECT
  op.period_date,
  'OPERATING_MARGIN' AS kpi_name,
  CASE WHEN COALESCE(toi.value, 0) != 0
    THEN op.value / toi.value
    ELSE 0
  END AS value
FROM mart.mv_kpi_fin_results op
JOIN mart.mv_kpi_fin_results toi
  ON op.period_date = toi.period_date AND toi.kpi_name = 'TOTAL_OPERATING_INCOME'
WHERE op.kpi_name = 'OPERATING_PROFIT'

ORDER BY period_date;

CREATE INDEX idx_mv_kpi_derived_period_name ON mart.mv_kpi_derived(period_date, kpi_name);

COMMENT ON MATERIALIZED VIEW mart.mv_kpi_derived IS 'Производные KPI: ROA, ROE (годовые %), CIR, OPERATING_MARGIN';

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
