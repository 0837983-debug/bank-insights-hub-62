-- 062_fix_assets_sign_fallback_and_derived_refresh.sql
-- Fix: инверсия знака АКТИВОВ должна работать даже без dict.field_mappings для balance.class.
-- Also keep derived KPIs consistent with current ROA formula (without * -1).

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
  SELECT period_date, kpi_name, value FROM mart.mv_kpi_fin_results
) kpi
LEFT JOIN config.components c
  ON c.data_source_key = kpi.kpi_name
  AND c.component_type = 'card'
  AND c.is_active = TRUE
  AND c.deleted_at IS NULL
LEFT JOIN lcm_unique lcm
  ON lcm.component_id = c.id;

DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_derived;
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_balance;
DROP MATERIALIZED VIEW IF EXISTS mart.balance;

CREATE MATERIALIZED VIEW mart.balance AS
SELECT
  o.id,
  o.period_date,
  o.class AS raw_class,
  COALESCE(fm_class.display_value, o.class) AS class,
  COALESCE(fm_class.technical_name, o.class) AS tech_class,
  o.section AS raw_section,
  COALESCE(fm_section.display_value, o.section) AS section,
  COALESCE(fm_section.technical_name, o.section) AS tech_section,
  o.item,
  o.sub_item,
  CASE
    WHEN UPPER(COALESCE(fm_class.technical_name, o.class)) IN ('ASSETS', 'АКТИВЫ')
      THEN o.value * -1
    ELSE o.value
  END AS value,
  o.upload_id,
  o.created_at
FROM ods.balance o
LEFT JOIN dict.field_mappings fm_class
  ON fm_class.source_table = 'balance'
  AND fm_class.field_name = 'class'
  AND fm_class.raw_value = o.class
  AND fm_class.is_active = TRUE
  AND fm_class.deleted_at IS NULL
LEFT JOIN dict.field_mappings fm_section
  ON fm_section.source_table = 'balance'
  AND fm_section.field_name = 'section'
  AND fm_section.raw_value = o.section
  AND fm_section.is_active = TRUE
  AND fm_section.deleted_at IS NULL
WHERE o.deleted_at IS NULL;

CREATE INDEX idx_mart_balance_period ON mart.balance(period_date);
CREATE INDEX idx_mart_balance_class ON mart.balance(class, period_date);
CREATE INDEX idx_mart_balance_tech_class ON mart.balance(tech_class, period_date);

COMMENT ON MATERIALIZED VIEW mart.balance IS 'MART баланс: АКТИВЫ (ASSETS/АКТИВЫ) инвертируются в положительный знак.';

CREATE MATERIALIZED VIEW mart.mv_kpi_balance AS
SELECT period_date, tech_class AS kpi_name, SUM(value) AS value
FROM mart.balance
GROUP BY period_date, tech_class

UNION ALL

SELECT period_date, tech_class || '::' || tech_section AS kpi_name, SUM(value) AS value
FROM mart.balance
WHERE tech_section IS NOT NULL
GROUP BY period_date, tech_class, tech_section

ORDER BY period_date;

CREATE INDEX idx_mv_kpi_balance_period_name ON mart.mv_kpi_balance(period_date, kpi_name);

COMMENT ON MATERIALIZED VIEW mart.mv_kpi_balance IS 'Агрегаты баланса: по tech_class, tech_class::tech_section';

CREATE MATERIALIZED VIEW mart.mv_kpi_derived AS
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

