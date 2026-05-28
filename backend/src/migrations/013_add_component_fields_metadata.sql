-- Migration: Add metadata fields to component_fields and remove unused fields
-- Adds: is_dimension, is_measure, compact_display, is_groupable
-- Removes: data_key, is_sortable, width, align

BEGIN;

-- Remove unused fields
ALTER TABLE config.component_fields
  DROP COLUMN IF EXISTS data_key,
  DROP COLUMN IF EXISTS is_sortable,
  DROP COLUMN IF EXISTS width,
  DROP COLUMN IF EXISTS align;

-- Add new metadata fields
ALTER TABLE config.component_fields
  ADD COLUMN IF NOT EXISTS is_dimension BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_measure BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS compact_display BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_groupable BOOLEAN DEFAULT FALSE;

COMMIT;
