-- Миграция 037: Установка display_group для calculated полей
-- Дата: 2026-02-04
-- Задача: DISPLAY_GROUPS_FOR_CALCULATED_FIELDS
-- 
-- Группы:
-- - percent: процентные изменения (ppChange, ytdChange, p2Change, p3Change)
-- - absolute: абсолютные изменения (...Absolute)

-- 1. Установить display_group = 'percent' для процентных изменений (is_default = true)
UPDATE config.component_fields
SET display_group = 'percent', is_default = true
WHERE field_type = 'calculated' 
  AND field_id NOT LIKE '%Absolute'
  AND display_group IS NULL;

-- 2. Установить display_group = 'absolute' для абсолютных изменений (is_default = false)
UPDATE config.component_fields
SET display_group = 'absolute', is_default = false
WHERE field_type = 'calculated' 
  AND field_id LIKE '%Absolute'
  AND display_group IS NULL;

-- Проверка результатов
-- SELECT component_id, field_id, display_group, is_default
-- FROM config.component_fields
-- WHERE field_type = 'calculated'
-- ORDER BY component_id, display_group;
