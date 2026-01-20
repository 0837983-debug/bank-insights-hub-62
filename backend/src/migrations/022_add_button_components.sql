-- Миграция 022: Добавление кнопок-компонентов для замены groupableFields
-- Дата: 2025-01-XX

-- ============================================
-- СОЗДАНИЕ КНОПОК ДЛЯ GROUPABLE ПОЛЕЙ
-- ============================================

-- Создаем кнопки для каждого groupable поля каждой таблицы
-- Кнопка привязана к таблице через parent_component_id в layout_component_mapping
-- В data_source_key храним query_id (assets_table или liabilities_table)
-- Параметр groupBy будет передаваться при запросе данных

-- Кнопки для assets_table
INSERT INTO config.components (
  id,
  component_type,
  title,
  label,
  description,
  data_source_key,
  settings,
  is_active,
  created_by,
  created_at
)
SELECT 
  'button_' || c.id || '_' || cf.field_id as id,
  'button' as component_type,
  COALESCE(cf.label, cf.field_id) as title,
  COALESCE(cf.label, cf.field_id) as label,
  'Кнопка группировки по полю ' || COALESCE(cf.label, cf.field_id) || ' для таблицы ' || c.title as description,
  c.id as data_source_key, -- query_id (assets_table или liabilities_table)
  jsonb_build_object('fieldId', cf.field_id, 'groupBy', cf.field_id) as settings,
  TRUE as is_active,
  'system' as created_by,
  CURRENT_TIMESTAMP as created_at
FROM config.components c
INNER JOIN config.component_fields cf ON c.id = cf.component_id
WHERE c.component_type = 'table'
  AND cf.is_groupable = TRUE
  AND c.deleted_at IS NULL
  AND cf.deleted_at IS NULL
  AND cf.is_active = TRUE
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  data_source_key = EXCLUDED.data_source_key,
  settings = EXCLUDED.settings,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- ПРИВЯЗКА КНОПОК К ТАБЛИЦАМ ЧЕРЕЗ LAYOUT_COMPONENT_MAPPING
-- ============================================

-- Привязываем кнопки к таблицам через parent_component_id
-- Кнопка становится дочерним компонентом таблицы
INSERT INTO config.layout_component_mapping (
  layout_id,
  component_id,
  parent_component_id,
  display_order,
  is_visible,
  created_by,
  created_at
)
SELECT DISTINCT
  lcm.layout_id,
  'button_' || c.id || '_' || cf.field_id as component_id,
  c.id as parent_component_id, -- таблица является родителем кнопки
  cf.display_order as display_order,
  TRUE as is_visible,
  'system' as created_by,
  CURRENT_TIMESTAMP as created_at
FROM config.components c
INNER JOIN config.component_fields cf ON c.id = cf.component_id
INNER JOIN config.layout_component_mapping lcm ON c.id = lcm.component_id
WHERE c.component_type = 'table'
  AND cf.is_groupable = TRUE
  AND c.deleted_at IS NULL
  AND cf.deleted_at IS NULL
  AND cf.is_active = TRUE
  AND lcm.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM config.layout_component_mapping existing
    WHERE existing.layout_id = lcm.layout_id
      AND existing.component_id = 'button_' || c.id || '_' || cf.field_id
      AND existing.parent_component_id = c.id
      AND existing.deleted_at IS NULL
  );
