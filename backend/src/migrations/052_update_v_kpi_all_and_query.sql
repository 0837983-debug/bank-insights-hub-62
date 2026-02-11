-- 052_update_v_kpi_all_and_query.sql
-- Обновление v_kpi_all с JOIN на components и обновление query config

-- 1. Пересоздать v_kpi_all с component_id
DROP VIEW IF EXISTS mart.v_kpi_all CASCADE;

CREATE VIEW mart.v_kpi_all AS
SELECT
  kpi.period_date,
  kpi.kpi_name,
  kpi.value,
  c.id AS component_id
FROM (
  SELECT period_date, kpi_name, value FROM mart.mv_kpi_balance
  UNION ALL
  SELECT period_date, kpi_name, value FROM mart.mv_kpi_fin_results
  UNION ALL
  SELECT period_date, kpi_name, value FROM mart.mv_kpi_derived
) kpi
LEFT JOIN config.components c
  ON c.data_source_key = kpi.kpi_name
  AND c.component_type = 'card'
  AND c.is_active = TRUE
  AND c.deleted_at IS NULL;

COMMENT ON VIEW mart.v_kpi_all IS 'Единая точка доступа для всех KPI с привязкой к карточкам через component_id';

-- 2. Обновить query config для kpis
UPDATE config.component_queries
SET config_json = '{
  "from": {
    "table": "v_kpi_all",
    "schema": "mart"
  },
  "where": {
    "op": "and",
    "items": [
      {
        "op": "is_not_null",
        "field": "component_id"
      },
      {
        "op": "in",
        "field": "period_date",
        "value": [":p1", ":p2", ":p3"]
      }
    ]
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
      "when": {"op": "=", "field": "period_date", "value": ":p1"},
      "then": {"field": "value"},
      "else": null,
      "as": "value"
    },
    {
      "type": "case_agg",
      "func": "sum",
      "when": {"op": "=", "field": "period_date", "value": ":p2"},
      "then": {"field": "value"},
      "else": null,
      "as": "p2Value"
    },
    {
      "type": "case_agg",
      "func": "sum",
      "when": {"op": "=", "field": "period_date", "value": ":p3"},
      "then": {"field": "value"},
      "else": null,
      "as": "p3Value"
    }
  ],
  "groupBy": ["component_id"],
  "orderBy": [{"field": "component_id", "direction": "asc"}],
  "paramTypes": {
    "p1": "date",
    "p2": "date",
    "p3": "date"
  }
}'::jsonb,
updated_at = NOW()
WHERE query_id = 'kpis';

-- 3. Удалить старую kpis_view
DROP VIEW IF EXISTS mart.kpis_view CASCADE;

-- Проверка
-- SELECT * FROM mart.v_kpi_all WHERE component_id IS NOT NULL LIMIT 10;
