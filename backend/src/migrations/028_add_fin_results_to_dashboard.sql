-- Миграция: Добавление таблицы Financial Results на дашборд
-- Дата: 2026-01-30
-- План: B2.1_FIN_RESULTS_DASHBOARD.md

-- 1. Добавить конфиг запроса для таблицы fin_results
INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'fin_results_table',
  'Данные таблицы финансовых результатов',
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
        "as": "ppValue"
      },
      {
        "type": "case_agg",
        "func": "sum",
        "when": { "field": "period_date", "op": "=", "value": ":p3" },
        "then": { "field": "value" },
        "else": null,
        "as": "pyValue"
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
  TRUE,
  TRUE
) ON CONFLICT (query_id) DO UPDATE SET 
  config_json = EXCLUDED.config_json,
  updated_at = CURRENT_TIMESTAMP;

-- 2. Добавить компонент таблицы
INSERT INTO config.components (
  id,
  component_type,
  title,
  label,
  data_source_key,
  is_active,
  created_by
) VALUES (
  'fin_results_table',
  'table',
  'Финансовые результаты',
  'ФинРез',
  'fin_results_table',
  TRUE,
  'system'
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  data_source_key = EXCLUDED.data_source_key,
  updated_at = CURRENT_TIMESTAMP;

-- 3. Добавить таблицу в секцию "Финансовые результаты" на дашборде
-- parent_component_id = 'section_financial_results' (найдено через SELECT)
INSERT INTO config.layout_component_mapping (
  id,
  layout_id,
  component_id,
  parent_component_id,
  display_order,
  is_visible,
  created_by
) 
SELECT 
  COALESCE(MAX(id), 0) + 1,
  'main_dashboard',
  'fin_results_table',
  'section_financial_results',
  10,
  TRUE,
  'system'
FROM config.layout_component_mapping
WHERE NOT EXISTS (
  SELECT 1 FROM config.layout_component_mapping 
  WHERE layout_id = 'main_dashboard' 
    AND component_id = 'fin_results_table'
    AND deleted_at IS NULL
);
