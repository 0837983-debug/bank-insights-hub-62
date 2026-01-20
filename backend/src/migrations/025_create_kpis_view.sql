-- Миграция 025: Создание view для KPI и конфига component_queries
-- Дата: 2025-01-XX

-- ============================================
-- VIEW: mart.kpis_view
-- ============================================
-- View для получения KPI карточек с учетом layout_id
-- Фильтрует только активные карточки, которые есть в layout
-- Возвращает данные из mart.kpi_metrics для использования с SQL Builder
-- SQL Builder будет делать агрегацию по периодам через CASE WHEN

DROP VIEW IF EXISTS mart.kpis_view CASCADE;
DROP VIEW IF EXISTS config.kpis_view CASCADE;

CREATE VIEW mart.kpis_view AS
SELECT
  lcm_distinct.layout_id,
  c.id AS component_id,
  c.title AS component_title,
  c.category AS component_category,
  km.period_date,
  km.value
FROM mart.kpi_metrics km
INNER JOIN config.components c ON km.component_id = c.id
INNER JOIN (
  -- Получаем уникальные комбинации (layout_id, component_id) из layout_component_mapping
  SELECT DISTINCT
    lcm.layout_id,
    lcm.component_id
  FROM config.layout_component_mapping lcm
  WHERE lcm.deleted_at IS NULL
    AND lcm.parent_component_id IS NOT NULL  -- Карточки должны быть внутри секций
) lcm_distinct ON c.id = lcm_distinct.component_id
WHERE c.deleted_at IS NULL
  AND c.is_active = TRUE
  AND c.component_type = 'card'
ORDER BY lcm_distinct.layout_id, c.id, km.period_date DESC;

COMMENT ON VIEW mart.kpis_view IS 'View для получения KPI карточек с учетом layout_id. Возвращает данные из mart.kpi_metrics для использования с SQL Builder через CASE WHEN агрегацию.';

-- ============================================
-- КОНФИГ: kpis
-- ============================================
-- Конфиг для получения KPI метрик через api/data
-- Использует view kpis_view и делает агрегацию по периодам через CASE WHEN
-- Возвращает структуру идентичную старому /api/kpis

INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'kpis',
  'KPI метрики для карточек',
  '{
    "from": {
      "schema": "mart",
      "table": "kpis_view"
    },
    "select": [
      {
        "type": "column",
        "field": "component_id"
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
        "as": "prev_period"
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
        "as": "prev_year"
      }
    ],
    "where": {
      "op": "and",
      "items": [
        { "field": "layout_id", "op": "=", "value": ":layout_id" },
        { "field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3"] }
      ]
    },
    "group_by": ["component_id"],
    "order_by": [
      { "field": "component_id", "direction": "asc" }
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
) ON CONFLICT (query_id) DO UPDATE SET
  config_json = EXCLUDED.config_json,
  wrap_json = EXCLUDED.wrap_json,
  updated_at = CURRENT_TIMESTAMP;
