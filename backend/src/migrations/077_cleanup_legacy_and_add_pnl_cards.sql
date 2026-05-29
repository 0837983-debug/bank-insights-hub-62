-- 077_cleanup_legacy_and_add_pnl_cards.sql
-- Убирает legacy PnL карточки и добавляет актуальные card_* PnL карточки в layout.

BEGIN;

-- 1) Ensure section_financial_results exists and is active
INSERT INTO config.components (
  id,
  component_type,
  title,
  label,
  is_active
)
SELECT
  'section_financial_results',
  'container',
  'Финансовые результаты',
  'Финансовые результаты',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM config.components WHERE id = 'section_financial_results'
);

UPDATE config.components
SET
  component_type = 'container',
  title = 'Финансовые результаты',
  label = 'Финансовые результаты',
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'section_financial_results';

INSERT INTO config.layout_component_mapping (
  layout_id,
  component_id,
  parent_component_id,
  display_order,
  is_visible
)
SELECT
  'main_dashboard',
  'section_financial_results',
  NULL,
  20,
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM config.layout_component_mapping lcm
  WHERE lcm.layout_id = 'main_dashboard'
    AND lcm.component_id = 'section_financial_results'
    AND lcm.parent_component_id IS NULL
    AND lcm.deleted_at IS NULL
);

UPDATE config.layout_component_mapping
SET
  is_visible = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE layout_id = 'main_dashboard'
  AND component_id = 'section_financial_results'
  AND parent_component_id IS NULL;

-- 2) Remove legacy cards from layout and deactivate
UPDATE config.layout_component_mapping
SET
  deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
  updated_at = CURRENT_TIMESTAMP
WHERE layout_id = 'main_dashboard'
  AND component_id IN ('nii_card', 'toi_card', 'op_profit_card', 'op_margin_card')
  AND deleted_at IS NULL;

UPDATE config.components
SET
  is_active = FALSE,
  deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP),
  updated_at = CURRENT_TIMESTAMP
WHERE id IN ('nii_card', 'toi_card', 'op_profit_card', 'op_margin_card')
  AND deleted_at IS NULL;

-- 3) Collect all non-legacy PnL cards with available KPI names
WITH pnl_kpis AS (
  SELECT DISTINCT kpi_name FROM mart.mv_kpi_fin_results
  UNION
  SELECT DISTINCT kpi_name FROM mart.mv_kpi_derived
),
target_cards AS (
  SELECT c.id
  FROM config.components c
  WHERE c.component_type = 'card'
    AND c.is_active = TRUE
    AND c.deleted_at IS NULL
    AND c.id LIKE 'card_%'
    AND c.id NOT IN ('nii_card', 'toi_card', 'op_profit_card', 'op_margin_card')
    AND c.data_source_key IN (SELECT kpi_name FROM pnl_kpis)
),
base_order AS (
  SELECT COALESCE(MAX(display_order), 0) AS max_order
  FROM config.layout_component_mapping
  WHERE layout_id = 'main_dashboard'
    AND parent_component_id = 'section_financial_results'
    AND deleted_at IS NULL
),
numbered_cards AS (
  SELECT
    tc.id AS component_id,
    bo.max_order + ROW_NUMBER() OVER (ORDER BY tc.id) AS display_order
  FROM target_cards tc
  CROSS JOIN base_order bo
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
  nc.component_id,
  'section_financial_results',
  nc.display_order,
  TRUE
FROM numbered_cards nc
WHERE NOT EXISTS (
  SELECT 1
  FROM config.layout_component_mapping lcm
  WHERE lcm.layout_id = 'main_dashboard'
    AND lcm.component_id = nc.component_id
    AND lcm.parent_component_id = 'section_financial_results'
    AND lcm.deleted_at IS NULL
);

-- If card already mapped elsewhere in this layout, move it to section_financial_results and un-delete
WITH pnl_kpis AS (
  SELECT DISTINCT kpi_name FROM mart.mv_kpi_fin_results
  UNION
  SELECT DISTINCT kpi_name FROM mart.mv_kpi_derived
),
target_cards AS (
  SELECT c.id
  FROM config.components c
  WHERE c.component_type = 'card'
    AND c.is_active = TRUE
    AND c.deleted_at IS NULL
    AND c.id LIKE 'card_%'
    AND c.id NOT IN ('nii_card', 'toi_card', 'op_profit_card', 'op_margin_card')
    AND c.data_source_key IN (SELECT kpi_name FROM pnl_kpis)
)
UPDATE config.layout_component_mapping lcm
SET
  parent_component_id = 'section_financial_results',
  is_visible = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE lcm.layout_id = 'main_dashboard'
  AND lcm.component_id IN (SELECT id FROM target_cards);

COMMIT;
