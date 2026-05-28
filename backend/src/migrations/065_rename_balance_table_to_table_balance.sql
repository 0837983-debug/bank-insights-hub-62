-- 065_rename_balance_table_to_table_balance.sql
-- Normalize naming convention for balance table component/query.

BEGIN;

-- 1) Ensure target component exists (copy if missing).
INSERT INTO config.components (
  id,
  component_type,
  title,
  label,
  tooltip,
  icon,
  data_source_key,
  query_id,
  action_type,
  action_target,
  action_params,
  settings,
  description,
  category,
  is_active,
  created_by,
  created_at,
  updated_by,
  updated_at,
  deleted_by,
  deleted_at
)
SELECT
  'table_balance',
  c.component_type,
  c.title,
  c.label,
  c.tooltip,
  c.icon,
  'table_balance',
  'table_balance',
  c.action_type,
  c.action_target,
  c.action_params,
  c.settings,
  c.description,
  c.category,
  c.is_active,
  c.created_by,
  c.created_at,
  c.updated_by,
  NOW(),
  c.deleted_by,
  NULL
FROM config.components c
WHERE c.id = 'balance_table'
  AND NOT EXISTS (
    SELECT 1 FROM config.components WHERE id = 'table_balance'
  );

-- 2) Canonical target component properties.
UPDATE config.components
SET
  component_type = 'table',
  query_id = 'table_balance',
  data_source_key = 'table_balance',
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW()
WHERE id = 'table_balance';

-- 3) Move mapping references to table_balance.
UPDATE config.layout_component_mapping
SET component_id = 'table_balance'
WHERE component_id = 'balance_table';

UPDATE config.layout_component_mapping
SET parent_component_id = 'table_balance'
WHERE parent_component_id = 'balance_table';

-- 4) Move fields to table_balance.
UPDATE config.component_fields
SET component_id = 'table_balance'
WHERE component_id = 'balance_table';

-- 5) Remove old component id once references moved.
DELETE FROM config.components
WHERE id = 'balance_table';

-- 6) Rename query config id: balance_table -> table_balance.
UPDATE config.component_queries
SET
  query_id = 'table_balance',
  updated_at = NOW()
WHERE query_id = 'balance_table'
  AND NOT EXISTS (
    SELECT 1 FROM config.component_queries WHERE query_id = 'table_balance'
  );

-- 7) Safety normalization for references by query/data source keys.
UPDATE config.components
SET
  query_id = 'table_balance',
  data_source_key = 'table_balance',
  updated_at = NOW()
WHERE query_id = 'balance_table'
   OR data_source_key = 'balance_table';

COMMIT;

