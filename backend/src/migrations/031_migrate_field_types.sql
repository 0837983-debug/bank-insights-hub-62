-- Миграция 031: Заполнить field_type на основе существующих данных
-- Дата: 2026-02-03
-- Задача: FIELD_TYPE_REFACTOR этап 1.2

-- Заполнить field_type на основе существующих данных
UPDATE config.component_fields
SET field_type = CASE
  -- Если есть parent_field_id - это sub_column, значит calculated
  WHEN parent_field_id IS NOT NULL THEN 'calculated'
  -- Если is_dimension = true - это dimension
  WHEN is_dimension = true THEN 'dimension'
  -- Если is_measure = true - это measure
  WHEN is_measure = true THEN 'measure'
  -- Всё остальное - attribute
  ELSE 'attribute'
END
WHERE field_type IS NULL;

-- Добавить constraint после заполнения данных
ALTER TABLE config.component_fields
ADD CONSTRAINT chk_field_type CHECK (
  field_type IN ('dimension', 'measure', 'calculated', 'attribute')
);

-- Добавить aggregation для measure полей (по умолчанию sum)
UPDATE config.component_fields
SET aggregation = 'sum'
WHERE field_type = 'measure' AND aggregation IS NULL;

-- Добавить constraint для aggregation
ALTER TABLE config.component_fields
ADD CONSTRAINT chk_aggregation CHECK (
  aggregation IS NULL OR aggregation IN ('sum', 'avg', 'count', 'min', 'max')
);
