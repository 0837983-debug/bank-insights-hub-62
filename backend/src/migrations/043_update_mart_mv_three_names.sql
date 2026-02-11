-- 043_update_mart_mv_three_names.sql
-- Обновление MART MV: три имени (raw, display, technical)

-- Удаляем зависимые MV
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_balance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_fin_results CASCADE;

-- =============================================================================
-- Пересоздаём mart.balance с тремя именами
-- =============================================================================
DROP MATERIALIZED VIEW IF EXISTS mart.balance CASCADE;

CREATE MATERIALIZED VIEW mart.balance AS
SELECT
  o.id,
  o.period_date,
  -- Три имени для class
  o.class AS raw_class,
  COALESCE(fm_class.display_value, o.class) AS class,
  COALESCE(fm_class.technical_name, o.class) AS tech_class,
  -- Три имени для section
  o.section AS raw_section,
  COALESCE(fm_section.display_value, o.section) AS section,
  COALESCE(fm_section.technical_name, o.section) AS tech_section,
  -- Остальные поля
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
CREATE INDEX idx_mart_balance_tech_class ON mart.balance(tech_class, period_date);

COMMENT ON MATERIALIZED VIEW mart.balance IS 'MART баланс с тремя именами (raw, display, technical)';

-- =============================================================================
-- Пересоздаём mart.fin_results с тремя именами
-- =============================================================================
DROP MATERIALIZED VIEW IF EXISTS mart.fin_results CASCADE;

CREATE MATERIALIZED VIEW mart.fin_results AS
SELECT
  o.id,
  o.period_date,
  -- Три имени для class
  o.class AS raw_class,
  COALESCE(fm_class.display_value, o.class) AS class,
  COALESCE(fm_class.technical_name, o.class) AS tech_class,
  -- Три имени для category
  o.category AS raw_category,
  COALESCE(fm_cat.display_value, o.category) AS category,
  COALESCE(fm_cat.technical_name, o.category) AS tech_category,
  -- Остальные поля
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
CREATE INDEX idx_mart_fin_results_tech_class ON mart.fin_results(tech_class, period_date);

COMMENT ON MATERIALIZED VIEW mart.fin_results IS 'MART финрез с тремя именами (raw, display, technical)';

-- =============================================================================
-- Пересоздаём KPI MV (были удалены каскадом) с tech_name
-- =============================================================================

CREATE MATERIALIZED VIEW mart.mv_kpi_balance AS
SELECT period_date, class AS kpi_name, tech_class AS tech_name, SUM(value) AS value
FROM mart.balance
GROUP BY period_date, class, tech_class
UNION ALL
SELECT period_date, class || '::' || section AS kpi_name, tech_class || '::' || tech_section AS tech_name, SUM(value) AS value
FROM mart.balance
WHERE section IS NOT NULL
GROUP BY period_date, class, section, tech_class, tech_section
ORDER BY period_date;

CREATE INDEX idx_mv_kpi_balance_period_name ON mart.mv_kpi_balance(period_date, kpi_name);
CREATE INDEX idx_mv_kpi_balance_tech_name ON mart.mv_kpi_balance(tech_name);

COMMENT ON MATERIALIZED VIEW mart.mv_kpi_balance IS 'KPI агрегаты баланса (с tech_name для фильтрации)';

CREATE MATERIALIZED VIEW mart.mv_kpi_fin_results AS
SELECT period_date, class AS kpi_name, tech_class AS tech_name, SUM(value) AS value
FROM mart.fin_results
GROUP BY period_date, class, tech_class
UNION ALL
SELECT period_date, class || '::' || category AS kpi_name, tech_class || '::' || tech_category AS tech_name, SUM(value) AS value
FROM mart.fin_results
WHERE category IS NOT NULL
GROUP BY period_date, class, category, tech_class, tech_category
ORDER BY period_date;

CREATE INDEX idx_mv_kpi_fin_results_period_name ON mart.mv_kpi_fin_results(period_date, kpi_name);
CREATE INDEX idx_mv_kpi_fin_results_tech_name ON mart.mv_kpi_fin_results(tech_name);

COMMENT ON MATERIALIZED VIEW mart.mv_kpi_fin_results IS 'KPI агрегаты финреза (с tech_name для фильтрации)';
