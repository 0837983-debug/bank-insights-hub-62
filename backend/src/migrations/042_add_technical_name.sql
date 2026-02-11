-- 042_add_technical_name.sql
-- Добавление technical_name в dict.field_mappings
-- technical_name — стабильный технический идентификатор для фильтрации KPI

ALTER TABLE dict.field_mappings
ADD COLUMN IF NOT EXISTS technical_name VARCHAR(100);

-- =============================================================================
-- Финрез: class — специальные технические имена
-- =============================================================================
UPDATE dict.field_mappings SET technical_name = 'NII' WHERE source_table = 'fin_results' AND field_name = 'class' AND raw_value = '1) ЧПД';
UPDATE dict.field_mappings SET technical_name = 'NCI' WHERE source_table = 'fin_results' AND field_name = 'class' AND raw_value = '2) ЧКД';
UPDATE dict.field_mappings SET technical_name = 'NCI' WHERE source_table = 'fin_results' AND field_name = 'class' AND raw_value = 'Комиссии нетто';
UPDATE dict.field_mappings SET technical_name = 'NOI' WHERE source_table = 'fin_results' AND field_name = 'class' AND raw_value = '3) ЧОД';
UPDATE dict.field_mappings SET technical_name = 'INCOME_TAX' WHERE source_table = 'fin_results' AND field_name = 'class' AND raw_value = 'Налог на прибыль';

-- =============================================================================
-- Финрез: category — technical_name = UPPER(display_value) по умолчанию
-- =============================================================================
UPDATE dict.field_mappings SET technical_name = UPPER(REPLACE(REPLACE(display_value, ' ', '_'), '-', '_'))
WHERE source_table = 'fin_results' AND field_name = 'category' AND technical_name IS NULL;

-- =============================================================================
-- Баланс: class — специальные технические имена
-- =============================================================================
UPDATE dict.field_mappings SET technical_name = 'ASSETS' WHERE source_table = 'balance' AND field_name = 'class' AND raw_value = 'АКТИВЫ';
UPDATE dict.field_mappings SET technical_name = 'LIABILITIES' WHERE source_table = 'balance' AND field_name = 'class' AND raw_value = 'ПАССИВЫ';
UPDATE dict.field_mappings SET technical_name = 'CAPITAL' WHERE source_table = 'balance' AND field_name = 'class' AND raw_value = 'КАПИТАЛ';

-- =============================================================================
-- Баланс: section — technical_name = UPPER(display_value) по умолчанию
-- =============================================================================
UPDATE dict.field_mappings SET technical_name = UPPER(REPLACE(REPLACE(display_value, ' ', '_'), '-', '_'))
WHERE source_table = 'balance' AND field_name = 'section' AND technical_name IS NULL;

-- =============================================================================
-- Для оставшихся NULL — генерируем из raw_value
-- =============================================================================
UPDATE dict.field_mappings SET technical_name = UPPER(REPLACE(REPLACE(raw_value, ' ', '_'), '-', '_'))
WHERE technical_name IS NULL;

-- =============================================================================
-- Индекс для поиска по technical_name
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_field_mappings_tech_name ON dict.field_mappings(technical_name) WHERE is_active = TRUE;

COMMENT ON COLUMN dict.field_mappings.technical_name IS 'Стабильный технический идентификатор для фильтрации KPI';
