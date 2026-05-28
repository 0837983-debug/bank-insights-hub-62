-- 069_add_liabilities_button_for_table_balance.sql
-- Добавляет кнопку "Пассивы" для table_balance с отдельным query_id.
-- Запрос кнопки повторяет table_balance, но с фильтром tech_class = 'ПАССИВЫ'.

BEGIN;

-- 1) Конфиг SQL Builder для кнопки "Пассивы"
INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'table_balance_liabilities',
  'Данные таблицы баланса: только пассивы',
  '{
    "from": {
      "schema": "mart",
      "table": "balance"
    },
    "select": [
      { "type": "column", "field": "class" },
      { "type": "column", "field": "section" },
      { "type": "column", "field": "item" },
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
        { "field": "tech_class", "op": "=", "value": "ПАССИВЫ" },
        { "field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3"] }
      ]
    },
    "groupBy": ["class", "section", "item"],
    "orderBy": [
      { "field": "class", "direction": "asc" },
      { "field": "section", "direction": "asc" },
      { "field": "item", "direction": "asc" }
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

-- 2) Компонент-кнопка
INSERT INTO config.components (
  id,
  component_type,
  title,
  label,
  description,
  query_id,
  data_source_key,
  settings,
  is_active
)
VALUES (
  'button_table_balance_liabilities',
  'button',
  'Пассивы',
  'Пассивы',
  'Фильтр таблицы баланса по tech_class = ПАССИВЫ',
  'table_balance_liabilities',
  'table_balance_liabilities',
  '{"fieldId":"tech_class","groupBy":"tech_class","fixedValue":"ПАССИВЫ"}'::jsonb,
  TRUE
)
ON CONFLICT (id) DO UPDATE
SET
  component_type = EXCLUDED.component_type,
  title = EXCLUDED.title,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  query_id = EXCLUDED.query_id,
  data_source_key = EXCLUDED.data_source_key,
  settings = EXCLUDED.settings,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP;

-- 3) Привязка кнопки к table_balance
INSERT INTO config.layout_component_mapping (
  layout_id,
  component_id,
  parent_component_id,
  display_order,
  is_visible
)
SELECT
  'main_dashboard',
  'button_table_balance_liabilities',
  'table_balance',
  2,
  TRUE
WHERE EXISTS (
  SELECT 1
  FROM config.components c
  WHERE c.id = 'table_balance'
    AND c.deleted_at IS NULL
    AND c.is_active = TRUE
)
AND NOT EXISTS (
  SELECT 1
  FROM config.layout_component_mapping lcm
  WHERE lcm.layout_id = 'main_dashboard'
    AND lcm.component_id = 'button_table_balance_liabilities'
    AND lcm.parent_component_id = 'table_balance'
    AND lcm.deleted_at IS NULL
);

UPDATE config.layout_component_mapping
SET
  is_visible = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE layout_id = 'main_dashboard'
  AND component_id = 'button_table_balance_liabilities'
  AND parent_component_id = 'table_balance';

COMMIT;
