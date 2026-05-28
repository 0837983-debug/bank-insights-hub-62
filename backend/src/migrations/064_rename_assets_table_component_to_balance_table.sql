-- 064_rename_assets_table_component_to_balance_table.sql
-- Rename table component/assets query identifiers to balance_table while preserving structure.

BEGIN;

-- 1) Create target component by copying existing one (balanc) if needed.
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
  'balance_table',
  c.component_type,
  c.title,
  c.label,
  c.tooltip,
  c.icon,
  'balance_table',
  'balance_table',
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
WHERE c.id = 'balanc'
  AND NOT EXISTS (
    SELECT 1 FROM config.components WHERE id = 'balance_table'
  );

-- 2) Keep target component canonical even if it already exists.
UPDATE config.components
SET
  component_type = 'table',
  title = COALESCE(title, 'Баланс'),
  label = COALESCE(label, 'Баланс'),
  query_id = 'balance_table',
  data_source_key = 'balance_table',
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW()
WHERE id = 'balance_table';

-- 3) Move mapping references to balance_table.
UPDATE config.layout_component_mapping
SET component_id = 'balance_table'
WHERE component_id = 'balanc';

UPDATE config.layout_component_mapping
SET parent_component_id = 'balance_table'
WHERE parent_component_id = 'balanc';

-- 4) Move component fields preserving structure/formats.
UPDATE config.component_fields
SET component_id = 'balance_table'
WHERE component_id = 'balanc';

-- 5) Remove legacy component id after references moved.
DELETE FROM config.components
WHERE id = 'balanc';

-- 6) Rename query config assets_table -> balance_table, preserving JSON config.
UPDATE config.component_queries
SET
  query_id = 'balance_table',
  title = REPLACE(title, 'активов', 'баланса'),
  updated_at = NOW()
WHERE query_id = 'assets_table'
  AND NOT EXISTS (
    SELECT 1 FROM config.component_queries WHERE query_id = 'balance_table'
  );

-- 7) Normalize component links in case any row still points to assets_table.
UPDATE config.components
SET
  query_id = 'balance_table',
  data_source_key = 'balance_table',
  updated_at = NOW()
WHERE query_id = 'assets_table' OR data_source_key = 'assets_table';

COMMIT;

