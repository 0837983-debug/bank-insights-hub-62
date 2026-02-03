-- Миграция 034: Исправить field_type для ppValue и pyValue
-- Дата: 2026-02-03
-- Проблема: ppValue и pyValue помечены как calculated, но они measure (значения из БД)

-- Правило для field_type:
-- 1. calculated = поля с calculation_config (вычисляются на фронте)
-- 2. measure = числовые значения из БД (включая ppValue, pyValue)
-- 3. dimension = поля группировки
-- 4. attribute = прочие поля

-- Исправляем ppValue и pyValue - это measure поля, не calculated
UPDATE config.component_fields
SET field_type = 'measure'
WHERE field_id IN ('ppValue', 'pyValue', 'prev_period', 'prev_year')
  AND field_type = 'calculated';

-- Убеждаемся что все поля с calculation_config помечены как calculated
UPDATE config.component_fields
SET field_type = 'calculated'
WHERE calculation_config IS NOT NULL
  AND field_type != 'calculated';

-- Убеждаемся что все measure поля (кроме calculated) имеют aggregation
UPDATE config.component_fields
SET aggregation = 'sum'
WHERE field_type = 'measure'
  AND aggregation IS NULL;
