-- Migration 015: Remove unused formats from database
-- This migration identifies and removes formats that are not used in any active components
-- 
-- Note: After removing sections (migration 014), many formats may become unused.
-- This script will soft-delete formats that are not referenced in any active component_fields
-- that belong to components used in active layout mappings.

BEGIN;

-- Step 1: Find all formats that are used in active (non-deleted) component_fields
-- A format is considered used if it's referenced in component_fields that belong to
-- components that are used in active (non-deleted) layout mappings
WITH used_formats AS (
    SELECT DISTINCT cf.format_id
    FROM config.component_fields cf
    INNER JOIN config.layout_component_mapping m 
        ON m.component_id = cf.component_id
        AND m.deleted_at IS NULL
    WHERE cf.format_id IS NOT NULL
      AND cf.deleted_at IS NULL
      AND cf.is_active = TRUE
)
-- Step 2: Soft-delete formats that are not used
-- For system formats, only deactivate them (set is_active = FALSE) - don't set deleted_at
-- For non-system formats, soft-delete them (set deleted_at)
UPDATE config.formats f
SET 
    deleted_at = CASE 
        WHEN f.is_system = TRUE THEN NULL  -- Don't delete system formats, only deactivate
        ELSE CURRENT_TIMESTAMP  -- Soft-delete non-system formats
    END,
    is_active = CASE 
        WHEN f.is_system = TRUE THEN FALSE  -- Deactivate system formats
        ELSE FALSE  -- Also deactivate non-system formats when deleting
    END,
    deleted_by = 'migration_015',
    updated_at = CURRENT_TIMESTAMP
WHERE 
    f.deleted_at IS NULL
    AND f.id NOT IN (SELECT format_id FROM used_formats WHERE format_id IS NOT NULL);

-- Step 3: Also check if there are any formats that might be used in deleted component_fields
-- but are still marked as active - we can optionally clean those up too
-- This is a safety check to ensure we don't miss any references

-- Verification query (run separately to check results):
-- Shows formats that will be kept (used formats)
-- SELECT 
--     f.id,
--     f.name,
--     f.kind,
--     f.is_system,
--     COUNT(cf.id) AS usage_count
-- FROM config.formats f
-- LEFT JOIN config.component_fields cf ON cf.format_id = f.id 
--     AND cf.deleted_at IS NULL 
--     AND cf.is_active = TRUE
--     AND EXISTS (
--         SELECT 1
--         FROM config.layout_component_mapping m
--         WHERE m.component_id = cf.component_id
--           AND m.deleted_at IS NULL
--     )
-- WHERE f.deleted_at IS NULL
-- GROUP BY f.id, f.name, f.kind, f.is_system
-- ORDER BY f.id;

-- Shows formats that will be removed (unused formats)
-- SELECT 
--     f.id,
--     f.name,
--     f.kind,
--     f.is_system,
--     f.is_active
-- FROM config.formats f
-- WHERE f.deleted_at IS NULL
--   AND f.id NOT IN (
--       SELECT DISTINCT cf.format_id
--       FROM config.component_fields cf
--       WHERE cf.format_id IS NOT NULL
--         AND cf.deleted_at IS NULL
--         AND cf.is_active = TRUE
--         AND EXISTS (
--             SELECT 1
--             FROM config.layout_component_mapping m
--             WHERE m.component_id = cf.component_id
--               AND m.deleted_at IS NULL
--         )
--   )
-- ORDER BY f.id;

COMMIT;
