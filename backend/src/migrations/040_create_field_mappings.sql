-- 040_create_field_mappings.sql
-- Универсальный справочник подмен значений полей для MART слоя
-- Позволяет переопределять raw_value → display_value для отображения

CREATE TABLE IF NOT EXISTS dict.field_mappings (
  id SERIAL PRIMARY KEY,
  source_table VARCHAR(100) NOT NULL,  -- 'fin_results', 'balance', ...
  field_name VARCHAR(100) NOT NULL,    -- 'class', 'category', 'section', ...
  raw_value VARCHAR(500) NOT NULL,     -- '1) ЧПД', 'Комиссии нетто', ...
  display_value VARCHAR(500) NOT NULL, -- 'ЧПД', 'ЧКД', ...
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_source ON dict.field_mappings(source_table);
CREATE INDEX IF NOT EXISTS idx_field_mappings_field ON dict.field_mappings(field_name);
CREATE INDEX IF NOT EXISTS idx_field_mappings_raw ON dict.field_mappings(raw_value);
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_mappings_unique 
  ON dict.field_mappings(source_table, field_name, raw_value) 
  WHERE is_active = TRUE AND deleted_at IS NULL;

COMMENT ON TABLE dict.field_mappings IS 'Справочник подмен: raw_value → display_value для MART слоя';

-- =============================================================================
-- Заполнение данных из ODS (уникальные значения первых 2 уровней иерархии)
-- raw_value = display_value по умолчанию, переопределяется через UPDATE ниже
-- =============================================================================

-- Финрез: class (первый уровень)
INSERT INTO dict.field_mappings (source_table, field_name, raw_value, display_value)
SELECT DISTINCT 'fin_results', 'class', class, class
FROM ods.fin_results
WHERE deleted_at IS NULL AND class IS NOT NULL
ON CONFLICT DO NOTHING;

-- Финрез: category (второй уровень)
INSERT INTO dict.field_mappings (source_table, field_name, raw_value, display_value)
SELECT DISTINCT 'fin_results', 'category', category, category
FROM ods.fin_results
WHERE deleted_at IS NULL AND category IS NOT NULL
ON CONFLICT DO NOTHING;

-- Баланс: class (первый уровень)
INSERT INTO dict.field_mappings (source_table, field_name, raw_value, display_value)
SELECT DISTINCT 'balance', 'class', class, class
FROM ods.balance
WHERE deleted_at IS NULL AND class IS NOT NULL
ON CONFLICT DO NOTHING;

-- Баланс: section (второй уровень)
INSERT INTO dict.field_mappings (source_table, field_name, raw_value, display_value)
SELECT DISTINCT 'balance', 'section', section, section
FROM ods.balance
WHERE deleted_at IS NULL AND section IS NOT NULL
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Переопределения display_value (при необходимости раскомментировать/добавить)
-- =============================================================================

-- Примеры переопределений для финреза:
-- UPDATE dict.field_mappings SET display_value = 'ЧПД' WHERE source_table = 'fin_results' AND field_name = 'class' AND raw_value = '1) ЧПД';
-- UPDATE dict.field_mappings SET display_value = 'ЧКД' WHERE source_table = 'fin_results' AND field_name = 'class' AND raw_value = '2) ЧКД';
-- UPDATE dict.field_mappings SET display_value = 'ЧОД' WHERE source_table = 'fin_results' AND field_name = 'class' AND raw_value = '3) ЧОД';

-- Переклассификация (если такой class существует):
-- UPDATE dict.field_mappings SET display_value = 'ЧКД' WHERE source_table = 'fin_results' AND field_name = 'class' AND raw_value = 'Комиссии нетто';
