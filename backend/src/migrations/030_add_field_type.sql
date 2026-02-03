-- Миграция 030: Добавить field_type для типизации полей (dimension/measure/calculated/attribute)
-- Дата: 2026-02-03
-- Задача: FIELD_TYPE_REFACTOR этап 1.1

-- ВАЖНО: Уже существует колонка field_type (тип данных: number, string, percent)
-- Переименовываем её в data_type, а field_type будем использовать для типа поля

-- 1. Переименовать существующую колонку field_type -> data_type
ALTER TABLE config.component_fields
RENAME COLUMN field_type TO data_type;

-- 2. Добавить новую колонку field_type для типа поля
ALTER TABLE config.component_fields
ADD COLUMN IF NOT EXISTS field_type VARCHAR(20);

-- 3. Добавить колонку calculation_config для calculated полей
ALTER TABLE config.component_fields
ADD COLUMN IF NOT EXISTS calculation_config JSONB;

-- 4. Добавить колонку aggregation для measure полей
ALTER TABLE config.component_fields
ADD COLUMN IF NOT EXISTS aggregation VARCHAR(10);

-- Обновить комментарии
COMMENT ON COLUMN config.component_fields.data_type IS 'Тип данных поля: "number", "percent", "string", "date", "boolean". Ранее называлась field_type.';
COMMENT ON COLUMN config.component_fields.field_type IS 'Тип поля: dimension (группировка), measure (числовое значение), calculated (вычисляемое), attribute (прочее).';
COMMENT ON COLUMN config.component_fields.calculation_config IS 'Конфигурация расчёта для calculated полей. JSON: {type, current, base} для percent_change, {type, minuend, subtrahend} для diff.';
COMMENT ON COLUMN config.component_fields.aggregation IS 'Тип агрегации для measure полей: sum, avg, count, min, max.';

-- Индекс для быстрого поиска по field_type
CREATE INDEX IF NOT EXISTS idx_cf_field_type ON config.component_fields USING btree (field_type);
