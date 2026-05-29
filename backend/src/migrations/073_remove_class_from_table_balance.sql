-- 073_remove_class_from_table_balance.sql
-- Убирает class из table_balance:
-- 1) из структуры колонок компонента (layout)
-- 2) из SQL Builder конфига query_id='table_balance'

BEGIN;

-- 1) Скрываем/деактивируем поле class в table_balance
UPDATE config.component_fields
SET
  is_visible = FALSE,
  is_active = FALSE,
  deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
  updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'table_balance'
  AND field_id = 'class'
  AND deleted_at IS NULL;

-- 2) Обновляем query table_balance, чтобы не возвращать/группировать class
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
WHERE query_id = 'table_balance'
  AND deleted_at IS NULL;

COMMIT;
