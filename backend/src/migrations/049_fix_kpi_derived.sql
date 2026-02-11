-- 049_fix_kpi_derived.sql
-- Исправление формул ROA/ROE:
-- 1. Правильные kpi_name: АКТИВЫ (не ASSETS), КАПИТАЛ (не CAPITAL)
-- 2. Формулы: * -1 * 12 для годовых % (прибыль отрицательная при убытке)

DROP MATERIALIZED VIEW IF EXISTS mart.mv_kpi_derived CASCADE;

CREATE MATERIALIZED VIEW mart.mv_kpi_derived AS

-- ROA = NET_PROFIT / ASSETS * -1 * 12 (годовые %)
-- kpi_name в mv_kpi_balance = 'АКТИВЫ'
SELECT
  fr.period_date,
  'ROA' AS kpi_name,
  CASE WHEN COALESCE(b.value, 0) != 0
    THEN fr.value / b.value * -1 * 12
    ELSE 0
  END AS value
FROM mart.mv_kpi_fin_results fr
JOIN mart.mv_kpi_balance b
  ON fr.period_date = b.period_date AND b.kpi_name = 'АКТИВЫ'
WHERE fr.kpi_name = 'NET_PROFIT'

UNION ALL

-- ROE = NET_PROFIT / CAPITAL * 12 (годовые %)
-- kpi_name в mv_kpi_balance = 'КАПИТАЛ'
-- КАПИТАЛ положительный в БД (в отличие от АКТИВОВ), поэтому * -1 не нужен
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

-- CIR = |ОПЕРАЦИОННЫЕ_РАСХОДЫ| / TOTAL_OPERATING_INCOME (без изменений)
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

-- Operating Margin = OPERATING_PROFIT / TOTAL_OPERATING_INCOME (без изменений)
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
