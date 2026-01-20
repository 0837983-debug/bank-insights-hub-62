-- Миграция 019: Создание таблицы конфигов запросов для SQL Builder
-- Создает таблицу config.component_queries для хранения JSON-конфигов SQL запросов
-- Дата: 2025-01-XX

-- ============================================
-- ТАБЛИЦА СХЕМЫ CONFIG
-- ============================================

-- Таблица: config.component_queries
-- Конфиги SQL запросов для SQL Builder
CREATE TABLE IF NOT EXISTS config.component_queries (
  id SERIAL PRIMARY KEY,
  query_id VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(500),
  config_json JSONB NOT NULL,
  wrap_json BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

COMMENT ON TABLE config.component_queries IS 'Конфиги SQL запросов для SQL Builder - единый источник конфигов для генерации SQL';
COMMENT ON COLUMN config.component_queries.query_id IS 'Уникальный идентификатор запроса (например, header_dates, assets_table)';
COMMENT ON COLUMN config.component_queries.title IS 'Название запроса для отображения';
COMMENT ON COLUMN config.component_queries.config_json IS 'JSON конфиг для SQL Builder в формате QueryConfig';
COMMENT ON COLUMN config.component_queries.wrap_json IS 'Нужно ли оборачивать результат в jsonb_agg (для будущего использования)';
COMMENT ON COLUMN config.component_queries.is_active IS 'Активен ли запрос';
COMMENT ON COLUMN config.component_queries.deleted_at IS 'Мягкое удаление - дата удаления';

CREATE INDEX IF NOT EXISTS idx_component_queries_query_id ON config.component_queries(query_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_component_queries_active ON config.component_queries(is_active) WHERE deleted_at IS NULL;

-- ============================================
-- БАЗОВЫЕ КОНФИГИ
-- ============================================

-- Конфиг: header_dates
-- Получение трех дат периодов (current, previousMonth, previousYear) из mart.kpi_metrics
INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'header_dates',
  'Даты периодов для header',
  '{
    "from": {
      "schema": "mart",
      "table": "kpi_metrics"
    },
    "select": [
      {
        "type": "agg",
        "func": "max",
        "field": "period_date",
        "as": "current"
      }
    ],
    "params": {},
    "paramTypes": {}
  }'::jsonb,
  FALSE,
  TRUE
) ON CONFLICT (query_id) DO NOTHING;

-- Конфиг: assets_table
-- Получение данных таблицы assets с расчетом изменений за три периода
-- Использует case_agg для агрегации значений по периодам
INSERT INTO config.component_queries (query_id, title, config_json, wrap_json, is_active)
VALUES (
  'assets_table',
  'Данные таблицы активов',
  '{
    "from": {
      "schema": "mart",
      "table": "balance"
    },
    "select": [
      { "type": "column", "field": "class" },
      { "type": "column", "field": "section" },
      { "type": "column", "field": "item" },
      { "type": "column", "field": "sub_item" },
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
        { "field": "class", "op": "=", "value": ":class" },
        { "field": "period_date", "op": "in", "value": [":p1", ":p2", ":p3"] }
      ]
    },
    "groupBy": ["class", "section", "item", "sub_item"],
    "orderBy": [
      { "field": "class", "direction": "asc" },
      { "field": "section", "direction": "asc" },
      { "field": "item", "direction": "asc" },
      { "field": "sub_item", "direction": "asc" }
    ],
    "limit": 1000,
    "offset": 0,
    "params": {
      "p1": "2025-08-01",
      "p2": "2025-07-01",
      "p3": "2024-08-01",
      "class": "assets"
    },
    "paramTypes": {
      "p1": "date",
      "p2": "date",
      "p3": "date",
      "class": "string"
    }
  }'::jsonb,
  FALSE,
  TRUE
) ON CONFLICT (query_id) DO NOTHING;
