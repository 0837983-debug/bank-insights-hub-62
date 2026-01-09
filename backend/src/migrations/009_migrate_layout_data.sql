-- Migration 009: Migrate layout data from layout.json to new config schema
-- This migration is a placeholder - actual data migration is done via TypeScript script
-- migrate-layout-data.ts which parses layout.json and inserts data into config tables

-- Note: This SQL file is kept for consistency with migration numbering.
-- The actual migration logic is in backend/src/scripts/migrate-layout-data.ts
-- Run it with: npm run migrate-data (or tsx src/scripts/migrate-layout-data.ts)

-- No SQL operations needed here as the migration is done programmatically
-- to handle complex JSON parsing and hierarchical relationships

