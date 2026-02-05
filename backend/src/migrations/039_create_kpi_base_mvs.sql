-- 039_create_kpi_base_mvs.sql
-- Базовые materialized views для KPI карточек

-- MV для баланса
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_balance;

CREATE MATERIALIZED VIEW mart.mv_kpi_balance AS
-- Уровень class
SELECT period_date, class AS kpi_name, SUM(value) AS value
FROM mart.balance
GROUP BY period_date, class

UNION ALL

-- Уровень class::section
SELECT period_date, class || '::' || section AS kpi_name, SUM(value) AS value
FROM mart.balance
WHERE section IS NOT NULL
GROUP BY period_date, class, section

ORDER BY period_date;

-- Индекс для быстрого поиска
CREATE INDEX idx_mv_kpi_balance_period_name ON mart.mv_kpi_balance(period_date, kpi_name);

-- MV для финреза
DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_fin_results;

CREATE MATERIALIZED VIEW mart.mv_kpi_fin_results AS
-- Уровень class
SELECT period_date, class AS kpi_name, SUM(value) AS value
FROM mart.fin_results
GROUP BY period_date, class

UNION ALL

-- Уровень class::category
SELECT period_date, class || '::' || category AS kpi_name, SUM(value) AS value
FROM mart.fin_results
WHERE category IS NOT NULL
GROUP BY period_date, class, category

ORDER BY period_date;

-- Индекс для быстрого поиска
CREATE INDEX idx_mv_kpi_fin_results_period_name ON mart.mv_kpi_fin_results(period_date, kpi_name);

-- Комментарии
COMMENT ON MATERIALIZED VIEW mart.mv_kpi_balance IS 'Агрегаты баланса для KPI карточек (period_date + kpi_name)';
COMMENT ON MATERIALIZED VIEW mart.mv_kpi_fin_results IS 'Агрегаты финреза для KPI карточек (period_date + kpi_name)';
