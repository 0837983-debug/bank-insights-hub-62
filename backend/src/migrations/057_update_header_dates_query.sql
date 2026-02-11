-- Миграция 057: Обновление config.component_queries для header_dates
-- Теперь SELECT из mart.v_p_dates с camelCase алиасами
-- Дата: 2026-02-09

-- ============================================
-- ОБНОВЛЕНИЕ QUERY ДЛЯ HEADER_DATES
-- ============================================

-- Обновляем конфиг header_dates для использования новой VIEW
UPDATE config.component_queries
SET 
  config_json = '{
    "from": {
      "schema": "mart",
      "table": "v_p_dates"
    },
    "select": [
      { "type": "column", "field": "period_date", "as": "periodDate" },
      { "type": "column", "field": "is_p1", "as": "isP1" },
      { "type": "column", "field": "is_p2", "as": "isP2" },
      { "type": "column", "field": "is_p3", "as": "isP3" }
    ],
    "orderBy": [
      { "field": "period_date", "direction": "desc" }
    ],
    "params": {},
    "paramTypes": {}
  }'::jsonb,
  wrap_json = TRUE,
  updated_at = CURRENT_TIMESTAMP
WHERE query_id = 'header_dates';
