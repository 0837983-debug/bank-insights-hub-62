-- 075_add_table_pnl_configs.sql
-- Добавляет конфиги для table_pnl:
-- - query_id в config.component_queries
-- - компонент table_pnl в config.components
-- - привязка к section_financial_results в layout
-- - поля таблицы в config.component_fields

BEGIN;

-- 1) SQL Builder query config
INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'table_pnl',
  'Данные таблицы P&L',
  '{
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
      { "field": "value", "direction": "desc" }
    ],
    "limit": 5000,
    "offset": 0,
    "params": {
      "p1": "2026-04-01",
      "p2": "2026-03-01",
      "p3": "2025-12-01"
    },
    "paramTypes": {
      "p1": "date",
      "p2": "date",
      "p3": "date"
    }
  }'::jsonb,
  TRUE,
  TRUE
)
ON CONFLICT (query_id) DO UPDATE
SET
  title = EXCLUDED.title,
  config_json = EXCLUDED.config_json,
  wrap_json = EXCLUDED.wrap_json,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP;

-- 2) Table component
INSERT INTO config.components (
  id,
  component_type,
  title,
  label,
  query_id,
  data_source_key,
  is_active
)
VALUES (
  'table_pnl',
  'table',
  'P&L',
  'P&L',
  'table_pnl',
  'table_pnl',
  TRUE
)
ON CONFLICT (id) DO UPDATE
SET
  component_type = EXCLUDED.component_type,
  title = EXCLUDED.title,
  label = EXCLUDED.label,
  query_id = EXCLUDED.query_id,
  data_source_key = EXCLUDED.data_source_key,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP;

-- 3) Layout mapping
INSERT INTO config.layout_component_mapping (
  layout_id,
  component_id,
  parent_component_id,
  display_order,
  is_visible
)
SELECT
  'main_dashboard',
  'table_pnl',
  'section_financial_results',
  11,
  TRUE
WHERE EXISTS (
  SELECT 1
  FROM config.components c
  WHERE c.id = 'section_financial_results'
    AND c.deleted_at IS NULL
    AND c.is_active = TRUE
)
AND NOT EXISTS (
  SELECT 1
  FROM config.layout_component_mapping lcm
  WHERE lcm.layout_id = 'main_dashboard'
    AND lcm.component_id = 'table_pnl'
    AND lcm.parent_component_id = 'section_financial_results'
    AND lcm.deleted_at IS NULL
);

UPDATE config.layout_component_mapping
SET
  is_visible = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE layout_id = 'main_dashboard'
  AND component_id = 'table_pnl'
  AND parent_component_id = 'section_financial_results';

-- 4) Component fields
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
    ('table_pnl', 'class', NULL, 'dimension', 'string', 'Класс', NULL, NULL, NULL, FALSE, 1, TRUE, TRUE),
    ('table_pnl', 'category', NULL, 'dimension', 'string', 'Категория', NULL, NULL, NULL, FALSE, 2, TRUE, TRUE),
    ('table_pnl', 'item', NULL, 'dimension', 'string', 'Статья', NULL, NULL, NULL, FALSE, 3, TRUE, TRUE),
    ('table_pnl', 'subitem', NULL, 'dimension', 'string', 'Подстатья', NULL, NULL, NULL, FALSE, 4, TRUE, TRUE),
    ('table_pnl', 'value', NULL, 'measure', 'numeric', 'Значение', 'currency_rub', NULL, NULL, FALSE, 5, TRUE, TRUE),
    ('table_pnl', 'ppChange', 'value', 'calculated', 'numeric', 'P/P', 'percent', '{"type":"percent_change","current":"value","base":"previousValue"}'::jsonb, 'percent', TRUE, 1, TRUE, TRUE),
    ('table_pnl', 'ytdChange', 'value', 'calculated', 'numeric', 'YTD', 'percent', '{"type":"percent_change","current":"value","base":"ytdValue"}'::jsonb, 'percent', TRUE, 2, TRUE, TRUE),
    ('table_pnl', 'ppChangeAbsolute', 'value', 'calculated', 'numeric', 'P/P abs', 'currency_rub', '{"type":"diff","minuend":"value","subtrahend":"previousValue"}'::jsonb, 'absolute', FALSE, 3, TRUE, TRUE),
    ('table_pnl', 'ytdChangeAbsolute', 'value', 'calculated', 'numeric', 'YTD abs', 'currency_rub', '{"type":"diff","minuend":"value","subtrahend":"ytdValue"}'::jsonb, 'absolute', FALSE, 4, TRUE, TRUE)
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

-- Normalize fields if already existed
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
WHERE component_id = 'table_pnl'
  AND field_id IN (
    'class', 'category', 'item', 'subitem',
    'value',
    'ppChange', 'ytdChange', 'ppChangeAbsolute', 'ytdChangeAbsolute'
  );

COMMIT;
