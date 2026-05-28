-- 060_update_mart_balance_sign.sql
-- Инверсия знака для АКТИВОВ в mart.balance (tech_class = 'ASSETS').
-- В этой миграции v_kpi_all временно строится без mv_kpi_derived, чтобы
-- пересоздать mart.balance/mv_kpi_balance без CASCADE на пользовательские view.

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
    WHEN COALESCE(fm_class.technical_name, o.class) = 'ASSETS' THEN o.value * -1
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
LEFT JOIN dict.field_mappings fm_section
  ON fm_section.source_table = 'balance'
  AND fm_section.field_name = 'section'
  AND fm_section.raw_value = o.section
  AND fm_section.is_active = TRUE
WHERE o.deleted_at IS NULL;

CREATE INDEX idx_mart_balance_period ON mart.balance(period_date);
CREATE INDEX idx_mart_balance_class ON mart.balance(class, period_date);
CREATE INDEX idx_mart_balance_tech_class ON mart.balance(tech_class, period_date);

COMMENT ON MATERIALIZED VIEW mart.balance IS 'MART баланс с инверсией знака для tech_class=ASSETS (АКТИВЫ).';

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

-- Временная версия до следующей миграции (где вернём mv_kpi_derived в UNION).
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
) kpi
LEFT JOIN config.components c
  ON c.data_source_key = kpi.kpi_name
  AND c.component_type = 'card'
  AND c.is_active = TRUE
  AND c.deleted_at IS NULL
LEFT JOIN lcm_unique lcm
  ON lcm.component_id = c.id;

