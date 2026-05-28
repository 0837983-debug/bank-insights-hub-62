-- 063_add_balance_section_and_balanc_table.sql
-- Восстановление секции баланса и table-компонента balanc в main_dashboard.

-- 1) Section component
INSERT INTO config.components (
  id, component_type, title, label, is_active
)
SELECT
  'section_balance',
  'container',
  'Баланс',
  'Баланс',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM config.components WHERE id = 'section_balance'
);

UPDATE config.components
SET
  component_type = 'container',
  title = 'Баланс',
  label = 'Баланс',
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW()
WHERE id = 'section_balance';

-- 2) Table component "balanc" (requested id)
INSERT INTO config.components (
  id, component_type, title, label, query_id, data_source_key, is_active
)
SELECT
  'balanc',
  'table',
  'Баланс',
  'Баланс',
  'assets_table',
  'assets_table',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM config.components WHERE id = 'balanc'
);

UPDATE config.components
SET
  component_type = 'table',
  title = 'Баланс',
  label = 'Баланс',
  query_id = 'assets_table',
  data_source_key = 'assets_table',
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW()
WHERE id = 'balanc';

-- 3) Layout dependencies (root section + child table)
INSERT INTO config.layout_component_mapping (
  layout_id, component_id, parent_component_id, display_order, is_visible
)
SELECT
  'main_dashboard',
  'section_balance',
  NULL,
  10,
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM config.layout_component_mapping
  WHERE layout_id = 'main_dashboard'
    AND component_id = 'section_balance'
    AND parent_component_id IS NULL
    AND deleted_at IS NULL
);

INSERT INTO config.layout_component_mapping (
  layout_id, component_id, parent_component_id, display_order, is_visible
)
SELECT
  'main_dashboard',
  'balanc',
  'section_balance',
  1,
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM config.layout_component_mapping
  WHERE layout_id = 'main_dashboard'
    AND component_id = 'balanc'
    AND parent_component_id = 'section_balance'
    AND deleted_at IS NULL
);

-- 4) Minimal table columns for rendering balance
--    (dimension columns + one measure)
INSERT INTO config.component_fields (
  component_id, field_id, field_type, data_type, label, format_id,
  parent_field_id, display_order, is_visible, is_active
)
SELECT * FROM (
  VALUES
    ('balanc', 'class',   'dimension', 'string',  'Класс',   NULL,           NULL, 1, TRUE, TRUE),
    ('balanc', 'section', 'dimension', 'string',  'Раздел',  NULL,           NULL, 2, TRUE, TRUE),
    ('balanc', 'item',    'dimension', 'string',  'Статья',  NULL,           NULL, 3, TRUE, TRUE),
    ('balanc', 'value',   'measure',   'numeric', 'Значение','currency_rub', NULL, 4, TRUE, TRUE)
) AS v(component_id, field_id, field_type, data_type, label, format_id, parent_field_id, display_order, is_visible, is_active)
WHERE NOT EXISTS (
  SELECT 1
  FROM config.component_fields cf
  WHERE cf.component_id = v.component_id
    AND cf.field_id = v.field_id
    AND cf.deleted_at IS NULL
);

