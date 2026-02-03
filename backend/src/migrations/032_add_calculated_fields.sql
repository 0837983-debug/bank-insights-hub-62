-- Миграция 032: Добавить calculation_config для calculated полей
-- Дата: 2026-02-03
-- Задача: FIELD_TYPE_REFACTOR этап 1.3

-- ppChange: процентное изменение к предыдущему периоду
-- Формула: (value - ppValue) / ppValue * 100
UPDATE config.component_fields
SET calculation_config = '{"type": "percent_change", "current": "value", "base": "ppValue"}'::jsonb
WHERE field_id = 'ppChange' AND field_type = 'calculated' AND calculation_config IS NULL;

-- ytdChange: процентное изменение к прошлому году (YTD)
-- Формула: (value - pyValue) / pyValue * 100
UPDATE config.component_fields
SET calculation_config = '{"type": "percent_change", "current": "value", "base": "pyValue"}'::jsonb
WHERE field_id = 'ytdChange' AND field_type = 'calculated' AND calculation_config IS NULL;

-- ppChangeAbsolute: абсолютное изменение к предыдущему периоду
-- Формула: value - ppValue
UPDATE config.component_fields
SET calculation_config = '{"type": "diff", "minuend": "value", "subtrahend": "ppValue"}'::jsonb
WHERE field_id = 'ppChangeAbsolute' AND field_type = 'calculated' AND calculation_config IS NULL;

-- ytdChangeAbsolute: абсолютное изменение к прошлому году
-- Формула: value - pyValue
UPDATE config.component_fields
SET calculation_config = '{"type": "diff", "minuend": "value", "subtrahend": "pyValue"}'::jsonb
WHERE field_id = 'ytdChangeAbsolute' AND field_type = 'calculated' AND calculation_config IS NULL;

-- Обновить все calculated поля без calculation_config
-- Для sub_columns, которые ещё не настроены, установить percent_change как default
-- На основе родительского поля и типа sub_column
UPDATE config.component_fields cf
SET calculation_config = CASE
  -- Если field_id содержит 'Change' и НЕ 'Absolute' - это процентное изменение
  WHEN cf.field_id LIKE '%Change%' AND cf.field_id NOT LIKE '%Absolute%' THEN
    CASE
      -- К предыдущему периоду (pp)
      WHEN cf.field_id LIKE 'pp%' THEN '{"type": "percent_change", "current": "value", "base": "ppValue"}'::jsonb
      -- К прошлому году (ytd, py)
      WHEN cf.field_id LIKE 'ytd%' OR cf.field_id LIKE 'py%' THEN '{"type": "percent_change", "current": "value", "base": "pyValue"}'::jsonb
      ELSE NULL
    END
  -- Если field_id содержит 'Absolute' - это разница
  WHEN cf.field_id LIKE '%Absolute%' THEN
    CASE
      WHEN cf.field_id LIKE 'pp%' THEN '{"type": "diff", "minuend": "value", "subtrahend": "ppValue"}'::jsonb
      WHEN cf.field_id LIKE 'ytd%' OR cf.field_id LIKE 'py%' THEN '{"type": "diff", "minuend": "value", "subtrahend": "pyValue"}'::jsonb
      ELSE NULL
    END
  ELSE NULL
END
WHERE cf.field_type = 'calculated'
  AND cf.calculation_config IS NULL;

-- Проверка результатов (для логирования)
-- SELECT field_id, field_type, calculation_config 
-- FROM config.component_fields 
-- WHERE field_type = 'calculated';
