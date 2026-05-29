-- 074_restore_class_and_cleanup_assets_liabilities.sql
-- 1) Возвращает class в table_balance (layout + query config)
-- 2) Удаляет из ods.balance строки с class = assets/liabilities
-- 3) Обновляет связанные materialized views

BEGIN;

-- Возвращаем поле class в конфиг таблицы
UPDATE config.component_fields
SET
  is_visible = TRUE,
  is_active = TRUE,
  deleted_at = NULL,
  field_type = 'dimension',
  data_type = 'string',
  display_order = 1,
  updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'table_balance'
  AND field_id = 'class';

-- Возвращаем class в SQL Builder-конфиг table_balance
UPDATE config.component_queries
SET
  config_json = '{
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
  updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'table_balance'
  AND deleted_at IS NULL;

-- Удаляем строки из ODS по class (как на скриншоте)
DELETE FROM ods.balance
WHERE deleted_at IS NULL
  AND lower(trim(class)) IN ('assets', 'liabilities');

-- Обновляем зависимые MV
REFRESH MATERIALIZED VIEW mart.balance;
REFRESH MATERIALIZED VIEW mart.mv_kpi_balance;
REFRESH MATERIALIZED VIEW mart.mv_kpi_derived;

COMMIT;
