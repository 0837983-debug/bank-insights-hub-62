-- 071_add_table_balance_change_subcolumns.sql
-- Добавляет calculated sub_columns для table_balance под колонкой value:
-- percent: ppChange, ytdChange
-- absolute: ppChangeAbsolute, ytdChangeAbsolute

BEGIN;

-- Восстанавливаем/нормализуем существующие sub_columns (если были удалены soft-delete)
UPDATE config.component_fields
SET
  parent_field_id = 'value',
  field_type = 'calculated',
  data_type = 'numeric',
  is_visible = TRUE,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'table_balance'
  AND field_id IN ('ppChange', 'ytdChange', 'ppChangeAbsolute', 'ytdChangeAbsolute');

-- Добавляем отсутствующие sub_columns
INSERT INTO config.component_fields (
  component_id,
  field_id,
  parent_field_id,
  field_type,
  data_type,
  label,
  format_id,
  calculation_config,
  display_group,
  is_default,
  display_order,
  is_visible,
  is_active
)
SELECT * FROM (
  VALUES
    (
      'table_balance',
      'ppChange',
      'value',
      'calculated',
      'numeric',
      'P/P',
      'percent',
      '{"type":"percent_change","current":"value","base":"previousValue"}'::jsonb,
      'percent',
      TRUE,
      1,
      TRUE,
      TRUE
    ),
    (
      'table_balance',
      'ytdChange',
      'value',
      'calculated',
      'numeric',
      'YTD',
      'percent',
      '{"type":"percent_change","current":"value","base":"ytdValue"}'::jsonb,
      'percent',
      TRUE,
      2,
      TRUE,
      TRUE
    ),
    (
      'table_balance',
      'ppChangeAbsolute',
      'value',
      'calculated',
      'numeric',
      'P/P abs',
      'currency_rub',
      '{"type":"diff","minuend":"value","subtrahend":"previousValue"}'::jsonb,
      'absolute',
      FALSE,
      3,
      TRUE,
      TRUE
    ),
    (
      'table_balance',
      'ytdChangeAbsolute',
      'value',
      'calculated',
      'numeric',
      'YTD abs',
      'currency_rub',
      '{"type":"diff","minuend":"value","subtrahend":"ytdValue"}'::jsonb,
      'absolute',
      FALSE,
      4,
      TRUE,
      TRUE
    )
) AS v(
  component_id,
  field_id,
  parent_field_id,
  field_type,
  data_type,
  label,
  format_id,
  calculation_config,
  display_group,
  is_default,
  display_order,
  is_visible,
  is_active
)
WHERE NOT EXISTS (
  SELECT 1
  FROM config.component_fields cf
  WHERE cf.component_id = v.component_id
    AND cf.field_id = v.field_id
    AND cf.deleted_at IS NULL
);

-- Приводим целевые sub_columns к ожидаемой конфигурации
UPDATE config.component_fields
SET
  parent_field_id = 'value',
  field_type = 'calculated',
  data_type = 'numeric',
  label = CASE field_id
    WHEN 'ppChange' THEN 'P/P'
    WHEN 'ytdChange' THEN 'YTD'
    WHEN 'ppChangeAbsolute' THEN 'P/P abs'
    WHEN 'ytdChangeAbsolute' THEN 'YTD abs'
    ELSE label
  END,
  format_id = CASE
    WHEN field_id IN ('ppChange', 'ytdChange') THEN 'percent'
    WHEN field_id IN ('ppChangeAbsolute', 'ytdChangeAbsolute') THEN 'currency_rub'
    ELSE format_id
  END,
  calculation_config = CASE field_id
    WHEN 'ppChange' THEN '{"type":"percent_change","current":"value","base":"previousValue"}'::jsonb
    WHEN 'ytdChange' THEN '{"type":"percent_change","current":"value","base":"ytdValue"}'::jsonb
    WHEN 'ppChangeAbsolute' THEN '{"type":"diff","minuend":"value","subtrahend":"previousValue"}'::jsonb
    WHEN 'ytdChangeAbsolute' THEN '{"type":"diff","minuend":"value","subtrahend":"ytdValue"}'::jsonb
    ELSE calculation_config
  END,
  display_group = CASE
    WHEN field_id IN ('ppChange', 'ytdChange') THEN 'percent'
    WHEN field_id IN ('ppChangeAbsolute', 'ytdChangeAbsolute') THEN 'absolute'
    ELSE display_group
  END,
  is_default = CASE
    WHEN field_id IN ('ppChange', 'ytdChange') THEN TRUE
    WHEN field_id IN ('ppChangeAbsolute', 'ytdChangeAbsolute') THEN FALSE
    ELSE is_default
  END,
  display_order = CASE field_id
    WHEN 'ppChange' THEN 1
    WHEN 'ytdChange' THEN 2
    WHEN 'ppChangeAbsolute' THEN 3
    WHEN 'ytdChangeAbsolute' THEN 4
    ELSE display_order
  END,
  is_visible = TRUE,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE component_id = 'table_balance'
  AND field_id IN ('ppChange', 'ytdChange', 'ppChangeAbsolute', 'ytdChangeAbsolute');

COMMIT;
