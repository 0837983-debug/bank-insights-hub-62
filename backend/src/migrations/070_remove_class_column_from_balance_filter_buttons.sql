-- 070_remove_class_column_from_balance_filter_buttons.sql
-- Убирает первый столбец class из query-конфигов кнопок "Активы" и "Пассивы".

BEGIN;

UPDATE config.component_queries
SET
  config_json = '{
    "from": {
      "schema": "mart",
      "table": "balance"
    },
    "select": [
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
        { "field": "tech_class", "op": "=", "value": "АКТИВЫ" },
        { "field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3"] }
      ]
    },
    "groupBy": ["section", "item"],
    "orderBy": [
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
  updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'table_balance_assets'
  AND deleted_at IS NULL;

UPDATE config.component_queries
SET
  config_json = '{
    "from": {
      "schema": "mart",
      "table": "balance"
    },
    "select": [
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
    "groupBy": ["section", "item"],
    "orderBy": [
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
  updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'table_balance_liabilities'
  AND deleted_at IS NULL;

COMMIT;
