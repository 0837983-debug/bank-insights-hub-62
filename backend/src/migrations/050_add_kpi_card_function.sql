-- 050_add_kpi_card_function.sql
-- SQL функция для создания KPI карточек

CREATE OR REPLACE FUNCTION config.add_kpi_card(
  p_component_id VARCHAR,
  p_title VARCHAR,
  p_data_source_key VARCHAR,        -- kpi_name из v_kpi_all
  p_value_format VARCHAR DEFAULT 'currency_rub',
  p_layout_id VARCHAR DEFAULT 'main_dashboard',
  p_parent_component_id VARCHAR DEFAULT 'section_financial_results',
  p_icon VARCHAR DEFAULT NULL,
  p_tooltip VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- 1. Создать компонент
  INSERT INTO config.components (id, component_type, title, label, data_source_key, icon, tooltip, is_active)
  VALUES (p_component_id, 'card', p_title, p_title, p_data_source_key, p_icon, p_tooltip, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    label = EXCLUDED.label,
    data_source_key = EXCLUDED.data_source_key,
    icon = EXCLUDED.icon,
    tooltip = EXCLUDED.tooltip,
    updated_at = NOW();

  -- 2. Создать все поля одним запросом: value + 4 calculated sub_columns
  -- Используем DO NOTHING, так как старые карточки удаляются перед вызовом функции
  INSERT INTO config.component_fields
    (component_id, field_id, field_type, label, format_id, parent_field_id, display_order, is_visible, is_active, calculation_config, display_group, is_default)
  VALUES
    (p_component_id, 'value', 'measure', 'Значение', p_value_format, NULL, 0, TRUE, TRUE, NULL, NULL, NULL),
    (p_component_id, 'p2Change', 'calculated', 'Изм. к ПП', 'percent', 'value', 1, TRUE, TRUE, '{"type":"percent_change","current":"value","base":"p2Value"}'::jsonb, 'percent', TRUE),
    (p_component_id, 'p3Change', 'calculated', 'Изм. YTD', 'percent', 'value', 2, TRUE, TRUE, '{"type":"percent_change","current":"value","base":"p3Value"}'::jsonb, 'percent', TRUE),
    (p_component_id, 'p2ChangeAbsolute', 'calculated', 'Изм. к ПП (абс.)', p_value_format, 'value', 3, TRUE, TRUE, '{"type":"diff","minuend":"value","subtrahend":"p2Value"}'::jsonb, 'absolute', FALSE),
    (p_component_id, 'p3ChangeAbsolute', 'calculated', 'Изм. YTD (абс.)', p_value_format, 'value', 4, TRUE, TRUE, '{"type":"diff","minuend":"value","subtrahend":"p3Value"}'::jsonb, 'absolute', FALSE)
  ON CONFLICT DO NOTHING;

  -- 3. Layout mapping
  INSERT INTO config.layout_component_mapping (layout_id, component_id, parent_component_id, display_order, is_visible)
  VALUES (p_layout_id, p_component_id, p_parent_component_id,
    COALESCE((SELECT MAX(display_order) + 1 FROM config.layout_component_mapping WHERE layout_id = p_layout_id AND parent_component_id = p_parent_component_id), 1),
    TRUE)
  ON CONFLICT (layout_id, component_id) DO UPDATE SET
    parent_component_id = EXCLUDED.parent_component_id,
    is_visible = TRUE,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION config.add_kpi_card IS 'Создаёт KPI карточку: component + 5 fields (value + 4 calculated) + layout mapping';
