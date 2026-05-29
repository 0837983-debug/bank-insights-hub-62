-- 076_bind_table_pnl_to_existing_section.sql
-- Привязывает table_pnl к доступной секции layout:
-- приоритет: section_financial_results -> section_balance

BEGIN;

WITH target_parent AS (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM config.components c
      WHERE c.id = 'section_financial_results'
        AND c.deleted_at IS NULL
        AND c.is_active = TRUE
    ) THEN 'section_financial_results'
    ELSE 'section_balance'
  END AS parent_id
)
INSERT INTO config.layout_component_mapping (
  layout_id,
  component_id,
  parent_component_id,
  display_order,
  is_visible
)
SELECT
  'main_dashboard',
  'table_pnl',
  tp.parent_id,
  12,
  TRUE
FROM target_parent tp
WHERE EXISTS (
  SELECT 1
  FROM config.components c
  WHERE c.id = tp.parent_id
    AND c.deleted_at IS NULL
    AND c.is_active = TRUE
)
AND NOT EXISTS (
  SELECT 1
  FROM config.layout_component_mapping lcm
  WHERE lcm.layout_id = 'main_dashboard'
    AND lcm.component_id = 'table_pnl'
    AND lcm.deleted_at IS NULL
);

WITH target_parent AS (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM config.components c
      WHERE c.id = 'section_financial_results'
        AND c.deleted_at IS NULL
        AND c.is_active = TRUE
    ) THEN 'section_financial_results'
    ELSE 'section_balance'
  END AS parent_id
)
UPDATE config.layout_component_mapping lcm
SET
  parent_component_id = tp.parent_id,
  is_visible = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
FROM target_parent tp
WHERE lcm.layout_id = 'main_dashboard'
  AND lcm.component_id = 'table_pnl';

COMMIT;
