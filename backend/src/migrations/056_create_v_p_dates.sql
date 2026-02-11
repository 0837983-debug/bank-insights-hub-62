-- Миграция 056: Создание VIEW mart.v_p_dates для дат периодов
-- Источник дат — mart.v_kpi_all (distinct period_date)
-- Флаги: is_p1 (последняя), is_p2 (предпоследняя), is_p3 (последняя дата предыдущего года)
-- Дата: 2026-02-09

-- ============================================
-- VIEW ДЛЯ ДАТ ПЕРИОДОВ
-- ============================================

CREATE OR REPLACE VIEW mart.v_p_dates AS
WITH dates AS (
  SELECT DISTINCT period_date
  FROM mart.v_kpi_all
  ORDER BY period_date DESC
),
ranked AS (
  SELECT 
    period_date,
    ROW_NUMBER() OVER (ORDER BY period_date DESC) AS rn
  FROM dates
)
SELECT 
  r.period_date,
  (r.rn = 1) AS is_p1,
  (r.rn = 2) AS is_p2,
  (r.period_date = (
    SELECT MAX(period_date) 
    FROM dates 
    WHERE EXTRACT(YEAR FROM period_date) = EXTRACT(YEAR FROM (SELECT period_date FROM ranked WHERE rn = 1)) - 1
  )) AS is_p3
FROM ranked r
ORDER BY r.period_date DESC;

COMMENT ON VIEW mart.v_p_dates IS 'Список дат периодов из v_kpi_all с флагами p1/p2/p3';
COMMENT ON COLUMN mart.v_p_dates.period_date IS 'Дата периода';
COMMENT ON COLUMN mart.v_p_dates.is_p1 IS 'Последняя дата (p1)';
COMMENT ON COLUMN mart.v_p_dates.is_p2 IS 'Предпоследняя дата (p2)';
COMMENT ON COLUMN mart.v_p_dates.is_p3 IS 'Последняя дата предыдущего года (p3)';
