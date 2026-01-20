-- Миграция 024: Добавление конфига query_id = layout для api/data
-- Дата: 2025-01-XX

-- ============================================
-- КОНФИГ: layout
-- ============================================
-- Конфиг для получения структуры sections через api/data
-- Использует view layout_sections_json_view, который уже содержит готовую структуру sections

INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'layout',
  'Структура sections для layout',
  '{
    "from": {
      "schema": "config",
      "table": "layout_sections_json_view"
    },
    "select": [
      {
        "type": "column",
        "field": "section",
        "as": "section"
      }
    ],
    "where": {
      "op": "and",
      "items": [
        { "field": "layout_id", "op": "=", "value": ":layout_id" }
      ]
    },
    "params": {
      "layout_id": "main_dashboard"
    },
    "paramTypes": {
      "layout_id": "string"
    }
  }'::jsonb,
  TRUE,
  TRUE
) ON CONFLICT (query_id) DO UPDATE SET
  config_json = EXCLUDED.config_json,
  wrap_json = EXCLUDED.wrap_json,
  updated_at = CURRENT_TIMESTAMP;
