-- Migration 015: Add assets table component to Balance section
-- This ensures the assets table is available in the Balance section layout

BEGIN;

-- Step 1: Create assets_table component if it doesn't exist
INSERT INTO config.components (
  id, 
  component_type, 
  title, 
  label, 
  tooltip, 
  data_source_key, 
  category, 
  is_active, 
  created_by
) VALUES (
  'assets_table',
  'table',
  'Активы',
  'Активы',
  'Таблица активов банка с иерархической структурой',
  'assets',
  'table',
  TRUE,
  'migration_015'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  label = EXCLUDED.label,
  tooltip = EXCLUDED.tooltip,
  data_source_key = EXCLUDED.data_source_key,
  updated_at = CURRENT_TIMESTAMP;

-- Step 2: Create component fields for assets table
-- Field: name (dimension)
INSERT INTO config.component_fields (
  component_id,
  field_id,
  field_type,
  label,
  description,
  is_visible,
  display_order,
  is_active,
  is_dimension,
  is_measure,
  created_by
) 
SELECT 
  'assets_table',
  'name',
  'text',
  'Показатель',
  'Наименование статьи актива',
  TRUE,
  1,
  TRUE,
  TRUE,
  FALSE,
  'migration_015'
WHERE NOT EXISTS (
  SELECT 1 FROM config.component_fields 
  WHERE component_id = 'assets_table' 
    AND field_id = 'name' 
    AND deleted_at IS NULL
)
ON CONFLICT DO NOTHING;

-- Field: percentage (measure)
INSERT INTO config.component_fields (
  component_id,
  field_id,
  field_type,
  label,
  description,
  format_id,
  is_visible,
  display_order,
  is_active,
  is_dimension,
  is_measure,
  created_by
) 
SELECT 
  'assets_table',
  'percentage',
  'number',
  'Доля',
  'Доля статьи в общих активах, %',
  'percent',
  TRUE,
  2,
  TRUE,
  FALSE,
  TRUE,
  'migration_015'
WHERE NOT EXISTS (
  SELECT 1 FROM config.component_fields 
  WHERE component_id = 'assets_table' 
    AND field_id = 'percentage' 
    AND deleted_at IS NULL
)
ON CONFLICT DO NOTHING;

-- Field: value (measure)
INSERT INTO config.component_fields (
  component_id,
  field_id,
  field_type,
  label,
  description,
  format_id,
  parent_field_id,
  is_visible,
  display_order,
  is_active,
  is_dimension,
  is_measure,
  created_by
) 
SELECT 
  'assets_table',
  'value',
  'number',
  'Значение',
  'Значение актива в рублях',
  'currency_rub',
  NULL,
  TRUE,
  3,
  TRUE,
  FALSE,
  TRUE,
  'migration_015'
WHERE NOT EXISTS (
  SELECT 1 FROM config.component_fields 
  WHERE component_id = 'assets_table' 
    AND field_id = 'value' 
    AND deleted_at IS NULL
)
ON CONFLICT DO NOTHING;

-- Field: change_pptd (child of value)
INSERT INTO config.component_fields (
  component_id,
  field_id,
  field_type,
  label,
  description,
  format_id,
  parent_field_id,
  is_visible,
  display_order,
  is_active,
  is_dimension,
  is_measure,
  created_by
) 
SELECT 
  'assets_table',
  'change_pptd',
  'number',
  'Изм. к ПП',
  'Изменение к предыдущему периоду, %',
  'percent',
  'value',
  TRUE,
  4,
  TRUE,
  FALSE,
  TRUE,
  'migration_015'
WHERE NOT EXISTS (
  SELECT 1 FROM config.component_fields 
  WHERE component_id = 'assets_table' 
    AND field_id = 'change_pptd' 
    AND deleted_at IS NULL
)
ON CONFLICT DO NOTHING;

-- Step 3: Find section_balance instance_id
-- Get the instance_id for section_balance container
DO $$
DECLARE
  section_instance_id VARCHAR(200);
  max_display_order INTEGER;
BEGIN
  -- Find section_balance instance
  SELECT instance_id INTO section_instance_id
  FROM config.layout_component_mapping lcm
  INNER JOIN config.components c ON lcm.component_id = c.id
  WHERE lcm.parent_instance_id IS NULL
    AND c.component_type = 'container'
    AND c.title = 'Баланс'
    AND lcm.deleted_at IS NULL
  LIMIT 1;

  IF section_instance_id IS NULL THEN
    RAISE EXCEPTION 'Section "Баланс" not found in layout';
  END IF;

  -- Get max display_order for components in this section
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM config.layout_component_mapping
  WHERE parent_instance_id = section_instance_id
    AND deleted_at IS NULL;

  -- Step 4: Create or restore layout mapping for assets_table in Balance section
  -- First, try to restore if it was soft-deleted
  UPDATE config.layout_component_mapping
  SET 
    parent_instance_id = section_instance_id,
    display_order = max_display_order + 1,
    is_visible = TRUE,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE layout_id = 'main_dashboard'
    AND instance_id = 'assets_table'
    AND deleted_at IS NOT NULL;
  
  -- If no row was updated (either doesn't exist or wasn't deleted), insert new one
  IF NOT FOUND THEN
    INSERT INTO config.layout_component_mapping (
      layout_id,
      component_id,
      instance_id,
      parent_instance_id,
      display_order,
      is_visible,
      created_by
    ) VALUES (
      'main_dashboard',
      'assets_table',
      'assets_table',
      section_instance_id,
      max_display_order + 1,
      TRUE,
      'migration_015'
    )
    ON CONFLICT (layout_id, instance_id) DO UPDATE SET
      parent_instance_id = EXCLUDED.parent_instance_id,
      display_order = EXCLUDED.display_order,
      is_visible = EXCLUDED.is_visible,
      deleted_at = NULL,
      deleted_by = NULL,
      updated_at = CURRENT_TIMESTAMP;
  END IF;

  RAISE NOTICE 'Assets table added to Balance section with instance_id: %', section_instance_id;
END $$;

COMMIT;

-- Verification query (run separately to check results):
-- SELECT 
--   lcm.instance_id,
--   c.component_type,
--   c.title,
--   c.data_source_key,
--   lcm.display_order
-- FROM config.layout_component_mapping lcm
-- INNER JOIN config.components c ON lcm.component_id = c.id
-- WHERE lcm.parent_instance_id IN (
--   SELECT instance_id 
--   FROM config.layout_component_mapping
--   WHERE parent_instance_id IS NULL
--     AND component_id IN (
--       SELECT id FROM config.components 
--       WHERE component_type = 'container' AND title = 'Баланс'
--     )
-- )
--   AND lcm.deleted_at IS NULL
-- ORDER BY lcm.display_order;
