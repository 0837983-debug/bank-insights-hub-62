-- Миграция 082: Гибкие периоды (1..6), минимальный шаг — месяц, глубина 3 года
--
-- Что делает:
--   1. Пересоздаёт mart.v_p_dates — теперь выдаёт флаги is_p1..is_p6
--      для шести последних месяцев (по убыванию даты).
--   2. Обновляет конфиг header_dates — возвращает все шесть флагов.
--   3. Обновляет конфиги таблиц (assets_table, liabilities_table,
--      fin_results_table, table_balance, table_balance_assets,
--      table_balance_liabilities, table_pnl) и kpis: агрегации case_agg
--      и условия period_date IN расширены с p1..p3 до p1..p6.
--
-- Примечание: бэкенд (queryBuilder/builder.ts) умеет пропускать
-- непереданные периодные параметры, поэтому пользователь может выбрать
-- любое число периодов от 1 до 6 — неиспользуемые просто не передаются.
-- Дата: 2026-08-13

-- ============================================
-- 1. VIEW ДАТ ПЕРИОДОВ (6 последних месяцев)
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
  (r.rn = 3) AS is_p3,
  (r.rn = 4) AS is_p4,
  (r.rn = 5) AS is_p5,
  (r.rn = 6) AS is_p6
FROM ranked r
ORDER BY r.period_date DESC;

COMMENT ON VIEW mart.v_p_dates IS 'Список дат периодов из v_kpi_all с флагами p1..p6 (6 последних месяцев)';
COMMENT ON COLUMN mart.v_p_dates.is_p1 IS 'Последняя дата (p1)';
COMMENT ON COLUMN mart.v_p_dates.is_p2 IS 'Предпоследняя дата (p2)';
COMMENT ON COLUMN mart.v_p_dates.is_p3 IS 'Третья с конца дата (p3)';
COMMENT ON COLUMN mart.v_p_dates.is_p4 IS 'Четвёртая с конца дата (p4)';
COMMENT ON COLUMN mart.v_p_dates.is_p5 IS 'Пятая с конца дата (p5)';
COMMENT ON COLUMN mart.v_p_dates.is_p6 IS 'Шестая с конца дата (p6)';

-- ============================================
-- 2. КОНФИГ header_dates — возврат шести флагов
-- ============================================

UPDATE config.component_queries
SET config_json = '{
  "from": {"schema": "mart", "table": "v_p_dates"},
  "select": [
    {"type": "column", "field": "period_date", "as": "periodDate"},
    {"type": "column", "field": "is_p1", "as": "isP1"},
    {"type": "column", "field": "is_p2", "as": "isP2"},
    {"type": "column", "field": "is_p3", "as": "isP3"},
    {"type": "column", "field": "is_p4", "as": "isP4"},
    {"type": "column", "field": "is_p5", "as": "isP5"},
    {"type": "column", "field": "is_p6", "as": "isP6"}
  ],
  "params": {},
  "paramTypes": {},
  "orderBy": [{"field": "period_date", "direction": "desc"}]
}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'header_dates';

-- ============================================
-- 3. КОНФИГИ ТАБЛИЦ И KPI — расширение до 6 периодов
-- ============================================

-- Утилитарный JSON-фрагмент: 6 агрегаций case_agg по периодам.
-- Значения колонок: value, previousValue, ytdValue (p1..p3) и p4Value..p6Value.

-- 3.1. assets_table
UPDATE config.component_queries
SET config_json = '{
  "from": {"schema": "mart", "table": "balance"},
  "select": [
    {"type": "column", "field": "class"},
    {"type": "column", "field": "section"},
    {"type": "column", "field": "item"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p1"}, "then": {"field": "value"}, "else": null, "as": "value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p2"}, "then": {"field": "value"}, "else": null, "as": "previousValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p3"}, "then": {"field": "value"}, "else": null, "as": "ytdValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p4"}, "then": {"field": "value"}, "else": null, "as": "p4Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p5"}, "then": {"field": "value"}, "else": null, "as": "p5Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p6"}, "then": {"field": "value"}, "else": null, "as": "p6Value"}
  ],
  "where": {
    "op": "and",
    "items": [
      {"field": "tech_class", "op": "in", "value": ["ASSETS", "АКТИВЫ", "assets"]},
      {"field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3", ":p4", ":p5", ":p6"]}
    ]
  },
  "groupBy": ["class", "section", "item"],
  "orderBy": [{"field": "class", "direction": "asc"}, {"field": "section", "direction": "asc"}, {"field": "item", "direction": "asc"}],
  "limit": 5000,
  "offset": 0,
  "params": {"p1": "2026-04-01", "p2": "2026-03-01", "p3": "2026-02-01", "p4": "2026-01-01", "p5": "2025-12-01", "p6": "2025-11-01"},
  "paramTypes": {"p1": "date", "p2": "date", "p3": "date", "p4": "date", "p5": "date", "p6": "date"}
}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'assets_table';

-- 3.2. liabilities_table
UPDATE config.component_queries
SET config_json = '{
  "from": {"schema": "mart", "table": "balance"},
  "select": [
    {"type": "column", "field": "class"},
    {"type": "column", "field": "section"},
    {"type": "column", "field": "item"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p1"}, "then": {"field": "value"}, "else": null, "as": "value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p2"}, "then": {"field": "value"}, "else": null, "as": "previousValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p3"}, "then": {"field": "value"}, "else": null, "as": "ytdValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p4"}, "then": {"field": "value"}, "else": null, "as": "p4Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p5"}, "then": {"field": "value"}, "else": null, "as": "p5Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p6"}, "then": {"field": "value"}, "else": null, "as": "p6Value"}
  ],
  "where": {
    "op": "and",
    "items": [
      {"field": "tech_class", "op": "in", "value": ["LIABILITIES", "ПАССИВЫ", "liabilities"]},
      {"field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3", ":p4", ":p5", ":p6"]}
    ]
  },
  "groupBy": ["class", "section", "item"],
  "orderBy": [{"field": "class", "direction": "asc"}, {"field": "section", "direction": "asc"}, {"field": "item", "direction": "asc"}],
  "limit": 5000,
  "offset": 0,
  "params": {"p1": "2026-04-01", "p2": "2026-03-01", "p3": "2026-02-01", "p4": "2026-01-01", "p5": "2025-12-01", "p6": "2025-11-01"},
  "paramTypes": {"p1": "date", "p2": "date", "p3": "date", "p4": "date", "p5": "date", "p6": "date"}
}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'liabilities_table';

-- 3.3. fin_results_table
UPDATE config.component_queries
SET config_json = '{
  "from": {"schema": "mart", "table": "fin_results"},
  "select": [
    {"type": "column", "field": "class"},
    {"type": "column", "field": "category"},
    {"type": "column", "field": "item"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p1"}, "then": {"field": "value"}, "else": null, "as": "value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p2"}, "then": {"field": "value"}, "else": null, "as": "previousValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p3"}, "then": {"field": "value"}, "else": null, "as": "ytdValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p4"}, "then": {"field": "value"}, "else": null, "as": "p4Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p5"}, "then": {"field": "value"}, "else": null, "as": "p5Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p6"}, "then": {"field": "value"}, "else": null, "as": "p6Value"}
  ],
  "where": {
    "op": "and",
    "items": [
      {"field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3", ":p4", ":p5", ":p6"]}
    ]
  },
  "groupBy": ["class", "category", "item"],
  "orderBy": [{"field": "class", "direction": "asc"}, {"field": "category", "direction": "asc"}, {"field": "item", "direction": "asc"}],
  "limit": 5000,
  "offset": 0,
  "params": {"p1": "2026-04-01", "p2": "2026-03-01", "p3": "2026-02-01", "p4": "2026-01-01", "p5": "2025-12-01", "p6": "2025-11-01"},
  "paramTypes": {"p1": "date", "p2": "date", "p3": "date", "p4": "date", "p5": "date", "p6": "date"}
}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'fin_results_table';

-- 3.4. table_balance
UPDATE config.component_queries
SET config_json = '{
  "from": {"schema": "mart", "table": "balance"},
  "select": [
    {"type": "column", "field": "class"},
    {"type": "column", "field": "section"},
    {"type": "column", "field": "item"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p1"}, "then": {"field": "value"}, "else": null, "as": "value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p2"}, "then": {"field": "value"}, "else": null, "as": "previousValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p3"}, "then": {"field": "value"}, "else": null, "as": "ytdValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p4"}, "then": {"field": "value"}, "else": null, "as": "p4Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p5"}, "then": {"field": "value"}, "else": null, "as": "p5Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p6"}, "then": {"field": "value"}, "else": null, "as": "p6Value"}
  ],
  "where": {
    "op": "and",
    "items": [
      {"field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3", ":p4", ":p5", ":p6"]}
    ]
  },
  "groupBy": ["class", "section", "item"],
  "orderBy": [{"field": "class", "direction": "asc"}, {"field": "section", "direction": "asc"}, {"field": "item", "direction": "asc"}],
  "limit": 5000,
  "offset": 0,
  "params": {"p1": "2026-04-01", "p2": "2026-03-01", "p3": "2026-02-01", "p4": "2026-01-01", "p5": "2025-12-01", "p6": "2025-11-01"},
  "paramTypes": {"p1": "date", "p2": "date", "p3": "date", "p4": "date", "p5": "date", "p6": "date"}
}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'table_balance';

-- 3.5. table_balance_assets
UPDATE config.component_queries
SET config_json = '{
  "from": {"schema": "mart", "table": "balance"},
  "select": [
    {"type": "column", "field": "class"},
    {"type": "column", "field": "section"},
    {"type": "column", "field": "item"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p1"}, "then": {"field": "value"}, "else": null, "as": "value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p2"}, "then": {"field": "value"}, "else": null, "as": "previousValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p3"}, "then": {"field": "value"}, "else": null, "as": "ytdValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p4"}, "then": {"field": "value"}, "else": null, "as": "p4Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p5"}, "then": {"field": "value"}, "else": null, "as": "p5Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p6"}, "then": {"field": "value"}, "else": null, "as": "p6Value"}
  ],
  "where": {
    "op": "and",
    "items": [
      {"field": "tech_class", "op": "=", "value": "АКТИВЫ"},
      {"field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3", ":p4", ":p5", ":p6"]}
    ]
  },
  "groupBy": ["class", "section", "item"],
  "orderBy": [{"field": "class", "direction": "asc"}, {"field": "section", "direction": "asc"}, {"field": "item", "direction": "asc"}],
  "limit": 5000,
  "offset": 0,
  "params": {"p1": "2026-04-01", "p2": "2026-03-01", "p3": "2026-02-01", "p4": "2026-01-01", "p5": "2025-12-01", "p6": "2025-11-01"},
  "paramTypes": {"p1": "date", "p2": "date", "p3": "date", "p4": "date", "p5": "date", "p6": "date"}
}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'table_balance_assets';

-- 3.6. table_balance_liabilities
UPDATE config.component_queries
SET config_json = '{
  "from": {"schema": "mart", "table": "balance"},
  "select": [
    {"type": "column", "field": "class"},
    {"type": "column", "field": "section"},
    {"type": "column", "field": "item"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p1"}, "then": {"field": "value"}, "else": null, "as": "value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p2"}, "then": {"field": "value"}, "else": null, "as": "previousValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p3"}, "then": {"field": "value"}, "else": null, "as": "ytdValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p4"}, "then": {"field": "value"}, "else": null, "as": "p4Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p5"}, "then": {"field": "value"}, "else": null, "as": "p5Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p6"}, "then": {"field": "value"}, "else": null, "as": "p6Value"}
  ],
  "where": {
    "op": "and",
    "items": [
      {"field": "tech_class", "op": "=", "value": "ПАССИВЫ"},
      {"field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3", ":p4", ":p5", ":p6"]}
    ]
  },
  "groupBy": ["class", "section", "item"],
  "orderBy": [{"field": "class", "direction": "asc"}, {"field": "section", "direction": "asc"}, {"field": "item", "direction": "asc"}],
  "limit": 5000,
  "offset": 0,
  "params": {"p1": "2026-04-01", "p2": "2026-03-01", "p3": "2026-02-01", "p4": "2026-01-01", "p5": "2025-12-01", "p6": "2025-11-01"},
  "paramTypes": {"p1": "date", "p2": "date", "p3": "date", "p4": "date", "p5": "date", "p6": "date"}
}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'table_balance_liabilities';

-- 3.7. table_pnl (финансовые результаты)
UPDATE config.component_queries
SET config_json = '{
  "from": {"schema": "mart", "table": "fin_results"},
  "select": [
    {"type": "column", "field": "class"},
    {"type": "column", "field": "category"},
    {"type": "column", "field": "item"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p1"}, "then": {"field": "value"}, "else": null, "as": "value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p2"}, "then": {"field": "value"}, "else": null, "as": "previousValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p3"}, "then": {"field": "value"}, "else": null, "as": "ytdValue"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p4"}, "then": {"field": "value"}, "else": null, "as": "p4Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p5"}, "then": {"field": "value"}, "else": null, "as": "p5Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p6"}, "then": {"field": "value"}, "else": null, "as": "p6Value"}
  ],
  "where": {
    "op": "and",
    "items": [
      {"field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3", ":p4", ":p5", ":p6"]}
    ]
  },
  "groupBy": ["class", "category", "item"],
  "orderBy": [{"field": "class", "direction": "asc"}, {"field": "category", "direction": "asc"}, {"field": "item", "direction": "asc"}],
  "limit": 5000,
  "offset": 0,
  "params": {"p1": "2026-04-01", "p2": "2026-03-01", "p3": "2026-02-01", "p4": "2026-01-01", "p5": "2025-12-01", "p6": "2025-11-01"},
  "paramTypes": {"p1": "date", "p2": "date", "p3": "date", "p4": "date", "p5": "date", "p6": "date"}
}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'table_pnl';

-- 3.8. kpis (показатели для карточек)
UPDATE config.component_queries
SET config_json = '{
  "from": {"schema": "mart", "table": "v_kpi_all"},
  "select": [
    {"type": "column", "field": "component_id", "as": "componentId"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p1"}, "then": {"field": "value"}, "else": null, "as": "value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p2"}, "then": {"field": "value"}, "else": null, "as": "p2Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p3"}, "then": {"field": "value"}, "else": null, "as": "p3Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p4"}, "then": {"field": "value"}, "else": null, "as": "p4Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p5"}, "then": {"field": "value"}, "else": null, "as": "p5Value"},
    {"type": "case_agg", "func": "sum", "when": {"field": "period_date", "op": "=", "value": ":p6"}, "then": {"field": "value"}, "else": null, "as": "p6Value"}
  ],
  "where": {
    "op": "and",
    "items": [
      {"field": "layout_id", "op": "=", "value": ":layout_id"},
      {"field": "component_id", "op": "is_not_null"},
      {"field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3", ":p4", ":p5", ":p6"]}
    ]
  },
  "groupBy": ["component_id"],
  "orderBy": [{"field": "component_id", "direction": "asc"}],
  "params": {"p1": "2026-04-01", "p2": "2026-03-01", "p3": "2026-02-01", "p4": "2026-01-01", "p5": "2025-12-01", "p6": "2025-11-01", "layout_id": "main_dashboard"},
  "paramTypes": {"p1": "date", "p2": "date", "p3": "date", "p4": "date", "p5": "date", "p6": "date", "layout_id": "string"}
}'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'kpis';
