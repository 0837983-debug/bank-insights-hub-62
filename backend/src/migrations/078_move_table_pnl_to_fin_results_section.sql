-- 078_move_table_pnl_to_fin_results_section.sql
-- Перемещает table_pnl в секцию section_financial_results.

BEGIN;

-- Гарантируем, что секция финреза существует и активна
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
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'section_financial_results';

-- Гарантируем root mapping секции
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
  parent_component_id = 'section_financial_results',
  is_visible = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE layout_id = 'main_dashboard'
  AND component_id = 'table_pnl';

COMMIT;
