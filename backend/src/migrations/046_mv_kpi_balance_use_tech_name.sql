-- 046_mv_kpi_balance_use_tech_name.sql
-- Перевод mv_kpi_balance на tech_class/tech_section

DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_balance CASCADE;

CREATE MATERIALIZED VIEW mart.mv_kpi_balance AS

-- Уровень tech_class
SELECT period_date, tech_class AS kpi_name, SUM(value) AS value
FROM mart.balance
GROUP BY period_date, tech_class

UNION ALL

-- Уровень tech_class::tech_section
SELECT period_date, tech_class || '::' || tech_section AS kpi_name, SUM(value) AS value
FROM mart.balance
WHERE tech_section IS NOT NULL
GROUP BY period_date, tech_class, tech_section

ORDER BY period_date;

CREATE INDEX idx_mv_kpi_balance_period_name ON mart.mv_kpi_balance(period_date, kpi_name);

COMMENT ON MATERIALIZED VIEW mart.mv_kpi_balance IS 'Агрегаты баланса: по tech_class, tech_class::tech_section';
