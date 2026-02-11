-- 048_create_kpi_all_mv.sql
-- Единая точка для всех KPI

DROP VIEW IF EXISTS mart.v_kpi_all CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_all CASCADE;

CREATE VIEW mart.v_kpi_all AS
SELECT period_date, kpi_name, value FROM mart.mv_kpi_balance
UNION ALL
SELECT period_date, kpi_name, value FROM mart.mv_kpi_fin_results
UNION ALL
SELECT period_date, kpi_name, value FROM mart.mv_kpi_derived;

COMMENT ON VIEW mart.v_kpi_all IS 'Все KPI: базовые (balance, fin_results) + производные (ROA, ROE, CIR, OPERATING_MARGIN). Обычная VIEW — обновляется автоматически при refresh базовых MV.';
