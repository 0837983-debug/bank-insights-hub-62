-- 041_mart_tables_to_mv.sql
-- Преобразование MART таблиц в Materialized Views с JOIN на dict.field_mappings

-- ⚠️ Удаляем зависимые MV (будут пересозданы в этой миграции)
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_all CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_derived CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_balance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_fin_results CASCADE;

-- Удаляем старые таблицы
DROP TABLE IF EXISTS mart.balance CASCADE;
DROP TABLE IF EXISTS mart.fin_results CASCADE;

-- =============================================================================
-- mart.balance как Materialized View
-- =============================================================================
CREATE MATERIALIZED VIEW mart.balance AS
SELECT
  o.id,
  o.period_date,
  COALESCE(fm_class.display_value, o.class) AS class,
  COALESCE(fm_section.display_value, o.section) AS section,
  o.item,
  o.sub_item,
  o.value,
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

COMMENT ON MATERIALIZED VIEW mart.balance IS 'MART баланс (MV из ODS с подменой значений через dict.field_mappings)';

-- =============================================================================
-- mart.fin_results как Materialized View
-- =============================================================================
CREATE MATERIALIZED VIEW mart.fin_results AS
SELECT
  o.id,
  o.period_date,
  COALESCE(fm_class.display_value, o.class) AS class,
  COALESCE(fm_cat.display_value, o.category) AS category,
  o.item,
  o.subitem,
  o.details,
  o.value,
  o.upload_id,
  o.created_at
FROM ods.fin_results o
LEFT JOIN dict.field_mappings fm_class
  ON fm_class.source_table = 'fin_results'
  AND fm_class.field_name = 'class'
  AND fm_class.raw_value = o.class
  AND fm_class.is_active = TRUE
LEFT JOIN dict.field_mappings fm_cat
  ON fm_cat.source_table = 'fin_results'
  AND fm_cat.field_name = 'category'
  AND fm_cat.raw_value = o.category
  AND fm_cat.is_active = TRUE
WHERE o.deleted_at IS NULL;

CREATE INDEX idx_mart_fin_results_period ON mart.fin_results(period_date);
CREATE INDEX idx_mart_fin_results_class ON mart.fin_results(class, period_date);

COMMENT ON MATERIALIZED VIEW mart.fin_results IS 'MART финрез (MV из ODS с подменой значений через dict.field_mappings)';

-- =============================================================================
-- Пересоздаём KPI MV (были удалены каскадом)
-- =============================================================================

-- mv_kpi_balance: агрегаты для KPI карточек
CREATE MATERIALIZED VIEW mart.mv_kpi_balance AS
SELECT period_date, class AS kpi_name, SUM(value) AS value
FROM mart.balance
GROUP BY period_date, class
UNION ALL
SELECT period_date, class || '::' || section AS kpi_name, SUM(value) AS value
FROM mart.balance
WHERE section IS NOT NULL
GROUP BY period_date, class, section
ORDER BY period_date;

CREATE INDEX idx_mv_kpi_balance_period_name ON mart.mv_kpi_balance(period_date, kpi_name);

COMMENT ON MATERIALIZED VIEW mart.mv_kpi_balance IS 'KPI агрегаты баланса (уровни: class, class::section)';

-- mv_kpi_fin_results: агрегаты для KPI карточек
CREATE MATERIALIZED VIEW mart.mv_kpi_fin_results AS
SELECT period_date, class AS kpi_name, SUM(value) AS value
FROM mart.fin_results
GROUP BY period_date, class
UNION ALL
SELECT period_date, class || '::' || category AS kpi_name, SUM(value) AS value
FROM mart.fin_results
WHERE category IS NOT NULL
GROUP BY period_date, class, category
ORDER BY period_date;

CREATE INDEX idx_mv_kpi_fin_results_period_name ON mart.mv_kpi_fin_results(period_date, kpi_name);

COMMENT ON MATERIALIZED VIEW mart.mv_kpi_fin_results IS 'KPI агрегаты финреза (уровни: class, class::category)';
