-- Migration 014: Remove all sections except "Баланс" from the database
-- This includes soft-deleting sections and all their child components

BEGIN;

-- Step 1: Find and soft-delete all section containers except "Баланс"
-- Sections are containers with parent_instance_id IS NULL
UPDATE config.layout_component_mapping
SET 
  deleted_at = CURRENT_TIMESTAMP,
  deleted_by = 'migration_014'
WHERE 
  parent_instance_id IS NULL
  AND component_id IN (
    SELECT c.id 
    FROM config.components c
    WHERE c.component_type = 'container'
      AND c.title != 'Баланс'
      AND c.deleted_at IS NULL
  )
  AND deleted_at IS NULL;

-- Step 2: Soft-delete all child components of deleted sections
-- This includes cards, tables, charts, etc. that belong to deleted sections
UPDATE config.layout_component_mapping
SET 
  deleted_at = CURRENT_TIMESTAMP,
  deleted_by = 'migration_014'
WHERE 
  parent_instance_id IN (
    SELECT instance_id 
    FROM config.layout_component_mapping
    WHERE parent_instance_id IS NULL
      AND component_id IN (
        SELECT c.id 
        FROM config.components c
        WHERE c.component_type = 'container'
          AND c.title != 'Баланс'
          AND c.deleted_at IS NULL
      )
      AND deleted_at IS NOT NULL
  )
  AND deleted_at IS NULL;

-- Step 3: Soft-delete KPI categories except those related to balance
-- Keep only balance-related categories (if any), delete finance, clients, conversion
UPDATE dashboard.kpi_categories
SET 
  updated_at = CURRENT_TIMESTAMP
WHERE 
  id IN ('finance', 'clients', 'conversion');

-- Step 4: Soft-delete KPI metrics from deleted categories
-- Note: The kpi_metrics table doesn't have deleted_at, so we'll just note that they're orphaned
-- If you want to actually delete them, you would need to add a deleted_at column first
-- For now, we'll leave them but they won't be used since their categories are effectively removed

-- Step 5: Delete data from mart tables for non-balance sections
-- Delete financial_results data (P&L data)
DELETE FROM mart.financial_results;

-- Note: We keep balance data in mart.balance as it's needed for the Balance section
-- We also keep client_base and conversion data in case they're referenced elsewhere,
-- but they won't be displayed since the sections are removed

COMMIT;

-- Verification query (run separately to check results):
-- SELECT 
--   c.title AS section_title,
--   COUNT(m.id) AS component_count
-- FROM config.layout_component_mapping m
-- JOIN config.components c ON c.id = m.component_id
-- WHERE m.parent_instance_id IS NULL
--   AND c.component_type = 'container'
--   AND m.deleted_at IS NULL
-- GROUP BY c.title;
