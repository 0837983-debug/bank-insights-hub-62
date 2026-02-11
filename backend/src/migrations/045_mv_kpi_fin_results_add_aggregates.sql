-- 045_mv_kpi_fin_results_add_aggregates.sql
-- Добавление расчётных агрегатов: TOTAL_OPERATING_INCOME, OPERATING_PROFIT, NET_PROFIT

DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_fin_results CASCADE;

CREATE MATERIALIZED VIEW mart.mv_kpi_fin_results AS

-- Уровень tech_class
SELECT period_date, tech_class AS kpi_name, SUM(value) AS value
FROM mart.fin_results
GROUP BY period_date, tech_class

UNION ALL

-- Уровень tech_class::tech_category
SELECT period_date, tech_class || '::' || tech_category AS kpi_name, SUM(value) AS value
FROM mart.fin_results
WHERE tech_category IS NOT NULL
GROUP BY period_date, tech_class, tech_category

UNION ALL

-- ЧОД (Total Operating Income) = ЧПД + ЧКД + FX + ЧТД
SELECT period_date, 'TOTAL_OPERATING_INCOME' AS kpi_name, SUM(value) AS value
FROM mart.fin_results
WHERE tech_class IN ('ЧПД', 'ЧКД', 'FX', 'ЧТД')
GROUP BY period_date

UNION ALL

-- Операционная прибыль = ЧОД + ОПЕРАЦИОННЫЕ_РАСХОДЫ (расходы с минусом в базе)
SELECT period_date, 'OPERATING_PROFIT' AS kpi_name, SUM(value) AS value
FROM mart.fin_results
WHERE tech_class IN ('ЧПД', 'ЧКД', 'FX', 'ЧТД', 'ОПЕРАЦИОННЫЕ_РАСХОДЫ')
GROUP BY period_date

UNION ALL

-- Прибыль (Net Profit) = сумма всего финреза
SELECT period_date, 'NET_PROFIT' AS kpi_name, SUM(value) AS value
FROM mart.fin_results
GROUP BY period_date

ORDER BY period_date;

CREATE INDEX idx_mv_kpi_fin_results_period_name ON mart.mv_kpi_fin_results(period_date, kpi_name);

COMMENT ON MATERIALIZED VIEW mart.mv_kpi_fin_results IS 'Агрегаты финреза: по tech_class, tech_class::tech_category, + расчётные TOTAL_OPERATING_INCOME, OPERATING_PROFIT, NET_PROFIT';
