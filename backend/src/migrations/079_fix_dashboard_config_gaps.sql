-- 079_fix_dashboard_config_gaps.sql
-- Исправляет gap'ы конфигурации дашборда после Docker bootstrap:
-- 1) table_balance: wrap_json = TRUE (наследие assets_table / 019→065)
-- 2) fin_results_table: алиасы ppValue/pyValue → previousValue/ytdValue (единый контракт с table_pnl/table_balance)
-- 3) fin_results_table: component_fields (зеркало table_pnl из 075)

BEGIN;

-- 1.1) wrap_json для table_balance
UPDATE config.component_queries
SET
  wrap_json = TRUE,
  updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'table_balance'
  AND deleted_at IS NULL;

-- 1.2) Выровнять алиасы в fin_results_table query config
UPDATE config.component_queries
SET
  config_json = '{
    "from": {
      "schema": "mart",
      "table": "fin_results"
    },
    "select": [
      { "type": "column", "field": "class" },
      { "type": "column", "field": "category" },
      { "type": "column", "field": "item" },
      { "type": "column", "field": "subitem" },
      {
        "type": "case_agg",
        "func": "sum",
        "when": { "field": "period_date", "op": "=", "value": ":p1" },
        "then": { "field": "value" },
        "else": null,
        "as": "value"
      },
      {
        "type": "case_agg",
        "func": "sum",
        "when": { "field": "period_date", "op": "=", "value": ":p2" },
        "then": { "field": "value" },
        "else": null,
        "as": "previousValue"
      },
      {
        "type": "case_agg",
        "func": "sum",
        "when": { "field": "period_date", "op": "=", "value": ":p3" },
        "then": { "field": "value" },
        "else": null,
        "as": "ytdValue"
      }
    ],
    "where": {
      "op": "and",
      "items": [
        { "field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3"] }
      ]
    },
    "groupBy": ["class", "category", "item", "subitem"],
    "orderBy": [
      { "field": "class", "direction": "asc" },
      { "field": "value", "direction": "desc", "nulls": "last" }
    ],
    "limit": 1000,
    "offset": 0,
    "params": {
      "p1": "2025-12-31",
      "p2": "2025-11-30",
      "p3": "2024-12-31"
    },
    "paramTypes": {
      "p1": "date",
      "p2": "date",
      "p3": "date"
    }
  }'::jsonb,
  updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'fin_results_table'
  AND deleted_at IS NULL;

-- 1.3) component_fields для fin_results_table
INSERT INTO config.component_fields (
  component_id,
  field_id,
  parent_field_id,
  field_type,
  data_type,
  label,
  format_id,
  calculation_config,
  display_group,
  is_default,
  display_order,
  is_visible,
  is_active
)
SELECT * FROM (
  VALUES
    ('fin_results_table', 'class', NULL, 'dimension', 'string', 'Класс', NULL, NULL, NULL, FALSE, 1, TRUE, TRUE),
    ('fin_results_table', 'category', NULL, 'dimension', 'string', 'Категория', NULL, NULL, NULL, FALSE, 2, TRUE, TRUE),
    ('fin_results_table', 'item', NULL, 'dimension', 'string', 'Статья', NULL, NULL, NULL, FALSE, 3, TRUE, TRUE),
    ('fin_results_table', 'subitem', NULL, 'dimension', 'string', 'Подстатья', NULL, NULL, NULL, FALSE, 4, TRUE, TRUE),
    ('fin_results_table', 'value', NULL, 'measure', 'numeric', 'Значение', 'currency_rub', NULL, NULL, FALSE, 5, TRUE, TRUE),
    ('fin_results_table', 'ppChange', 'value', 'calculated', 'numeric', 'P/P', 'percent', '{"type":"percent_change","current":"value","base":"previousValue"}'::jsonb, 'percent', TRUE, 1, TRUE, TRUE),
    ('fin_results_table', 'ytdChange', 'value', 'calculated', 'numeric', 'YTD', 'percent', '{"type":"percent_change","current":"value","base":"ytdValue"}'::jsonb, 'percent', TRUE, 2, TRUE, TRUE),
    ('fin_results_table', 'ppChangeAbsolute', 'value', 'calculated', 'numeric', 'P/P abs', 'currency_rub', '{"type":"diff","minuend":"value","subtrahend":"previousValue"}'::jsonb, 'absolute', FALSE, 3, TRUE, TRUE),
    ('fin_results_table', 'ytdChangeAbsolute', 'value', 'calculated', 'numeric', 'YTD abs', 'currency_rub', '{"type":"diff","minuend":"value","subtrahend":"ytdValue"}'::jsonb, 'absolute', FALSE, 4, TRUE, TRUE)
) AS v(
  component_id,
  field_id,
  parent_field_id,
  field_type,
  data_type,
  label,
  format_id,
  calculation_config,
  display_group,
  is_default,
  display_order,
  is_visible,
  is_active
)
WHERE NOT EXISTS (
  SELECT 1
  FROM config.component_fields cf
  WHERE cf.component_id = v.component_id
    AND cf.field_id = v.field_id
    AND cf.deleted_at IS NULL
);

UPDATE config.component_fields
SET
  parent_field_id = CASE
    WHEN field_id IN ('ppChange', 'ytdChange', 'ppChangeAbsolute', 'ytdChangeAbsolute') THEN 'value'
    ELSE NULL
  END,
  field_type = CASE
    WHEN field_id = 'value' THEN 'measure'
    WHEN field_id IN ('class', 'category', 'item', 'subitem') THEN 'dimension'
    ELSE 'calculated'
  END,
  data_type = CASE
    WHEN field_id IN ('class', 'category', 'item', 'subitem') THEN 'string'
    ELSE 'numeric'
  END,
  format_id = CASE
    WHEN field_id = 'value' THEN 'currency_rub'
    WHEN field_id IN ('ppChange', 'ytdChange') THEN 'percent'
    WHEN field_id IN ('ppChangeAbsolute', 'ytdChangeAbsolute') THEN 'currency_rub'
    ELSE format_id
  END,
  calculation_config = CASE field_id
    WHEN 'ppChange' THEN '{"type":"percent_change","current":"value","base":"previousValue"}'::jsonb
    WHEN 'ytdChange' THEN '{"type":"percent_change","current":"value","base":"ytdValue"}'::jsonb
    WHEN 'ppChangeAbsolute' THEN '{"type":"diff","minuend":"value","subtrahend":"previousValue"}'::jsonb
    WHEN 'ytdChangeAbsolute' THEN '{"type":"diff","minuend":"value","subtrahend":"ytdValue"}'::jsonb
    ELSE calculation_config
  END,
  display_group = CASE
    WHEN field_id IN ('ppChange', 'ytdChange') THEN 'percent'
    WHEN field_id IN ('ppChangeAbsolute', 'ytdChangeAbsolute') THEN 'absolute'
    ELSE NULL
  END,
  is_default = CASE
    WHEN field_id IN ('ppChange', 'ytdChange') THEN TRUE
    WHEN field_id IN ('ppChangeAbsolute', 'ytdChangeAbsolute') THEN FALSE
    ELSE FALSE
  END,
  is_visible = TRUE,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'fin_results_table'
  AND field_id IN (
    'class', 'category', 'item', 'subitem',
    'value',
    'ppChange', 'ytdChange', 'ppChangeAbsolute', 'ytdChangeAbsolute'
  );

COMMIT;
