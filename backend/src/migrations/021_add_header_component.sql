-- Миграция 021: Добавление header компонента с data_source_key = header_dates
-- Дата: 2025-01-XX

-- ============================================
-- ДОБАВЛЕНИЕ HEADER КОМПОНЕНТА
-- ============================================

-- Добавляем компонент header в config.components
INSERT INTO config.components (
  id,
  component_type,
  title,
  label,
  description,
  data_source_key,
  is_active,
  created_by,
  created_at
) VALUES (
  'header',
  'header',
  'Header',
  'Header',
  'Компонент header для отображения дат периодов. Получает данные через data_source_key = header_dates.',
  'header_dates',
  TRUE,
  'system',
  CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
  component_type = EXCLUDED.component_type,
  title = EXCLUDED.title,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  data_source_key = EXCLUDED.data_source_key,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- ПРИВЯЗКА HEADER К LAYOUT
-- ============================================

-- Привязываем header ко всем активным layouts
-- Header должен быть на верхнем уровне (parent_component_id = NULL)
-- с display_order = 0 (самый первый)
INSERT INTO config.layout_component_mapping (
  layout_id,
  component_id,
  parent_component_id,
  display_order,
  is_visible,
  created_by,
  created_at
)
SELECT 
  l.id as layout_id,
  'header' as component_id,
  NULL as parent_component_id,
  0 as display_order,
  TRUE as is_visible,
  'system' as created_by,
  CURRENT_TIMESTAMP as created_at
FROM config.layouts l
WHERE l.is_active = TRUE
  AND l.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM config.layout_component_mapping lcm
    WHERE lcm.layout_id = l.id
      AND lcm.component_id = 'header'
      AND lcm.parent_component_id IS NULL
      AND lcm.deleted_at IS NULL
  );

-- Обновляем display_order для остальных компонентов в layout,
-- чтобы header был первым (display_order = 0), а остальные сдвинулись
UPDATE config.layout_component_mapping lcm
SET display_order = lcm.display_order + 1
WHERE lcm.component_id != 'header'
  AND lcm.parent_component_id IS NULL
  AND lcm.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM config.layout_component_mapping header_mapping
    WHERE header_mapping.layout_id = lcm.layout_id
      AND header_mapping.component_id = 'header'
      AND header_mapping.deleted_at IS NULL
  );
