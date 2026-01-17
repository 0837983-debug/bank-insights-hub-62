-- Migration 017: Remove instance_id and rename parent_instance_id to parent_component_id
-- This migration removes the instance_id column and renames parent_instance_id to parent_component_id
-- to use component_id everywhere instead of instance_id

BEGIN;

-- 1. Delete old UNIQUE constraint on (layout_id, instance_id) if exists
ALTER TABLE config.layout_component_mapping 
  DROP CONSTRAINT IF EXISTS layout_component_mapping_layout_id_instance_id_key;

-- 2. Rename parent_instance_id to parent_component_id
ALTER TABLE config.layout_component_mapping 
  RENAME COLUMN parent_instance_id TO parent_component_id;

-- 3. Drop instance_id column
ALTER TABLE config.layout_component_mapping 
  DROP COLUMN IF EXISTS instance_id;

-- 4. Update comments
COMMENT ON COLUMN config.layout_component_mapping.parent_component_id IS 
'ID родительского компонента для создания иерархии. Если NULL, то компонент находится на верхнем уровне (секция). Ссылается на component_id другого компонента в том же layout.';

COMMIT;
