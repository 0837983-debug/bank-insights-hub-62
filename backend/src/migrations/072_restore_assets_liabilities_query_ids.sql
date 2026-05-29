-- 072_restore_assets_liabilities_query_ids.sql
-- Restores API-compatible query IDs assets_table/liabilities_table
-- as aliases to current mart.balance contract.

BEGIN;

INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'assets_table',
  'Данные таблицы активов (API compatibility)',
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
        { "field": "tech_class", "op": "in", "value": ["ASSETS", "АКТИВЫ", "assets"] },
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

INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'liabilities_table',
  'Данные таблицы пассивов (API compatibility)',
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
        { "field": "tech_class", "op": "in", "value": ["LIABILITIES", "ПАССИВЫ", "liabilities"] },
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

COMMIT;
