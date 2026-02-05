-- Миграция 038: Обновить layout view для display_group и is_default
-- Дата: 2026-02-04
-- Задача: DISPLAY_GROUPS_FOR_CALCULATED_FIELDS
-- 
-- Изменения:
-- 1. Добавить display_group и is_default в sub_columns_base
-- 2. Добавить displayGroup и isDefault в JSON для sub_columns

DROP VIEW IF EXISTS config.layout_sections_json_view CASCADE;

CREATE VIEW config.layout_sections_json_view AS
WITH sections_base AS (
  -- Базовые секции (контейнеры и header)
  SELECT DISTINCT
    lcm.layout_id,
    lcm.component_id AS section_id,
    c.title AS section_title,
    lcm.display_order AS section_display_order,
    c.component_type AS section_type
  FROM config.layout_component_mapping lcm
  INNER JOIN config.components c ON lcm.component_id = c.id
  WHERE lcm.parent_component_id IS NULL
    AND lcm.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND c.is_active = TRUE
    AND (c.component_type = 'container' OR c.component_type = 'header')
),
components_base AS (
  -- Компоненты внутри секций (card, table, chart)
  SELECT
    lcm.layout_id,
    section_lcm.component_id AS section_id,
    lcm.component_id,
    c.component_type,
    c.title AS component_title,
    c.label AS component_label,
    c.tooltip AS component_tooltip,
    c.icon AS component_icon,
    c.data_source_key AS component_data_source_key,
    lcm.display_order AS component_display_order,
    lcm.is_visible AS component_is_visible
  FROM config.layout_component_mapping lcm
  INNER JOIN config.components c ON lcm.component_id = c.id
  INNER JOIN config.layout_component_mapping section_lcm ON lcm.parent_component_id = section_lcm.component_id
    AND lcm.layout_id = section_lcm.layout_id
  WHERE lcm.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND c.is_active = TRUE
    AND section_lcm.deleted_at IS NULL
    AND c.component_type != 'button'
),
buttons_base AS (
  -- Кнопки внутри компонентов
  SELECT
    button_lcm.layout_id,
    section_lcm.component_id AS section_id,
    parent_lcm.component_id AS parent_component_id,
    button_lcm.component_id AS button_id,
    button_c.title AS button_title,
    button_c.label AS button_label,
    button_c.tooltip AS button_tooltip,
    button_c.icon AS button_icon,
    button_c.data_source_key AS button_data_source_key,
    button_c.settings AS button_settings,
    button_lcm.display_order AS button_display_order
  FROM config.layout_component_mapping button_lcm
  INNER JOIN config.components button_c ON button_lcm.component_id = button_c.id
  INNER JOIN config.layout_component_mapping parent_lcm ON button_lcm.parent_component_id = parent_lcm.component_id
    AND button_lcm.layout_id = parent_lcm.layout_id
  INNER JOIN config.layout_component_mapping section_lcm ON parent_lcm.parent_component_id = section_lcm.component_id
    AND parent_lcm.layout_id = section_lcm.layout_id
  WHERE button_lcm.deleted_at IS NULL
    AND button_c.deleted_at IS NULL
    AND button_c.is_active = TRUE
    AND button_c.component_type = 'button'
    AND parent_lcm.deleted_at IS NULL
    AND section_lcm.deleted_at IS NULL
),
columns_base AS (
  -- Колонки компонентов (основные поля без parent_field_id)
  SELECT
    cb.layout_id,
    cb.section_id,
    cb.component_id,
    cf.field_id AS column_id,
    cf.label AS column_label,
    cf.data_type AS column_type,
    cf.format_id AS column_format,
    cf.description AS column_description,
    cf.field_type AS column_field_type,
    cf.calculation_config AS column_calculation_config,
    cf.aggregation AS column_aggregation,
    cf.display_order AS column_display_order
  FROM components_base cb
  INNER JOIN config.component_fields cf ON cb.component_id = cf.component_id
  WHERE cf.deleted_at IS NULL
    AND cf.is_active = TRUE
    AND cf.is_visible != FALSE
    AND cf.parent_field_id IS NULL
),
sub_columns_base AS (
  -- Подколонки (дочерние поля с parent_field_id)
  -- ДОБАВЛЕНО: display_group и is_default для calculated полей
  SELECT
    cb.layout_id,
    cb.section_id,
    cb.component_id,
    parent_cf.field_id AS parent_column_id,
    cf.field_id AS sub_column_id,
    cf.label AS sub_column_label,
    cf.data_type AS sub_column_type,
    cf.format_id AS sub_column_format,
    cf.description AS sub_column_description,
    cf.field_type AS sub_column_field_type,
    cf.calculation_config AS sub_column_calculation_config,
    cf.aggregation AS sub_column_aggregation,
    cf.display_group AS sub_column_display_group,  -- НОВОЕ
    cf.is_default AS sub_column_is_default,        -- НОВОЕ
    cf.display_order AS sub_column_display_order
  FROM components_base cb
  INNER JOIN config.component_fields parent_cf ON cb.component_id = parent_cf.component_id
  INNER JOIN config.component_fields cf ON parent_cf.field_id = cf.parent_field_id
    AND cf.component_id = cb.component_id
  WHERE parent_cf.deleted_at IS NULL
    AND parent_cf.is_active = TRUE
    AND parent_cf.is_visible != FALSE
    AND parent_cf.parent_field_id IS NULL
    AND cf.deleted_at IS NULL
    AND cf.is_active = TRUE
    AND cf.is_visible != FALSE
),
base AS (
  SELECT
    layout_id,
    section_id,
    section_title,
    section_display_order,
    component_id,
    component_type,
    component_title,
    component_label,
    component_tooltip,
    component_icon,
    component_data_source_key,
    component_display_order,
    component_is_visible,
    button_id,
    button_title,
    button_label,
    button_tooltip,
    button_icon,
    button_data_source_key,
    button_settings,
    button_display_order,
    column_id,
    column_label,
    column_type,
    column_format,
    column_description,
    column_field_type,
    column_calculation_config,
    column_aggregation,
    column_display_order,
    sub_column_id,
    sub_column_label,
    sub_column_type,
    sub_column_format,
    sub_column_description,
    sub_column_field_type,
    sub_column_calculation_config,
    sub_column_aggregation,
    sub_column_display_group,
    sub_column_is_default,
    sub_column_display_order
  FROM (
    -- Компоненты с их данными (без кнопок и колонок)
    SELECT
      sb.layout_id,
      sb.section_id,
      sb.section_title,
      sb.section_display_order,
      cb.component_id,
      cb.component_type,
      cb.component_title,
      cb.component_label,
      cb.component_tooltip,
      cb.component_icon,
      cb.component_data_source_key,
      cb.component_display_order,
      cb.component_is_visible,
      NULL::VARCHAR(200) AS button_id,
      NULL::VARCHAR(200) AS button_title,
      NULL::VARCHAR(200) AS button_label,
      NULL::VARCHAR(500) AS button_tooltip,
      NULL::VARCHAR(200) AS button_icon,
      NULL::VARCHAR(200) AS button_data_source_key,
      NULL::JSONB AS button_settings,
      NULL::INTEGER AS button_display_order,
      NULL::VARCHAR(200) AS column_id,
      NULL::VARCHAR(200) AS column_label,
      NULL::VARCHAR(50) AS column_type,
      NULL::VARCHAR(100) AS column_format,
      NULL::TEXT AS column_description,
      NULL::VARCHAR(20) AS column_field_type,
      NULL::JSONB AS column_calculation_config,
      NULL::VARCHAR(10) AS column_aggregation,
      NULL::INTEGER AS column_display_order,
      NULL::VARCHAR(200) AS sub_column_id,
      NULL::VARCHAR(200) AS sub_column_label,
      NULL::VARCHAR(50) AS sub_column_type,
      NULL::VARCHAR(100) AS sub_column_format,
      NULL::TEXT AS sub_column_description,
      NULL::VARCHAR(20) AS sub_column_field_type,
      NULL::JSONB AS sub_column_calculation_config,
      NULL::VARCHAR(10) AS sub_column_aggregation,
      NULL::VARCHAR(20) AS sub_column_display_group,
      NULL::BOOLEAN AS sub_column_is_default,
      NULL::INTEGER AS sub_column_display_order
    FROM sections_base sb
    INNER JOIN components_base cb ON sb.layout_id = cb.layout_id AND sb.section_id = cb.section_id

    UNION ALL

    -- Кнопки
    SELECT
      bb.layout_id,
      bb.section_id,
      sb.section_title,
      sb.section_display_order,
      bb.parent_component_id AS component_id,
      NULL::VARCHAR(50) AS component_type,
      NULL::VARCHAR(200) AS component_title,
      NULL::VARCHAR(200) AS component_label,
      NULL::VARCHAR(500) AS component_tooltip,
      NULL::VARCHAR(200) AS component_icon,
      NULL::VARCHAR(200) AS component_data_source_key,
      NULL::INTEGER AS component_display_order,
      NULL::BOOLEAN AS component_is_visible,
      bb.button_id,
      bb.button_title,
      bb.button_label,
      bb.button_tooltip,
      bb.button_icon,
      bb.button_data_source_key,
      bb.button_settings,
      bb.button_display_order,
      NULL::VARCHAR(200) AS column_id,
      NULL::VARCHAR(200) AS column_label,
      NULL::VARCHAR(50) AS column_type,
      NULL::VARCHAR(100) AS column_format,
      NULL::TEXT AS column_description,
      NULL::VARCHAR(20) AS column_field_type,
      NULL::JSONB AS column_calculation_config,
      NULL::VARCHAR(10) AS column_aggregation,
      NULL::INTEGER AS column_display_order,
      NULL::VARCHAR(200) AS sub_column_id,
      NULL::VARCHAR(200) AS sub_column_label,
      NULL::VARCHAR(50) AS sub_column_type,
      NULL::VARCHAR(100) AS sub_column_format,
      NULL::TEXT AS sub_column_description,
      NULL::VARCHAR(20) AS sub_column_field_type,
      NULL::JSONB AS sub_column_calculation_config,
      NULL::VARCHAR(10) AS sub_column_aggregation,
      NULL::VARCHAR(20) AS sub_column_display_group,
      NULL::BOOLEAN AS sub_column_is_default,
      NULL::INTEGER AS sub_column_display_order
    FROM buttons_base bb
    INNER JOIN sections_base sb ON bb.layout_id = sb.layout_id AND bb.section_id = sb.section_id

    UNION ALL

    -- Колонки (основные поля)
    SELECT
      colb.layout_id,
      colb.section_id,
      sb.section_title,
      sb.section_display_order,
      colb.component_id,
      NULL::VARCHAR(50) AS component_type,
      NULL::VARCHAR(200) AS component_title,
      NULL::VARCHAR(200) AS component_label,
      NULL::VARCHAR(500) AS component_tooltip,
      NULL::VARCHAR(200) AS component_icon,
      NULL::VARCHAR(200) AS component_data_source_key,
      NULL::INTEGER AS component_display_order,
      NULL::BOOLEAN AS component_is_visible,
      NULL::VARCHAR(200) AS button_id,
      NULL::VARCHAR(200) AS button_title,
      NULL::VARCHAR(200) AS button_label,
      NULL::VARCHAR(500) AS button_tooltip,
      NULL::VARCHAR(200) AS button_icon,
      NULL::VARCHAR(200) AS button_data_source_key,
      NULL::JSONB AS button_settings,
      NULL::INTEGER AS button_display_order,
      colb.column_id,
      colb.column_label,
      colb.column_type,
      colb.column_format,
      colb.column_description,
      colb.column_field_type,
      colb.column_calculation_config,
      colb.column_aggregation,
      colb.column_display_order,
      NULL::VARCHAR(200) AS sub_column_id,
      NULL::VARCHAR(200) AS sub_column_label,
      NULL::VARCHAR(50) AS sub_column_type,
      NULL::VARCHAR(100) AS sub_column_format,
      NULL::TEXT AS sub_column_description,
      NULL::VARCHAR(20) AS sub_column_field_type,
      NULL::JSONB AS sub_column_calculation_config,
      NULL::VARCHAR(10) AS sub_column_aggregation,
      NULL::VARCHAR(20) AS sub_column_display_group,
      NULL::BOOLEAN AS sub_column_is_default,
      NULL::INTEGER AS sub_column_display_order
    FROM columns_base colb
    INNER JOIN sections_base sb ON colb.layout_id = sb.layout_id AND colb.section_id = sb.section_id

    UNION ALL

    -- Подколонки (дочерние поля)
    SELECT
      subcolb.layout_id,
      subcolb.section_id,
      sb.section_title,
      sb.section_display_order,
      subcolb.component_id,
      NULL::VARCHAR(50) AS component_type,
      NULL::VARCHAR(200) AS component_title,
      NULL::VARCHAR(200) AS component_label,
      NULL::VARCHAR(500) AS component_tooltip,
      NULL::VARCHAR(200) AS component_icon,
      NULL::VARCHAR(200) AS component_data_source_key,
      NULL::INTEGER AS component_display_order,
      NULL::BOOLEAN AS component_is_visible,
      NULL::VARCHAR(200) AS button_id,
      NULL::VARCHAR(200) AS button_title,
      NULL::VARCHAR(200) AS button_label,
      NULL::VARCHAR(500) AS button_tooltip,
      NULL::VARCHAR(200) AS button_icon,
      NULL::VARCHAR(200) AS button_data_source_key,
      NULL::JSONB AS button_settings,
      NULL::INTEGER AS button_display_order,
      subcolb.parent_column_id AS column_id,
      NULL::VARCHAR AS column_label,
      NULL::VARCHAR AS column_type,
      NULL::VARCHAR AS column_format,
      NULL::TEXT AS column_description,
      NULL::VARCHAR(20) AS column_field_type,
      NULL::JSONB AS column_calculation_config,
      NULL::VARCHAR(10) AS column_aggregation,
      NULL::INTEGER AS column_display_order,
      subcolb.sub_column_id,
      subcolb.sub_column_label,
      subcolb.sub_column_type,
      subcolb.sub_column_format,
      subcolb.sub_column_description,
      subcolb.sub_column_field_type,
      subcolb.sub_column_calculation_config,
      subcolb.sub_column_aggregation,
      subcolb.sub_column_display_group,
      subcolb.sub_column_is_default,
      subcolb.sub_column_display_order
    FROM sub_columns_base subcolb
    INNER JOIN sections_base sb ON subcolb.layout_id = sb.layout_id AND subcolb.section_id = sb.section_id

    ORDER BY 
      layout_id,
      section_display_order NULLS LAST,
      section_id,
      component_display_order NULLS LAST,
      button_display_order NULLS LAST,
      column_display_order NULLS LAST,
      sub_column_display_order NULLS LAST
  ) layout_sections_agg_data
),
components AS (
  SELECT DISTINCT ON (layout_id, section_id, component_id)
    layout_id,
    section_id,
    section_title,
    section_display_order,
    component_id,
    component_type,
    component_title,
    component_label,
    component_tooltip,
    component_icon,
    component_data_source_key,
    component_display_order,
    (
      SELECT jsonb_build_object(
        'id', layout_id || '::' || section_id || '::' || component_id,
        'componentId', component_id,
        'type', component_type,
        'title', component_title,
        'label', component_label,
        'tooltip', component_tooltip,
        'icon', component_icon,
        'dataSourceKey', component_data_source_key,
        'buttons', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', b.layout_id || '::' || b.section_id || '::' || b.component_id || '::' || b.button_id,
                'componentId', b.button_id,
                'type', 'button',
                'title', b.button_title,
                'label', b.button_label,
                'tooltip', b.button_tooltip,
                'icon', b.button_icon,
                'dataSourceKey', b.button_data_source_key,
                'settings', b.button_settings
              )
              ORDER BY b.button_display_order
            ) FILTER (WHERE b.button_id IS NOT NULL),
            '[]'::jsonb
          )
          FROM base b
          WHERE b.layout_id = base.layout_id
            AND b.section_id = base.section_id
            AND b.component_id = base.component_id
            AND b.button_id IS NOT NULL
        ),
        'columns', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', c.column_id,
                'label', c.column_label,
                'type', c.column_type,
                'format', NULLIF(c.column_format, NULL),
                'description', NULLIF(c.column_description, NULL),
                'fieldType', c.column_field_type,
                'calculationConfig', c.column_calculation_config,
                'aggregation', c.column_aggregation,
                'sub_columns', (
                  SELECT COALESCE(
                    jsonb_agg(
                      jsonb_build_object(
                        'id', sc.sub_column_id,
                        'label', sc.sub_column_label,
                        'type', sc.sub_column_type,
                        'format', NULLIF(sc.sub_column_format, NULL),
                        'description', NULLIF(sc.sub_column_description, NULL),
                        'fieldType', sc.sub_column_field_type,
                        'calculationConfig', sc.sub_column_calculation_config,
                        'aggregation', sc.sub_column_aggregation,
                        -- НОВОЕ: displayGroup и isDefault для calculated полей
                        'displayGroup', sc.sub_column_display_group,
                        'isDefault', sc.sub_column_is_default
                      )
                      ORDER BY sc.sub_column_display_order
                    ) FILTER (WHERE sc.sub_column_id IS NOT NULL),
                    '[]'::jsonb
                  )
                  FROM base sc
                  WHERE sc.layout_id = c.layout_id
                    AND sc.section_id = c.section_id
                    AND sc.component_id = c.component_id
                    AND sc.column_id = c.column_id
                    AND sc.sub_column_id IS NOT NULL
                )
              )
              ORDER BY c.column_display_order
            ) FILTER (WHERE c.column_id IS NOT NULL),
            '[]'::jsonb
          )
          FROM base c
          WHERE c.layout_id = base.layout_id
            AND c.section_id = base.section_id
            AND c.component_id = base.component_id
            AND c.column_id IS NOT NULL
            AND c.sub_column_id IS NULL
        )
      )
    ) AS component_json
  FROM base
  WHERE component_id IS NOT NULL
    AND button_id IS NULL
    AND column_id IS NULL
  ORDER BY layout_id, section_id, component_id, section_display_order, component_display_order
),
sections_with_components AS (
  SELECT
    layout_id,
    section_id,
    section_title,
    section_display_order,
    jsonb_agg(component_json ORDER BY component_display_order) AS components_json
  FROM components
  GROUP BY layout_id, section_id, section_title, section_display_order
),
header_sections AS (
  -- Header секции (без компонентов внутри, header сам является секцией)
  SELECT DISTINCT
    lcm.layout_id,
    lcm.component_id AS section_id,
    c.title AS section_title,
    lcm.display_order AS section_display_order,
    c.id AS header_component_id,
    c.title AS header_title,
    c.label AS header_label,
    c.tooltip AS header_tooltip,
    c.icon AS header_icon,
    c.data_source_key AS header_data_source_key
  FROM config.layout_component_mapping lcm
  INNER JOIN config.components c ON lcm.component_id = c.id
  WHERE lcm.layout_id IN (SELECT DISTINCT layout_id FROM sections_with_components)
    AND lcm.parent_component_id IS NULL
    AND lcm.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND c.is_active = TRUE
    AND c.component_type = 'header'
),
sections AS (
  -- Объединяем секции с компонентами и header секции
  SELECT
    layout_id,
    section_id,
    section_title,
    section_display_order,
    components_json
  FROM sections_with_components
  
  UNION ALL
  
  -- Header секции как секции с одним компонентом header
  SELECT
    layout_id,
    section_id,
    section_title,
    section_display_order,
    jsonb_build_array(
      jsonb_build_object(
        'id', layout_id || '::' || section_id || '::' || header_component_id,
        'componentId', header_component_id,
        'type', 'header',
        'title', header_title,
        'label', header_label,
        'tooltip', header_tooltip,
        'icon', header_icon,
        'dataSourceKey', header_data_source_key
      )
    ) AS components_json
  FROM header_sections
)
SELECT
  layout_id,
  section_id,
  section
FROM (
  SELECT
    layout_id,
    section_id,
    jsonb_build_object(
      'id', section_id,
      'title', section_title,
      'components', COALESCE(components_json, '[]'::jsonb)
    ) AS section,
    0 AS sort_order
  FROM sections

  UNION ALL

  -- Formats как отдельная "секция"
  SELECT
    lfv.layout_id,
    'formats'::VARCHAR(200) AS section_id,
    jsonb_build_object(
      'id', 'formats',
      'title', 'Formats',
      'formats', (
        SELECT jsonb_object_agg(
          f.id,
          jsonb_build_object(
            'kind', f.kind,
            'pattern', NULLIF(f.pattern, NULL),
            'prefixUnitSymbol', NULLIF(f.prefix_unit_symbol, NULL),
            'suffixUnitSymbol', NULLIF(f.suffix_unit_symbol, NULL),
            'minimumFractionDigits', f.minimum_fraction_digits,
            'maximumFractionDigits', f.maximum_fraction_digits,
            'thousandSeparator', f.thousand_separator,
            'multiplier', f.multiplier,
            'shorten', f.shorten
          )
        )
        FROM config.layout_component_mapping lcm
        INNER JOIN config.components c ON lcm.component_id = c.id
        INNER JOIN config.component_fields cf ON c.id = cf.component_id
        INNER JOIN config.formats f ON cf.format_id = f.id
        WHERE lcm.layout_id = lfv.layout_id
          AND lcm.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND c.is_active = TRUE
          AND cf.deleted_at IS NULL
          AND cf.is_active = TRUE
          AND cf.format_id IS NOT NULL
          AND f.deleted_at IS NULL
          AND f.is_active = TRUE
      )
    ) AS section,
    -99999 AS sort_order
  FROM (
    SELECT DISTINCT lcm.layout_id
    FROM config.layout_component_mapping lcm
    INNER JOIN config.components c ON lcm.component_id = c.id
    INNER JOIN config.component_fields cf ON c.id = cf.component_id
    INNER JOIN config.formats f ON cf.format_id = f.id
    WHERE lcm.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND c.is_active = TRUE
      AND cf.deleted_at IS NULL
      AND cf.is_active = TRUE
      AND cf.format_id IS NOT NULL
      AND f.deleted_at IS NULL
      AND f.is_active = TRUE
  ) lfv
) combined
ORDER BY layout_id, sort_order, section_id;

COMMENT ON VIEW config.layout_sections_json_view IS 'Агрегированный view с готовой структурой sections (jsonb). Включает fieldType, calculationConfig, aggregation, displayGroup, isDefault.';
