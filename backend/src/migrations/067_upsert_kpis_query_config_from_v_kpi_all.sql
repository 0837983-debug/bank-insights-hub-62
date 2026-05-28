-- Миграция 067: Создать/обновить SQL Builder конфиг для KPI карточек
-- Источник данных: mart.v_kpi_all
-- Важно: query_id остаётся 'kpis', так как фронтенд использует его явно.

INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'kpis',
  'KPI метрики из mart.v_kpi_all',
  '{
    "from": {
      "schema": "mart",
      "table": "v_kpi_all"
    },
    "select": [
      {
        "type": "column",
        "field": "component_id",
        "as": "componentId"
      },
      {
        "type": "case_agg",
        "func": "sum",
        "when": {
          "field": "period_date",
          "op": "=",
          "value": ":p1"
        },
        "then": {
          "field": "value"
        },
        "else": null,
        "as": "value"
      },
      {
        "type": "case_agg",
        "func": "sum",
        "when": {
          "field": "period_date",
          "op": "=",
          "value": ":p2"
        },
        "then": {
          "field": "value"
        },
        "else": null,
        "as": "p2Value"
      },
      {
        "type": "case_agg",
        "func": "sum",
        "when": {
          "field": "period_date",
          "op": "=",
          "value": ":p3"
        },
        "then": {
          "field": "value"
        },
        "else": null,
        "as": "p3Value"
      }
    ],
    "where": {
      "op": "and",
      "items": [
        {
          "field": "layout_id",
          "op": "=",
          "value": ":layout_id"
        },
        {
          "field": "component_id",
          "op": "is_not_null"
        },
        {
          "field": "period_date",
          "op": "in",
          "value": [":p1", ":p2", ":p3"]
        }
      ]
    },
    "groupBy": ["component_id"],
    "orderBy": [
      {
        "field": "component_id",
        "direction": "asc"
      }
    ],
    "params": {
      "layout_id": "main_dashboard",
      "p1": "2025-12-31",
      "p2": "2025-11-30",
      "p3": "2024-12-31"
    },
    "paramTypes": {
      "layout_id": "string",
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
