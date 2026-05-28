-- 066_bind_header_to_main_dashboard.sql
-- Привязка header-компонента к main_dashboard как root (parent_component_id IS NULL)

INSERT INTO config.layout_component_mapping (
  layout_id,
  component_id,
  parent_component_id,
  display_order,
  is_visible
)
SELECT
  'main_dashboard',
  'header',
  NULL,
  0,
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM config.layout_component_mapping
  WHERE layout_id = 'main_dashboard'
    AND component_id = 'header'
    AND parent_component_id IS NULL
    AND deleted_at IS NULL
);

-- На случай, если root-связь была soft-deleted или скрыта
UPDATE config.layout_component_mapping
SET
  deleted_at = NULL,
  is_visible = TRUE,
  display_order = COALESCE(display_order, 0)
WHERE layout_id = 'main_dashboard'
  AND component_id = 'header'
  AND parent_component_id IS NULL;

