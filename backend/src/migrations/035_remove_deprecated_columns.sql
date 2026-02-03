-- 035_remove_deprecated_columns.sql
-- Удаление deprecated колонок из config.component_fields
-- Дата: 2026-02-03
-- Задача: FIELD_TYPE_REFACTOR этап 4 (Cleanup)
--
-- Удаляемые колонки:
-- - is_dimension: заменена на field_type = 'dimension'
-- - is_measure: заменена на field_type = 'measure'
-- - compact_display: не используется
-- - is_groupable: не используется в production коде

-- Сначала проверяем что колонки существуют и удаляем
DO $$
BEGIN
    -- Удаляем is_dimension если существует
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'config' 
               AND table_name = 'component_fields' 
               AND column_name = 'is_dimension') THEN
        ALTER TABLE config.component_fields DROP COLUMN is_dimension;
        RAISE NOTICE 'Dropped column is_dimension';
    END IF;
    
    -- Удаляем is_measure если существует
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'config' 
               AND table_name = 'component_fields' 
               AND column_name = 'is_measure') THEN
        ALTER TABLE config.component_fields DROP COLUMN is_measure;
        RAISE NOTICE 'Dropped column is_measure';
    END IF;
    
    -- Удаляем compact_display если существует
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'config' 
               AND table_name = 'component_fields' 
               AND column_name = 'compact_display') THEN
        ALTER TABLE config.component_fields DROP COLUMN compact_display;
        RAISE NOTICE 'Dropped column compact_display';
    END IF;
    
    -- Удаляем is_groupable если существует
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'config' 
               AND table_name = 'component_fields' 
               AND column_name = 'is_groupable') THEN
        ALTER TABLE config.component_fields DROP COLUMN is_groupable;
        RAISE NOTICE 'Dropped column is_groupable';
    END IF;
END $$;

-- Обновить комментарий к таблице
COMMENT ON TABLE config.component_fields IS 
  'Поля компонентов. field_type определяет тип: dimension, measure, calculated, attribute';
