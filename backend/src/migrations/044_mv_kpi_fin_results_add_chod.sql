-- 044_mv_kpi_fin_results_add_chod.sql
-- Добавление расчётного агрегата TOTAL_OPERATING_INCOME (ЧОД = ЧПД + ЧКД + FX + ЧТД)

-- =============================================================================
-- 1. Исправляем опечатку в dict.field_mappings: ЧТП → ЧТД
-- =============================================================================
UPDATE dict.field_mappings 
SET technical_name = 'ЧТД' 
WHERE source_table = 'fin_results' 
  AND field_name = 'class' 
  AND raw_value = '4) ЧТД' 
  AND technical_name = 'ЧТП';

-- =============================================================================
-- 2. Пересоздаём mv_kpi_fin_results с расчётным агрегатом
-- =============================================================================
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_fin_results CASCADE;

CREATE MATERIALIZED VIEW mart.mv_kpi_fin_results AS

-- Уровень tech_class
SELECT period_date, class AS kpi_name, tech_class AS tech_name, SUM(value) AS value
FROM mart.fin_results
GROUP BY period_date, class, tech_class

UNION ALL

-- Уровень tech_class::tech_category
SELECT period_date, class || '::' || category AS kpi_name, tech_class || '::' || tech_category AS tech_name, SUM(value) AS value
FROM mart.fin_results
WHERE category IS NOT NULL
GROUP BY period_date, class, category, tech_class, tech_category

UNION ALL

-- Расчётный агрегат: TOTAL_OPERATING_INCOME (ЧОД) = ЧПД + ЧКД + FX + ЧТД
SELECT period_date, 'ЧОД' AS kpi_name, 'TOTAL_OPERATING_INCOME' AS tech_name, SUM(value) AS value
FROM mart.fin_results
WHERE tech_class IN ('ЧПД', 'ЧКД', 'FX', 'ЧТД')
GROUP BY period_date

ORDER BY period_date;

-- =============================================================================
-- 3. Индексы
-- =============================================================================
CREATE INDEX idx_mv_kpi_fin_results_period_name ON mart.mv_kpi_fin_results(period_date, kpi_name);
CREATE INDEX idx_mv_kpi_fin_results_tech_name ON mart.mv_kpi_fin_results(tech_name);

-- =============================================================================
-- Комментарий
-- =============================================================================
COMMENT ON MATERIALIZED VIEW mart.mv_kpi_fin_results IS 'KPI агрегаты финреза: tech_class, tech_class::tech_category, + TOTAL_OPERATING_INCOME (расчётный ЧОД)';
