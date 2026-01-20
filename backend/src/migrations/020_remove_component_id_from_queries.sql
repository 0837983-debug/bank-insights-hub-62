-- Миграция 020: Удаление поля component_id из config.component_queries
-- Дата: 2025-01-XX

-- Удаляем поле component_id из таблицы
ALTER TABLE config.component_queries DROP COLUMN IF EXISTS component_id;

-- Удаляем индекс, если он существует
DROP INDEX IF EXISTS config.idx_component_queries_component_id;

-- Обновляем комментарии
COMMENT ON TABLE config.component_queries IS 'Конфиги SQL запросов для SQL Builder - единый источник конфигов для генерации SQL';
COMMENT ON COLUMN config.component_queries.query_id IS 'Уникальный идентификатор запроса (например, header_dates, assets_table)';
COMMENT ON COLUMN config.component_queries.title IS 'Название запроса для отображения';
COMMENT ON COLUMN config.component_queries.config_json IS 'JSON конфиг для SQL Builder в формате QueryConfig';
COMMENT ON COLUMN config.component_queries.wrap_json IS 'Нужно ли оборачивать результат в jsonb_agg (для будущего использования)';
COMMENT ON COLUMN config.component_queries.is_active IS 'Активен ли запрос';
COMMENT ON COLUMN config.component_queries.deleted_at IS 'Мягкое удаление - дата удаления';
