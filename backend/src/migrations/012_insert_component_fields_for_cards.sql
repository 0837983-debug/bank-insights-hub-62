-- Insert component_fields data for cards with parent_field_id structure
-- This migration creates fields for cards like Capital with hierarchical format structure
-- Example: Capital card has value (main), change_pptd (child of value), change_ytd (child of value)
-- Note: Requires migration 007 to be run first (creates unique index on component_id, field_id)

-- First, ensure capital_card component exists
INSERT INTO config.components (
    id, component_type, title, tooltip, icon, data_source_key, is_active, created_by
) VALUES (
    'capital_card',
    'card',
    'Капитал',
    'Совокупный капитал банка, включающий уставный, добавочный и резервный капитал для покрытия рисков',
    'Landmark',
    'capital',
    TRUE,
    'system'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    tooltip = EXCLUDED.tooltip,
    icon = EXCLUDED.icon,
    data_source_key = EXCLUDED.data_source_key,
    updated_at = CURRENT_TIMESTAMP;

-- Insert fields for capital_card with parent_field_id structure
-- 1. Main field: value (capital amount)
-- Use DO NOTHING since we check for existence first, or update if exists
INSERT INTO config.component_fields (
    component_id, field_id, field_type, label, description, format_id, 
    parent_field_id, is_visible, display_order, is_active, created_by
)
SELECT 
    'capital_card',
    'value',
    'number',
    'Значение',
    'Основная величина капитала на отчетную дату',
    'currency_rub',
    NULL,  -- No parent, this is the main field
    TRUE,
    1,
    TRUE,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM config.component_fields 
    WHERE component_id = 'capital_card' AND field_id = 'value' AND deleted_at IS NULL
);

-- Update if exists
UPDATE config.component_fields SET
    field_type = 'number',
    label = 'Значение',
    description = 'Основная величина капитала на отчетную дату',
    format_id = 'currency_rub',
    parent_field_id = NULL,
    display_order = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'capital_card' AND field_id = 'value' AND deleted_at IS NULL;

-- 2. Child field: change_pptd (change relative to previous period)
INSERT INTO config.component_fields (
    component_id, field_id, field_type, label, description, format_id,
    parent_field_id, is_visible, display_order, is_active, created_by
)
SELECT 
    'capital_card',
    'change_pptd',
    'number',
    'Изм. к ПП',
    'Изменение относительно предыдущего периода',
    'percent',
    'value',  -- Parent is 'value' field
    TRUE,
    2,
    TRUE,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM config.component_fields 
    WHERE component_id = 'capital_card' AND field_id = 'change_pptd' AND deleted_at IS NULL
);

UPDATE config.component_fields SET
    field_type = 'number',
    label = 'Изм. к ПП',
    description = 'Изменение относительно предыдущего периода',
    format_id = 'percent',
    parent_field_id = 'value',
    display_order = 2,
    updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'capital_card' AND field_id = 'change_pptd' AND deleted_at IS NULL;

-- 3. Child field: change_ytd (change relative to year start)
INSERT INTO config.component_fields (
    component_id, field_id, field_type, label, description, format_id,
    parent_field_id, is_visible, display_order, is_active, created_by
)
SELECT 
    'capital_card',
    'change_ytd',
    'number',
    'Изм. YTD',
    'Изменение относительно начала года',
    'percent',
    'value',  -- Parent is 'value' field
    TRUE,
    3,
    TRUE,
    'system'
WHERE NOT EXISTS (
    SELECT 1 FROM config.component_fields 
    WHERE component_id = 'capital_card' AND field_id = 'change_ytd' AND deleted_at IS NULL
);

UPDATE config.component_fields SET
    field_type = 'number',
    label = 'Изм. YTD',
    description = 'Изменение относительно начала года',
    format_id = 'percent',
    parent_field_id = 'value',
    display_order = 3,
    updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'capital_card' AND field_id = 'change_ytd' AND deleted_at IS NULL;

-- Add more card examples: ebitda_card
INSERT INTO config.components (
    id, component_type, title, tooltip, icon, data_source_key, is_active, created_by
) VALUES (
    'ebitda_card',
    'card',
    'EBITDA',
    'Прибыль до вычета процентов, налогов, износа и амортизации',
    'TrendingUp',
    'ebitda',
    TRUE,
    'system'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    tooltip = EXCLUDED.tooltip,
    icon = EXCLUDED.icon,
    data_source_key = EXCLUDED.data_source_key,
    updated_at = CURRENT_TIMESTAMP;

-- Fields for ebitda_card
INSERT INTO config.component_fields (
    component_id, field_id, field_type, label, description, format_id,
    parent_field_id, is_visible, display_order, is_active, created_by
)
SELECT * FROM (VALUES
    ('ebitda_card', 'value', 'number', 'Значение', 'Основная величина EBITDA', 'currency_rub', NULL::VARCHAR, TRUE, 1, TRUE, 'system'),
    ('ebitda_card', 'change_pptd', 'number', 'Изм. к ПП', 'Изменение относительно предыдущего периода', 'percent', 'value', TRUE, 2, TRUE, 'system'),
    ('ebitda_card', 'change_ytd', 'number', 'Изм. YTD', 'Изменение относительно начала года', 'percent', 'value', TRUE, 3, TRUE, 'system')
) AS v(component_id, field_id, field_type, label, description, format_id, parent_field_id, is_visible, display_order, is_active, created_by)
WHERE NOT EXISTS (
    SELECT 1 FROM config.component_fields 
    WHERE component_fields.component_id = v.component_id 
      AND component_fields.field_id = v.field_id 
      AND component_fields.deleted_at IS NULL
);

UPDATE config.component_fields SET
    field_type = CASE field_id 
        WHEN 'value' THEN 'number'
        WHEN 'change_pptd' THEN 'number'
        WHEN 'change_ytd' THEN 'number'
    END,
    label = CASE field_id
        WHEN 'value' THEN 'Значение'
        WHEN 'change_pptd' THEN 'Изм. к ПП'
        WHEN 'change_ytd' THEN 'Изм. YTD'
    END,
    description = CASE field_id
        WHEN 'value' THEN 'Основная величина EBITDA'
        WHEN 'change_pptd' THEN 'Изменение относительно предыдущего периода'
        WHEN 'change_ytd' THEN 'Изменение относительно начала года'
    END,
    format_id = CASE field_id
        WHEN 'value' THEN 'currency_rub'
        WHEN 'change_pptd' THEN 'percent'
        WHEN 'change_ytd' THEN 'percent'
    END,
    parent_field_id = CASE field_id
        WHEN 'value' THEN NULL
        WHEN 'change_pptd' THEN 'value'
        WHEN 'change_ytd' THEN 'value'
    END,
    display_order = CASE field_id
        WHEN 'value' THEN 1
        WHEN 'change_pptd' THEN 2
        WHEN 'change_ytd' THEN 3
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'ebitda_card' 
  AND field_id IN ('value', 'change_pptd', 'change_ytd')
  AND deleted_at IS NULL;

-- Add roa_card (percentage card - only value, no changes)
INSERT INTO config.components (
    id, component_type, title, tooltip, icon, data_source_key, is_active, created_by
) VALUES (
    'roa_card',
    'card',
    'ROA',
    'Return on Assets - эффективность использования активов',
    'Activity',
    'roa',
    TRUE,
    'system'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    tooltip = EXCLUDED.tooltip,
    icon = EXCLUDED.icon,
    data_source_key = EXCLUDED.data_source_key,
    updated_at = CURRENT_TIMESTAMP;

-- Fields for roa_card
INSERT INTO config.component_fields (
    component_id, field_id, field_type, label, description, format_id,
    parent_field_id, is_visible, display_order, is_active, created_by
)
SELECT * FROM (VALUES
    ('roa_card', 'value', 'number', 'Значение', 'Основная величина ROA', 'percent', NULL::VARCHAR, TRUE, 1, TRUE, 'system'),
    ('roa_card', 'change_pptd', 'number', 'Изм. к ПП', 'Изменение относительно предыдущего периода', 'percent', 'value', TRUE, 2, TRUE, 'system'),
    ('roa_card', 'change_ytd', 'number', 'Изм. YTD', 'Изменение относительно начала года', 'percent', 'value', TRUE, 3, TRUE, 'system')
) AS v(component_id, field_id, field_type, label, description, format_id, parent_field_id, is_visible, display_order, is_active, created_by)
WHERE NOT EXISTS (
    SELECT 1 FROM config.component_fields 
    WHERE component_fields.component_id = v.component_id 
      AND component_fields.field_id = v.field_id 
      AND component_fields.deleted_at IS NULL
);

UPDATE config.component_fields SET
    field_type = CASE field_id 
        WHEN 'value' THEN 'number'
        WHEN 'change_pptd' THEN 'number'
        WHEN 'change_ytd' THEN 'number'
    END,
    label = CASE field_id
        WHEN 'value' THEN 'Значение'
        WHEN 'change_pptd' THEN 'Изм. к ПП'
        WHEN 'change_ytd' THEN 'Изм. YTD'
    END,
    description = CASE field_id
        WHEN 'value' THEN 'Основная величина ROA'
        WHEN 'change_pptd' THEN 'Изменение относительно предыдущего периода'
        WHEN 'change_ytd' THEN 'Изменение относительно начала года'
    END,
    format_id = CASE field_id
        WHEN 'value' THEN 'percent'
        WHEN 'change_pptd' THEN 'percent'
        WHEN 'change_ytd' THEN 'percent'
    END,
    parent_field_id = CASE field_id
        WHEN 'value' THEN NULL
        WHEN 'change_pptd' THEN 'value'
        WHEN 'change_ytd' THEN 'value'
    END,
    display_order = CASE field_id
        WHEN 'value' THEN 1
        WHEN 'change_pptd' THEN 2
        WHEN 'change_ytd' THEN 3
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'roa_card' 
  AND field_id IN ('value', 'change_pptd', 'change_ytd')
  AND deleted_at IS NULL;
