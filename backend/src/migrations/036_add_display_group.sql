-- Миграция 036: Добавление display_group и is_default для calculated полей
-- Дата: 2026-02-04
-- Задача: DISPLAY_GROUPS_FOR_CALCULATED_FIELDS
-- 
-- Назначение:
-- display_group - группирует calculated поля для переключения отображения (percent, absolute)
-- is_default - указывает группу по умолчанию для отображения

ALTER TABLE config.component_fields
ADD COLUMN IF NOT EXISTS display_group VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Комментарии для документации
COMMENT ON COLUMN config.component_fields.display_group IS 'Группа отображения для calculated полей: percent, absolute';
COMMENT ON COLUMN config.component_fields.is_default IS 'Группа по умолчанию для отображения (true только для одной группы на компонент)';
